#!/usr/bin/env node
'use strict';

const argv = require('minimist')(process.argv.slice(2), {
  alias: {
    env: 'e',
    file: 'f',
    outfile: 'o'
  }
});

const { loadSwagger } = require('../lib/swagger');

const json = loadSwagger(argv);
const str = JSON.stringify(json, null, '  ');

if (argv.outfile) {
  require('fs').writeFile(argv.outfile, str, (err) => {
    if (err) {
      throw err;
    }
  });
} else {
  console.log(str);
}
