/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const parseJSON = require('json-parse-better-errors');
const { renderTemplate } = require('./templates');
const { requestProcessor } = require('./integration-aws');
const log = require('./log');

const RESPONSE_HEADER_PREFIX = 'method.response.header.';
const RESPONSE_STAGE_VARIABLES = 'stageVariables.';

function mapResponseData(param, properties) {
  if (param.startsWith('\'')) {
    return param.substring(1, param.length - 1);
  }
  if (param.startsWith(RESPONSE_STAGE_VARIABLES)) {
    const key = param.substring(RESPONSE_STAGE_VARIABLES.length);
    return properties.stageVariables[key];
  }
  return JSON.parse(param);
}

function respond(req, res, response_def, data, properties) {
  const headers = { 'Content-Type': 'application/json' };
  const params = response_def.responseParameters;
  if (params) {
    Object.keys(params).forEach((key) => {
      if (key.indexOf(RESPONSE_HEADER_PREFIX) === 0) {
        const value = mapResponseData(params[key], properties);
        headers[key.substring(RESPONSE_HEADER_PREFIX.length)] = value;
      }
    });
  }
  res.writeHead(Number(response_def.statusCode), headers);
  res.end(data);
}

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
      event_json = parseJSON(event);
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
          const context = { stage };
          data = renderTemplate(response_template, context, {}, data,
            JSON.stringify(data), stageVariables);
        }
      } else {
        data = JSON.stringify(data);
      }
      respond(req, res, response_def, data, properties);
    });
  };
};
