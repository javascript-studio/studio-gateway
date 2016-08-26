/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const fs = require('fs');
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const templates = require('./templates');

const RESPONSE_HEADER_PREFIX = 'method.response.header.';

function notFound(res) {
  res.writeHead(404, 'Not found');
  res.end();
}

function respond(req, res, response_def, data) {
  const headers = {
    'Content-Type': 'application/json'
  };
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

function fail(res, errorMessage) {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ errorMessage }));
}

function setParam(object, param, value, name) {
  if (param.type === 'string') {
    object[name || param.name] = value;
  } else if (param.type === 'number') {
    object[name || param.name] = Number(value);
  } else {
    throw new Error(`Unknown parameter.type "${param.type}"`);
  }
}

exports.create = function (options = {}) {

  const swagger_file = options.swagger_file || 'swagger.json';
  // eslint-disable-next-line no-sync
  const swagger = JSON.parse(fs.readFileSync(swagger_file, 'utf8'));

  const server = http.createServer((req, res) => {
    const u = url.parse(req.url, true);
    const spec = swagger.paths[u.pathname];
    if (!spec) {
      notFound(res);
      return;
    }
    const method = spec[req.method.toLowerCase()];
    if (!method) {
      notFound(res);
      return;
    }
    const integration = method['x-amazon-apigateway-integration'];
    if (!integration) {
      notFound(res);
      return;
    }
    if (integration.type === 'mock') {
      respond(req, res, integration.responses.default,
        integration.responseTemplate);
      return;
    }
    const lambdaName = integration.uri.replace(/__[A-Z_]+__/g, '')
      .replace(/^\/|:current\/invocations$/g, '');
    let raw_body = '';
    req.on('data', (chunk) => {
      raw_body += chunk;
    });
    req.on('end', () => {
      const id = `${req.method} ${u.pathname}`;
      const body = req.headers.accept === 'application/json'
        ? (raw_body ? JSON.parse(raw_body) : {})
        : querystring.parse(raw_body);
      const params = {};
      const headers = {};
      const query = {}; // TODO
      const payload = {};
      if (method.parameters) {
        try {
          method.parameters.forEach((param) => {
            if (param.in === 'header') {
              setParam(headers, param, req.headers[param.name.toLowerCase()]);
            } else if (param.in === 'query') {
              setParam(query, param, u.query[param.name]);
            } else if (param.in === 'body') {
              const schema = param.schema;
              if (!schema) {
                throw new Error('Missing schema in body parameter for '
                  + `${req.method} ${u.pathname}`);
              }
              const props = schema.properties;
              if (props) {
                Object.keys(props).forEach((key) => {
                  setParam(payload, props[key], body[key], key);
                });
              }
            } else {
              throw new Error(`Unknown parameter.in "${param.in}" for ${id}`);
            }
          });
        } catch (e) {
          fail(res, e.message);
          return;
        }
      }

      const request_templates = integration.requestTemplates;
      if (!request_templates) {
        fail(res, `Missing "requestTemplates" for ${id}`);
        return;
      }
      const request_template = request_templates['application/json'];
      if (!request_templates) {
        fail(res, `Missing "application/json" in requestTemplates for ${id}`);
        return;
      }
      const context = {};
      const request = { params, headers, query };
      let event;
      try {
        event = templates.render(request_template, context, request,
          payload, raw_body);
      } catch (e) {
        fail(res, `Error in request template for ${id}: ${e}`);
        return;
      }

      server.emit('lambda', lambdaName, JSON.parse(event), {}, (err, data) => {
        const responses = integration.responses;
        let response_def = responses.default;
        if (err) {
          data = err;
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
        respond(req, res, response_def, data);
      });
    });
  });

  return server;
};
