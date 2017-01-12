/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const { renderTemplate } = require('./templates');
const { requestProcessor } = require('./request');

const RESPONSE_HEADER_PREFIX = 'method.response.header.';

function respond(req, res, response_def, data) {
  const headers = { 'Content-Type': 'application/json' };
  const params = response_def.responseParameters;
  if (params) {
    Object.keys(params).forEach((key) => {
      if (key.indexOf(RESPONSE_HEADER_PREFIX) === 0) {
        const value = JSON.parse(params[key].replace(/\'/g, '"'));
        headers[key.substring(RESPONSE_HEADER_PREFIX.length)] = value;
      }
    });
  }
  res.writeHead(Number(response_def.statusCode), headers);
  res.end(data);
}

function mockResponder(integration) {
  return (req, res) => {
    respond(req, res, integration.responses.default,
        integration.responseTemplate);
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
  const request_proc = requestProcessor(method, integration);
  return (req, res, params, query, headers, raw_body, principalId) => {
    let event;
    try {
      event = request_proc(params, query, headers, raw_body, principalId);
    } catch (e) {
      const errorMessage = 'Invalid request';
      console.info(` ⚠️   ${req.method} ${req.url} ${errorMessage}: ${e}`);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errorMessage }));
      return;
    }
    let event_json;
    try {
      event_json = JSON.parse(event);
    } catch (e) {
      console.info(
        ` 🚨  ${req.method} ${req.url} Failed to parse event '${event}': ${e}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errorMessage: 'Internal server error' }));
      return;
    }
    emitter.emit('lambda', lambda_name, event_json, {}, (err, data) => {
      const responses = integration.responses;
      let response_def = responses.default;
      if (err) {
        const errorMessage = String(err);
        Object.keys(responses).some((re) => {
          if (new RegExp(re).test(errorMessage)) {
            response_def = responses[re];
            return true;
          }
          return false;
        });
        data = { errorMessage };
      }
      const response_templates = response_def.responseTemplates;
      if (response_templates) {
        const response_template = response_templates['application/json'];
        if (response_template) {
          const context = {};
          data = renderTemplate(response_template, context, {}, data,
            JSON.stringify(data));
        }
      } else {
        data = JSON.stringify(data);
      }
      respond(req, res, response_def, data);
    });
  };
};