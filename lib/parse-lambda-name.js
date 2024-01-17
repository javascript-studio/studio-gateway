'use strict';

const GROUP_REGION = '([a-z0-9\\-]+)';
const GROUP_VERSION = '(\\d{4}-\\d{2}-\\d{2})';
const GROUP_ARN = '(\\d+)';
const GROUP_PREFIX = '([^_]+)';
const GROUP_LAMBDA_NAME = '([^\\:/]+)';
const API_GATEWAY_URI = `arn:aws:apigateway:${GROUP_REGION}:lambda:path/${GROUP_VERSION}`;
const LAMBDA_URI = `arn:aws:lambda:${GROUP_REGION}:${GROUP_ARN}:function:${GROUP_PREFIX}_${GROUP_LAMBDA_NAME}`;
const LAMBDA_URI_RE = new RegExp(`^${API_GATEWAY_URI}/functions/${LAMBDA_URI}`);

function parseLambdaName(uri) {
  const match = uri.match(LAMBDA_URI_RE);
  if (match) {
    return match[6];
  }
  throw new Error(`Unexpected integration format "${uri}"`);
}

exports.parseLambdaName = parseLambdaName;
