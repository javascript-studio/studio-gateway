#!/usr/bin/env node
'use strict';

// TODO support -f, --file {swagger-file}
// TODO support -e, --env {env-file} # like localenvify
// TODO support -o, --outfile {file} # and mkdirp the path

const { loadSwagger } = require('../lib/swagger');

const json = loadSwagger();
console.log(JSON.stringify(json, null, '  '));
