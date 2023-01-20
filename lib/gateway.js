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
const { upperCaseHeaders } = require('./upper-case-headers');
const log = require('./log');

function fail(res, errorMessage) {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ errorMessage }));
}

function notFound(req, res) {
  log.terminate('Not found', {
    method: req.method,
    url: req.url
  });
  res.writeHead(404, 'Not found');
  res.end();
}

exports.create = function (options = {}) {

  const swagger = inlineSwaggerRefs(loadSwagger({
    file: options.swagger_file,
    env: options.swagger_env
  }));
  const router = createRouter(swagger.paths, swagger.basePath || '/');
  const emitter = new EventEmitter();

  const secutiry_cache = {};
  const integrations = {};
  Object.keys(swagger.paths).forEach((name) => {
    integrations[name] = {};
    Object.keys(swagger.paths[name]).forEach((method) => {
      const config = swagger.paths[name][method];
      let fn;
      try {
        fn = integrationProcessor(emitter, config,
          options.stage || 'local',
          options.stageVariables || {});
      } catch (e) {
        e.message = `[${method.toUpperCase()} ${name}] ${e.message}`;
        throw e;
      }
      if (config.security && config.security.length) {
        fn = secutiryProcessor(emitter, swagger, config.security,
          secutiry_cache, fn);
      }
      integrations[name][method] = fn;
    });
  });

  const server = http.createServer((req, res) => {
    // eslint-disable-next-line node/no-deprecated-api
    const parsed_url = url.parse(req.url, true);
    router(parsed_url.pathname, (name, params) => {
      let raw_body = '';
      req.on('data', (chunk) => {
        raw_body += chunk;
      });
      req.on('end', () => {
        const methods = integrations[name];
        if (!methods) {
          notFound(req, res);
          return;
        }
        let integration = methods[req.method.toLowerCase()];
        if (!integration) {
          integration = methods['x-amazon-apigateway-any-method'];
          if (!integration) {
            notFound(req, res);
            return;
          }
        }
        const headers = upperCaseHeaders(req.headers);
        try {
          integration(req, res, params, parsed_url, headers, raw_body);
        } catch (e) {
          log.error({
            method: req.method,
            url: req.url,
            headers
          }, e);
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
