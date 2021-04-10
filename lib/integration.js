/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const { INVALID } = require('@studio/fail');
const { requestProcessor, responseProcessor } = require('./integration-aws');
const { parseLambdaName } = require('./parse-lambda-name');
const { respond } = require('./integration-responder');
const log = require('./log');

function mockResponder(integration, properties) {
  return (req, res) => {
    respond(req, res, integration.responses.default,
      integration.responseTemplate, properties);
  };
}

exports.integrationProcessor = function (emitter, method, stage,
    stageVariables) {
  const integration = method['x-amazon-apigateway-integration'];
  const properties = { stageVariables };
  if (integration.type === 'mock') {
    return mockResponder(integration, properties);
  }
  const lambda_name = parseLambdaName(integration.uri);
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
