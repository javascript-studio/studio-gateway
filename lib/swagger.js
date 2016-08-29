/*eslint no-sync:0*/
'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function copy(source, target, depth = 1) {
  for (const key of Object.keys(source)) {
    if (target[key]) {
      if (depth === 1) {
        copy(source[key], target[key], depth + 1);
      }
    } else {
      target[key] = source[key];
    }
  }
}

function replace_vars(_, name) {
  if (name in process.env) {
    return process.env[name];
  }
  throw new Error(`Missing environment variable "${name}"`);
}

function walk(json, defs, dirname) {
  if (Object.prototype.toString.call(json) !== '[object Object]') {
    return;
  }
  for (const key of Object.keys(json)) {
    const value = json[key];
    if (typeof value === 'string') {
      json[key] = value.replace(/\${([a-zA-Z_0-9]+)}/g, replace_vars);
    }
    walk(json[key], defs, dirname);
  }
  if (!json.$ref || json.$ref.indexOf('#/') === 0) {
    return;
  }
  const ref_path = path.join(dirname, json.$ref);
  const name = ref_path.replace(/\//g, '-').replace(/\.json$/, '');
  json.$ref = `#/definitions/_external/${name}`;
  if (defs._external) {
    if (defs._external[name]) {
      return; // Only read once.
    }
  } else {
    defs._external = {};
  }
  const ref_json = exports.loadSwagger({ file: ref_path });
  defs._external[name] = ref_json;
  if (ref_json.definitions) {
    copy(ref_json.definitions, defs);
    delete ref_json.definitions;
  }
}

exports.loadSwagger = function (options = {}) {
  if (options.env) {
    dotenv.config({ path: options.env });
  }
  const file = options.file || 'swagger.json';
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const defs = json.definitions || {};
  walk(json, defs, path.dirname(file));
  if (Object.keys(defs).length) {
    json.definitions = defs;
  }
  return json;
};

function inline(json, root) {
  if (Object.prototype.toString.call(json) !== '[object Object]') {
    return;
  }
  for (const key of Object.keys(json)) {
    inline(json[key], root);
  }
  if (!json.$ref || json.$ref.indexOf('#/') !== 0) {
    return;
  }
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

exports.inlineSwaggerRefs = function (json) {
  inline(json, json);
  return json;
};
