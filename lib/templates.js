/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 *
 * http://docs.aws.amazon.com/apigateway/latest/developerguide/
 *   api-gateway-mapping-template-reference.html
 */
'use strict';

const { parse, Compile } = require('velocityjs');
const jsonpath = require('jsonpath');
const escape = require('js-string-escape');
const parseJSON = require('json-parse-better-errors');
const log = require('./log');

class Input {
  constructor(request, payload, body) {
    this._request = request;
    this._payload = payload;
    this.body = body;
  }

  params(name) {
    if (name) {
      return (
        this._request.params[name] ||
        this._request.query[name] ||
        this._request.headers[name]
      );
    }
    return {
      path: this._request.params,
      querystring: this._request.query,
      headers: this._request.headers
    };
  }

  json(path) {
    return JSON.stringify(jsonpath.query(this._payload, path)[0]);
  }

  path(path) {
    return jsonpath.query(this._payload, path)[0];
  }
}

const util = {
  escapeJavaScript(str) {
    return escape(str);
  },

  parseJson(str) {
    return parseJSON(str);
  },

  urlEncode(str) {
    return encodeURI(str);
  },

  urlDecode(str) {
    return decodeURI(str);
  },

  base64Encode(str) {
    return Buffer.from(String(str), 'binary').toString('base64');
  },

  base64Decode(str) {
    return Buffer.from(String(str), 'base64').toString('binary');
  }
};

const templates = {};

function getTemplate(template) {
  let c = templates[template];
  if (!c) {
    try {
      c = new Compile(parse(template), { escape: false });
    } catch (e) {
      log.error('Velocity template failure', { template }, e);
      throw e;
    }
    templates[template] = c;
  }
  return c;
}

exports.renderTemplate = function (
  template,
  context,
  request,
  payload,
  body,
  stageVariables
) {
  const input = new Input(request, payload, body);
  return getTemplate(template).render(
    {
      context,
      input,
      util,
      stageVariables
    },
    null,
    true
  );
};
