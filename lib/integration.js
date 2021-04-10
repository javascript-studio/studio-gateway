/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const { INVALID } = require('@studio/fail');
const { requestProcessor, responseProcessor } = require('./integration-aws');
const { respond } = require('./integration-responder');
const log = require('./log');

function mockResponder(integration, properties) {
  return (req, res) => {
    respond(req, res, integration.responses.default,
      integration.responseTemplate, properties);
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

exports.integrationProcessor = function (emitter, method, stage,
    stageVariables) {
  const integration = method['x-amazon-apigateway-integration'];
  const properties = { stageVariables };
  if (integration.type === 'mock') {
    return mockResponder(integration, properties);
  }
  const lambda_name = exports.parseLambdaName(integration.uri);
  const requestProc = requestProcessor(method, integration, stage,
    stageVariables);
  const responseProc = responseProcessor(integration, stage, properties);
  return (req, res, params, query, headers, raw_body, policy) => {
    let authorizer = null;
    if (policy) {
      authorizer = { principalId: policy.principalId };
      if (policy.context) {
        /*
         * “Notice that you cannot set a JSON object or array as a valid value
         * of any key in the context map.”
         *
         * From: https://docs.aws.amazon.com/apigateway/latest/developerguide/
         *   api-gateway-lambda-authorizer-output.html
         */
        Object.keys(policy.context).forEach((key) => {
          authorizer[key] = String(policy.context[key]);
        });
      }
    }
    let event;
    try {
      event = requestProc(params, query, headers, raw_body, authorizer);
    } catch (e) {
      if (e.code === INVALID) {
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
      const errorMessage = 'Internal server error';
      log.error(errorMessage, {
        method: req.method,
        url: req.url,
        headers
      }, e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errorMessage }));
      return;
    }
    emitter.emit('lambda', lambda_name, event, {}, (err, data) => {
      responseProc(req, res, err, data);
    });
  };
};
