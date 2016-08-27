/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const fs = require('fs');
const http = require('http');
const url = require('url');
const EventEmitter = require('events');
const { createRouter } = require('./router');
const { integrationProcessor } = require('./integration');

function fail(res, errorMessage) {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ errorMessage }));
}

function notFound(res) {
  res.writeHead(404, 'Not found');
  res.end();
}

exports.create = function (options = {}) {

  const swagger_file = options.swagger_file || 'swagger.json';
  // eslint-disable-next-line no-sync
  const swagger = JSON.parse(fs.readFileSync(swagger_file, 'utf8'));

  const emitter = new EventEmitter();
  const router = createRouter(swagger.paths);

  const integrations = {};
  Object.keys(swagger.paths).forEach((name) => {
    integrations[name] = {};
    Object.keys(swagger.paths[name]).forEach((method) => {
      try {
        integrations[name][method]
          = integrationProcessor(emitter, swagger.paths[name][method]);
      } catch (e) {
        e.message = `[${method.toUpperCase()} ${name}] ${e.message}`;
        throw e;
      }
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
