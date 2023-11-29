/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const { INVALID } = require('@studio/fail');
const integration_aws = require('./integration-aws');
const integration_proxy = require('./integration-proxy');
const { parseLambdaName } = require('./parse-lambda-name');
const { respond } = require('./integration-responder');
const log = require('./log');

function mockResponder(integration, properties) {
  return (req, res) => {
    respond(req, res, integration.responses.default,
      integration.responseTemplate, properties);
  };
}

const integration_types = {
  aws: integration_aws,
  aws_proxy: integration_proxy
};

exports.integrationProcessor = function (emitter, resource, method, stage,
    stageVariables) {
  const integration = method['x-amazon-apigateway-integration'];
  const properties = { stageVariables };
  if (integration.type === 'mock') {
    return mockResponder(integration, properties);
  }
  if (integration.httpMethod !== 'POST') {
    throw new Error(`Unexpected lambda integration httpMethod "${
      integration.httpMethod}". Only POST is supported.`);
  }
  const lambda_name = parseLambdaName(integration.uri);
  const integration_impl = integration_types[integration.type];
  if (!integration_impl) {
    throw new Error(`Invalid integration type "${integration.type}"`);
  }
  const { requestProcessor, responseProcessor } = integration_impl;
  const requestProc = requestProcessor(resource, method, integration, stage,
    stageVariables);
  const responseProc = responseProcessor(integration, stage, properties);
  return (req, res, params, parsed_url, headers, raw_body, policy) => {
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
      event = requestProc(req, params, parsed_url, headers, raw_body, authorizer);
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
    const options = {};
    if (event.requestContext) {
      options.requestId = event.requestContext.requestId;
    }
    emitter.emit('lambda', lambda_name, event, options, (err, data) => {
      responseProc(req, res, err, data);
    });
  };
};
