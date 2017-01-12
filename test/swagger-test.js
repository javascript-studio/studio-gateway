/*eslint-env mocha*/
/*eslint no-sync: 0*/
'use strict';

const fs = require('fs');
const assert = require('assert');
const sinon = require('sinon');
const swagger = require('../lib/swagger');

describe('loadSwagger', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(fs, 'readFileSync');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns parsed content of given file', () => {
    fs.readFileSync.returns('{"some":"stuff"}');

    const json = swagger.loadSwagger({ file: 'some/file.json' });

    assert.deepEqual(json, { some: 'stuff' });
    sinon.assert.calledOnce(fs.readFileSync);
    sinon.assert.calledWith(fs.readFileSync, 'some/file.json');
  });

  it('reads default file if no file is given', () => {
    fs.readFileSync.returns('{}');

    swagger.loadSwagger();

    sinon.assert.calledOnce(fs.readFileSync);
    sinon.assert.calledWith(fs.readFileSync, 'swagger.json');
  });

  it('replaces external $ref with json', () => {
    fs.readFileSync.withArgs('swagger.json').returns(
      '{"some":{"$ref":"other/file.json"}}'
    );
    fs.readFileSync.withArgs('other/file.json').returns('{"other":"content"}');

    const json = swagger.loadSwagger();

    assert.deepEqual(json, {
      some: {
        other: 'content'
      }
    });
  });

  it('replaces $ref recursively', () => {
    fs.readFileSync.withArgs('swagger.json').returns(
      '{"some":{"$ref":"other/file.json"}}'
    );
    fs.readFileSync.withArgs('other/file.json').returns(
      '{"other":{"$ref":"../more/files.json"}}');
    fs.readFileSync.withArgs('more/files.json').returns(
      '{"deep":true}');

    const json = swagger.loadSwagger();

    assert.deepEqual(json, {
      some: {
        other: {
          deep: true
        }
      }
    });
  });

  it('does not try to read local reference', () => {
    fs.readFileSync.withArgs('swagger.json').returns(
      '{"some":{"$ref":"#/def/model"}}'
    );

    assert.doesNotThrow(() => {
      swagger.loadSwagger();
    });
  });

  it('replaces environment variables', () => {
    process.env.test_env_1 = 'abc';
    process.env.test_env_2 = 'def';
    fs.readFileSync.returns('{"some":"${test_env_1}/${test_env_2}"}');

    const json = swagger.loadSwagger({ file: 'some/file.json' });

    assert.deepEqual(json, { some: 'abc/def' });
  });

  it('throws if an environment variable is not defined', () => {
    fs.readFileSync.returns('{"some":"${test_unknown_variable}"}');

    assert.throws(() => {
      swagger.loadSwagger();
    }, /Error: Missing environment variable "test_unknown_variable"$/);
  });

});


describe('inlineSwaggerRefs', () => {

  it('inlines local swagger refs', () => {
    const json = {
      some: {
        $ref: '#/definitions/foo'
      },
      other: {
        $ref: '#/definitions/deep/bar',
        test: 42
      },
      definitions: {
        foo: {
          simple: true
        },
        deep: {
          bar: {
            complex: ['yes', 'yo'],
            more: 'stuff'
          }
        }
      }
    };

    swagger.inlineSwaggerRefs(json);

    assert.deepEqual(json, {
      some: {
        simple: true
      },
      other: {
        complex: ['yes', 'yo'],
        more: 'stuff',
        test: 42
      },
      definitions: json.definitions
    });
  });

});