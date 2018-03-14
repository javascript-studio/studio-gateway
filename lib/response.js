/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const { renderTemplate } = require('./templates');

const RESPONSE_HEADER_PREFIX = 'method.response.header.';

function respond(res, response_def, data) {
  const headers = { 'Content-Type': 'application/json' };
  const params = response_def.responseParameters;
  if (params) {
    Object.keys(params).forEach((key) => {
      if (key.indexOf(RESPONSE_HEADER_PREFIX) === 0) {
        const value = JSON.parse(params[key].replace(/\'/g, '"'));
        headers[key.substring(RESPONSE_HEADER_PREFIX.length)] = value;
      }
    });
  }
  res.writeHead(Number(response_def.statusCode), headers);
  res.end(data);
}

exports.respond = respond;

exports.responseProcessor = function (integration) {
  return (res, err, data) => {
    const responses = integration.responses;
    let response_def = responses.default;
    if (err) {
      const errorMessage = String(err);
      Object.keys(responses).some((re) => {
        if (new RegExp(re).test(errorMessage)) {
          response_def = responses[re];
          return true;
        }
        return false;
      });
      data = { errorMessage };
    }
    const response_templates = response_def.responseTemplates;
    if (response_templates) {
      const response_template = response_templates['application/json'];
      if (response_template) {
        const context = {};
        data = renderTemplate(response_template, context, {}, data,
          JSON.stringify(data));
      }
    } else {
      data = JSON.stringify(data);
    }
    respond(res, response_def, data);
  };
};
