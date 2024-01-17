/*
 * Copyright (c) Maximilian Antoni <max@javascript.studio>
 */
'use strict';

const { parseLambdaName } = require('./parse-lambda-name');

function reject(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message }));
}

exports.secutiryProcessor = function (
  emitter,
  swagger,
  security,
  cache,
  delegate
) {
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
    throw new Error(
      `${security_key} "x-amazon-apigateway-authtype" must be "custom"`
    );
  }
  const authorizer = security_def['x-amazon-apigateway-authorizer'];
  if (!authorizer) {
    throw new Error(`${security_key} missing x-amazon-apigateway-authorizer`);
  }
  if (authorizer.type !== 'token') {
    throw new Error(`${security_key} authorizer "type" must be "token"`);
  }
  const lambda_name = parseLambdaName(authorizer.authorizerUri);
  const re = authorizer.identityValidationExpression
    ? new RegExp(authorizer.identityValidationExpression)
    : null;
  const removeCached = (token) => {
    return () => {
      delete cache[token];
    };
  };
  return function (req, res, params, query, headers, raw_body) {
    const authorizationToken = headers[security_def.name];
    if (authorizationToken) {
      if (re && !re.test(authorizationToken)) {
        reject(res, 401, 'Unauthorized');
        return;
      }
      const cached = cache[authorizationToken];
      if (cached) {
        delegate(req, res, params, query, headers, raw_body, cached.policy);
        return;
      }
    }
    emitter.emit(
      'lambda',
      lambda_name,
      {
        authorizationToken
      },
      {},
      (err, policy) => {
        if (err) {
          reject(res, 401, String(err));
          return;
        }
        const { Statement } = policy.policyDocument;
        if (Statement.length !== 1 || Statement[0].Effect !== 'Allow') {
          reject(res, 403, 'Unauthorized');
          return;
        }
        const ttl = authorizer.authorizerResultTtlInSeconds;
        if (ttl && authorizationToken) {
          cache[authorizationToken] = {
            policy,
            timeout: setTimeout(removeCached(authorizationToken), ttl * 1000)
          };
        }
        delegate(req, res, params, query, headers, raw_body, policy);
      }
    );
  };
};
