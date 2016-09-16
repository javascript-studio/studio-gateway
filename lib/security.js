/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const { parseLambdaName } = require('./integration');

function reject(res, errorMessage) {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ errorMessage }));
}

exports.secutiryProcessor = function (emitter, swagger, security, delegate) {
  const security_key = Object.keys(security[0])[0];
  const security_def = swagger.securityDefinitions[security_key];
  if (!security_def) {
    throw new Error(`Unknown security definition "${security_key}"`);
  }
  if (security_def.type !== 'apiKey') {
    throw new Error(`${security_key} "type" must be "apiKey"`);
  }
  if (security_def.in !== 'header') {
    throw new Error(`${security_key} "in" must be "header"`);
  }
  const auth_type = security_def['x-amazon-apigateway-authtype'];
  if (auth_type !== 'custom') {
    throw new Error(`${security_key} "x-amazon-apigateway-authtype" `
      + 'must be "custom"');
  }
  const authorizer = security_def['x-amazon-apigateway-authorizer'];
  if (!authorizer) {
    throw new Error(`${security_key} missing x-amazon-apigateway-authorizer`);
  }
  if (authorizer.type !== 'token') {
    throw new Error(`${security_key} authorizer "type" must be "token"`);
  }
  const lambda_name = parseLambdaName(authorizer.authorizerUri);
  const re = new RegExp(authorizer.identityValidationExpression);
  return function (req, res, params, query, headers, raw_body) {
    const authorizationToken = headers[security_def.name.toLowerCase()];
    if (!authorizationToken || !re.test(authorizationToken)) {
      reject(res, 'Unauthorized');
      return;
    }
    emitter.emit('lambda', lambda_name, {
      authorizationToken
    }, {}, (err, policy) => {
      if (err) {
        reject(res, String(err));
      } else {
        delegate(req, res, params, query, headers, raw_body,
          policy.principalId);
      }
    });
  };
};
