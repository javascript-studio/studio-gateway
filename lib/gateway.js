/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const http = require('http');
const url = require('url');
const EventEmitter = require('events');
const { loadSwagger, inlineSwaggerRefs } = require('./swagger');
const { createRouter } = require('./router');
const { integrationProcessor } = require('./integration');
const { secutiryProcessor } = require('./security');

function fail(res, errorMessage) {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ errorMessage }));
}

function notFound(res) {
  res.writeHead(404, 'Not found');
  res.end();
}

exports.create = function (options = {}) {

  const swagger = inlineSwaggerRefs(loadSwagger({
    file: options.swagger_file,
    env: options.swagger_env
  }));
  const router = createRouter(swagger.paths);
  const emitter = new EventEmitter();

  const integrations = {};
  Object.keys(swagger.paths).forEach((name) => {
    integrations[name] = {};
    Object.keys(swagger.paths[name]).forEach((method) => {
      const config = swagger.paths[name][method];
      let fn;
      try {
        fn = integrationProcessor(emitter, config);
      } catch (e) {
        e.message = `[${method.toUpperCase()} ${name}] ${e.message}`;
        throw e;
      }
      if (config.security) {
        fn = secutiryProcessor(emitter, swagger, config.security, fn);
      }
      integrations[name][method] = fn;
    });
  });

  const server = http.createServer((req, res) => {
    const parsed_url = url.parse(req.url, true);
    router(parsed_url.pathname, (name, params) => {
      let raw_body = '';
      req.on('data', (chunk) => {
        raw_body += chunk;
      });
      req.on('end', () => {
        const methods = integrations[name];
        if (!methods) {
          notFound(res);
          return;
        }
        const integration = methods[req.method.toLowerCase()];
        if (!integration) {
          notFound(res);
          return;
        }
        const query = parsed_url.query;
        const headers = req.headers;
        try {
          integration(req, res, params, query, headers, raw_body);
        } catch (e) {
          console.error(`${req.method} ${parsed_url.pathname} ${e.stack}`);
          fail(res, e.message);
        }
      });
    });
  });

  emitter.on('lambda', (name, event, context, callback) => {
    server.emit('lambda', name, event, context, callback);
  });
  return server;
};
