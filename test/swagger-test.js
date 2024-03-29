/*eslint n/no-sync: 0*/
'use strict';

const fs = require('fs');
const { assert, refute, sinon } = require('@sinonjs/referee-sinon');
const swagger = require('../lib/swagger');

describe('loadSwagger', () => {
  beforeEach(() => {
    sinon.stub(fs, 'readFileSync');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns parsed content of given file', () => {
    fs.readFileSync.returns('{"some":"stuff"}');

    const json = swagger.loadSwagger({ file: 'some/file.json' });

    assert.equals(json, { some: 'stuff' });
    assert.calledOnceWith(fs.readFileSync, 'some/file.json');
  });

  it('reads default file if no file is given', () => {
    fs.readFileSync.returns('{}');

    swagger.loadSwagger();

    assert.calledOnceWith(fs.readFileSync, 'swagger.json');
  });

  it('replaces external $ref with json', () => {
    fs.readFileSync
      .withArgs('swagger.json')
      .returns('{"some":{"$ref":"other/file.json"}}');
    fs.readFileSync.withArgs('other/file.json').returns('{"other":"content"}');

    const json = swagger.loadSwagger();

    assert.equals(json, {
      some: {
        other: 'content'
      }
    });
  });

  it('replaces $ref recursively', () => {
    fs.readFileSync
      .withArgs('swagger.json')
      .returns('{"some":{"$ref":"other/file.json"}}');
    fs.readFileSync
      .withArgs('other/file.json')
      .returns('{"other":{"$ref":"../more/files.json"}}');
    fs.readFileSync.withArgs('more/files.json').returns('{"deep":true}');

    const json = swagger.loadSwagger();

    assert.equals(json, {
      some: {
        other: {
          deep: true
        }
      }
    });
  });

  it('does not try to read local reference', () => {
    fs.readFileSync
      .withArgs('swagger.json')
      .returns('{"some":{"$ref":"#/def/model"}}');

    refute.exception(() => {
      swagger.loadSwagger();
    });
  });

  it('replaces environment variables', () => {
    process.env.test_env_1 = 'abc';
    process.env.test_env_2 = 'def';
    // eslint-disable-next-line no-template-curly-in-string
    fs.readFileSync.returns('{"some":"${test_env_1}/${test_env_2}"}');

    const json = swagger.loadSwagger({ file: 'some/file.json' });

    assert.equals(json, { some: 'abc/def' });
  });

  it('replaces stage variable with environment variable', () => {
    process.env['stageVariables.test'] = 'abc';
    // eslint-disable-next-line no-template-curly-in-string
    fs.readFileSync.returns('{"some":"${stageVariables.test}"}');

    const json = swagger.loadSwagger({ file: 'some/file.json' });

    assert.equals(json, { some: 'abc' });
  });

  it('throws if an environment variable is not defined', () => {
    // eslint-disable-next-line no-template-curly-in-string
    fs.readFileSync.returns('{"some":"${test_unknown_variable}"}');

    assert.exception(() => {
      swagger.loadSwagger();
    }, /Error: Missing environment variable "test_unknown_variable"$/);
  });

  it('does not throw if a stage variable is not defined', () => {
    // eslint-disable-next-line no-template-curly-in-string
    fs.readFileSync.returns('{"some":"${stageVariables.unknown}"}');

    const json = swagger.loadSwagger({ file: 'some/file.json' });

    // eslint-disable-next-line no-template-curly-in-string
    assert.equals(json, { some: '${stageVariables.unknown}' });
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

    assert.equals(json, {
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
