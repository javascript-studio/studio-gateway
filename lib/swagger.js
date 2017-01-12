/*eslint no-sync:0*/
'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function copy(source, target, depth = 1) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (target[key]) {
        if (depth === 1) {
          copy(source[key], target[key], depth + 1);
        }
      } else {
        target[key] = source[key];
      }
    }
  }
}

function replace_vars(_, name) {
  if (name in process.env) {
    return process.env[name];
  }
  throw new Error(`Missing environment variable "${name}"`);
}

function walk(json, dirname) {
  if (Object.prototype.toString.call(json) !== '[object Object]') {
    return;
  }
  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      const value = json[key];
      if (typeof value === 'string') {
        json[key] = value.replace(/\${([a-zA-Z_0-9]+)}/g, replace_vars);
      }
      walk(json[key], dirname);
    }
  }
  if (!json.$ref || json.$ref.indexOf('#/') === 0) {
    return;
  }
  const ref_path = path.join(dirname, json.$ref);
  delete json.$ref;
  const ref_json = exports.loadSwagger({ file: ref_path });
  for (const key in ref_json) {
    if (ref_json.hasOwnProperty(key)) {
      json[key] = ref_json[key];
    }
  }
}

exports.loadSwagger = function (options = {}) {
  if (options.env) {
    dotenv.config({ path: options.env });
  }
  const file = options.file || 'swagger.json';
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  walk(json, path.dirname(file));
  return json;
};

function inline(json, root) {
  if (json.$ref && json.$ref.indexOf('#/') === 0) {
    const parts = json.$ref.substring(2).split('/');
    let value = root;
    while (parts.length) {
      value = value[parts.shift()];
    }
    if (!value) {
      throw new Error(`Failed to inline $ref "${json.$ref}"`);
    }
    copy(value, json);
    delete json.$ref;
  }
  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      const value = json[key];
      if (Array.isArray(value)) {
        for (let i = 0, l = value.length; i < l; i++) {
          inline(value[i], root);
        }
      } else if (Object.prototype.toString.call(value) === '[object Object]') {
        inline(value, root);
      }
    }
  }
}

exports.inlineSwaggerRefs = function (json) {
  inline(json, json);
  return json;
};