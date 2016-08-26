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

class Input {

  constructor(context, request, payload, body) {
    this.context = context;
    this._request = request;
    this._payload = payload;
    this.body = body;
  }

  params(name) {
    if (name) {
      return this._request.params[name]
        || this._request.query[name]
        || this._request.headers[name];
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
    return jsonpath.query(this._payload, path);
  }

}

const util = {
  escapeJavaScript(str) {
    return escape(str);
  },

  parseJson(str) {
    return JSON.parse(str);
  },

  urlEncode(str) {
    return encodeURI(str);
  },

  urlDecode(str) {
    return decodeURI(str);
  },

  base64Encode(str) {
    return new Buffer(String(str), 'binary').toString('base64');
  },

  base64Decode(str) {
    return new Buffer(String(str), 'base64').toString('binary');
  }
};

const templates = {};

exports.render = function (template, context, request, payload, body) {
  let c = templates[template];
  if (!c) {
    try {
      c = new Compile(parse(template), { escape: false });
    } catch (e) {
      console.error(`Velocity template failure in "${template}"`, e);
      throw e;
    }
    templates[template] = c;
  }
  return c.render({
    input: new Input(context, request, payload, body),
    util
  }, null, true);
};
