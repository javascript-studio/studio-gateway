'use strict';

const RESPONSE_HEADER_PREFIX = 'method.response.header.';
const RESPONSE_STAGE_VARIABLES = 'stageVariables.';

function mapResponseData(param, properties) {
  if (param.startsWith("'")) {
    return param.substring(1, param.length - 1);
  }
  if (param.startsWith(RESPONSE_STAGE_VARIABLES)) {
    const key = param.substring(RESPONSE_STAGE_VARIABLES.length);
    return properties.stageVariables[key];
  }
  return JSON.parse(param);
}

function respond(req, res, response_def, data, properties) {
  const headers = { 'Content-Type': 'application/json' };
  const params = response_def.responseParameters;
  if (params) {
    Object.keys(params).forEach((key) => {
      if (key.indexOf(RESPONSE_HEADER_PREFIX) === 0) {
        const value = mapResponseData(params[key], properties);
        headers[key.substring(RESPONSE_HEADER_PREFIX.length)] = value;
      }
    });
  }
  res.writeHead(Number(response_def.statusCode), headers);
  res.end(data);
}

exports.respond = respond;
