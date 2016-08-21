'use strict';

const fs = require('fs');
const http = require('http');
const url = require('url');
const querystring = require('querystring');

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
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (req.headers.accept === 'application/json') {
        body = body ? JSON.parse(body) : {};
      } else {
        body = querystring.parse(body);
      }
      const event = {};
      if (method.parameters) {
        method.parameters.forEach((param) => {
          let value = null;
          if (param.in === 'header') {
            value = req.headers[param.name.toLowerCase()];
          } else if (param.in === 'query') {
            value = u.query[param.name];
          } else if (param.in === 'body') {
            const schema = param.schema;
            if (!schema) {
              fail(res, 'Missing schema in body parameter');
              return;
            }
            const props = schema.properties;
            if (props) {
              Object.keys(props).forEach((key) => {
                event[key] = body[key];
              });
            }
            return;
          } else {
            fail(res, `Unknown parameter.in "${param.in}"`);
            return;
          }
          if (param.type === 'string') {
            event[param.name] = value;
          } else if (param.type === 'number') {
            event[param.name] = Number(value);
          } else {
            fail(res, `Unknown parameter.type "${param.type}"`);
            return;
          }
        });
      }

      if (res.statusCode === 500) {
        return;
      }

      server.emit('lambda', lambdaName, event, (err, data) => {
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
