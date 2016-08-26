/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const fs = require('fs');
const http = require('http');
const url = require('url');
const { createRouter } = require('./router');
const { integration } = require('./aws');

exports.create = function (options = {}) {

  const swagger_file = options.swagger_file || 'swagger.json';
  // eslint-disable-next-line no-sync
  const swagger = JSON.parse(fs.readFileSync(swagger_file, 'utf8'));

  const router = createRouter(swagger.paths);
  const server = http.createServer((req, res) => {
    const parsed_url = url.parse(req.url, true);
    router(parsed_url.pathname, (name, path_params) => {
      let raw_body = '';
      req.on('data', (chunk) => {
        raw_body += chunk;
      });
      req.on('end', () => {
        const spec = swagger.paths[name];
        integration(server, req, res, spec, parsed_url, path_params, raw_body);
      });
    });
  });

  return server;
};
