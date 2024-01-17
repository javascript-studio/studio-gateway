'use strict';

exports.upperCaseHeaders = upperCaseHeaders;

function upperCaseHeaders(headers) {
  const upper_headers = {};
  Object.keys(headers).forEach((key) => {
    upper_headers[key.replace(/(^[a-z]|-[a-z])/g, matchToUpperCase)] =
      headers[key];
  });
  return upper_headers;
}

function matchToUpperCase(_, match) {
  return match.toUpperCase();
}
