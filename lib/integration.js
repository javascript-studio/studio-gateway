/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const { requestProcessor } = require('./request');
const { responseProcessor, respond } = require('./response');
const log = require('./log');

function mockResponder(integration) {
  return (req, res) => {
    respond(res, integration.responses.default, integration.responseTemplate);
  };
}

const GROUP_REGION = '([a-z0-9\\-]+)';
const GROUP_VERSION = '(\\d{4}-\\d{2}-\\d{2})';
const GROUP_ARN = '(\\d+)';
const GROUP_PREFIX = '([^_]+)';
const GROUP_LAMBDA_NAME = '([^\\:/]+)';
const API_GATEWAY_URI = `arn:aws:apigateway:${GROUP_REGION}:lambda:path/`
  + `${GROUP_VERSION}`;
const LAMBDA_URI = `arn:aws:lambda:${GROUP_REGION}:${GROUP_ARN}:function:`
  + `${GROUP_PREFIX}_${GROUP_LAMBDA_NAME}`;
const LAMBDA_URI_RE = new RegExp(`^${API_GATEWAY_URI}/functions/${LAMBDA_URI}`);

exports.parseLambdaName = function (uri) {
  const match = uri.match(LAMBDA_URI_RE);
  if (match) {
    return match[6];
  }
  throw new Error(`Unexpected integration format "${uri}"`);
};

exports.integrationProcessor = function (emitter, method) {
  const integration = method['x-amazon-apigateway-integration'];
  if (integration.type === 'mock') {
    return mockResponder(integration);
  }
  const lambda_name = exports.parseLambdaName(integration.uri);
  const requestProc = requestProcessor(method, integration);
  const responseProc = responseProcessor(integration);
  return (req, res, params, query, headers, raw_body, principalId) => {
    let event;
    try {
      event = requestProc(params, query, headers, raw_body, principalId);
    } catch (e) {
      const errorMessage = 'Invalid request';
      log.warn(errorMessage, {
        method: req.method,
        url: req.url,
        headers
      }, e);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errorMessage }));
      return;
    }
    let event_json;
    try {
      event_json = JSON.parse(event);
    } catch (e) {
      log.error('Failed to parse event', {
        event,
        method: req.method,
        url: req.url,
        headers
      }, String(e));
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errorMessage: 'Internal server error' }));
      return;
    }
    emitter.emit('lambda', lambda_name, event_json, {}, (err, data) => {
      responseProc(res, err, data);
    });
  };
};
