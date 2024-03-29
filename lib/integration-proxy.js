/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const log = require('./log');

function makeMultiValue(properties) {
  const result = {};
  for (const key of Object.keys(properties)) {
    result[key] = [properties[key]];
  }
  return result;
}

function now() {
  return new Date()
    .toISOString()
    .split('T')[1]
    .replace(/[Z.\-:]/g, '');
}

exports.requestProcessor = function (
  resource,
  method,
  integration,
  stage,
  stageVariables
) {
  let request_id = 0;
  return (req, params, parsed_url, headers, raw_body, authorizer) => {
    const event = {
      resource,
      path: parsed_url.pathname,
      httpMethod: req.method,
      headers,
      multiValueHeaders: makeMultiValue(headers),
      stageVariables,
      requestContext: {
        authorizer,
        accountId: process.env.STUDIO_AWS_ACCOUNT || '000000000000',
        resourceId: null,
        stage,
        requestId: `${now()}_${parsed_url.pathname}_${++request_id}`,
        identity: {},
        resourcePath: null,
        httpMethod: req.method,
        apiId: null
      },
      body: raw_body,
      isBase64Encoded: false
    };
    event.pathParameters = Object.keys(params).length ? params : null;
    if (Object.keys(parsed_url.query).length) {
      event.queryStringParameters = parsed_url.query;
      event.multiValueQueryStringParameters = makeMultiValue(parsed_url.query);
    } else {
      event.queryStringParameters = null;
    }
    log.receive({ method: req.method, url: req.url });
    return event;
  };
};

exports.responseProcessor = function () {
  return (req, res, err, response) => {
    if (err) {
      res.writeHead(500);
      res.end(err.message);
      return;
    }
    if (
      !response ||
      typeof response.statusCode !== 'number' ||
      typeof response.body !== 'string'
    ) {
      res.writeHead(502);
      res.end('Bad Gateway');
      return;
    }
    res.writeHead(response.statusCode, response.headers);
    if (response.isBase64Encoded) {
      res.end(Buffer.from(response.body, 'base64'));
    } else {
      res.end(response.body);
    }
  };
};
