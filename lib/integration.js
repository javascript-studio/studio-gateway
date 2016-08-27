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
        headers[key.substring(RESPONSE_HEADER_PREFIX.length)]
          = value.replace('__ORIGIN__', req.headers.origin);
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

exports.integrationProcessor = function (emitter, method) {
  const integration = method['x-amazon-apigateway-integration'];
  if (integration.type === 'mock') {
    return mockResponder(integration);
  }
  const lambda_name = integration.uri.replace(/__[A-Z_]+__/g, '')
    .replace(/^\/|:current\/invocations$/g, '');
  const request_proc = requestProcessor(method, integration);
  return (req, res, params, query, headers, raw_body) => {
    const event = request_proc(params, query, headers, raw_body);
    emitter.emit('lambda', lambda_name, JSON.parse(event), {}, (err, data) => {
      const responses = integration.responses;
      let response_def = responses.default;
      if (err) {
        data = `{"errorMessage":${err}}`;
        Object.keys(responses).some((re) => {
          if (new RegExp(re).test(data)) {
            response_def = responses[re];
            return true;
          }
          return false;
        });
      } else {
        data = JSON.stringify(data);
      }
      const response_templates = response_def.responseTemplates;
      if (response_templates) {
        const response_template = response_templates['application/json'];
        if (response_template) {
          const context = {};
          data = renderTemplate(response_template, context, {},
            JSON.parse(data), data);
        }
      }
      respond(req, res, response_def, data);
    });
  };
};
