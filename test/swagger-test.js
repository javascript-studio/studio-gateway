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

    const json = swagger.loadSwagger('some/file.json');

    assert.deepEqual(json, { some: 'stuff' });
    sinon.assert.calledOnce(fs.readFileSync);
    sinon.assert.calledWith(fs.readFileSync, 'some/file.json');
  });

  it('reads default file if undefined is given', () => {
    fs.readFileSync.returns('{}');

    swagger.loadSwagger(undefined);

    sinon.assert.calledOnce(fs.readFileSync);
    sinon.assert.calledWith(fs.readFileSync, 'swagger.json');
  });

  it('replaces external $ref with internal $ref', () => {
    fs.readFileSync.withArgs('swagger.json').returns(
      '{"some":{"$ref":"other/file.json"}}'
    );
    fs.readFileSync.withArgs('other/file.json').returns('{"other":"content"}');

    const json = swagger.loadSwagger();

    assert.deepEqual(json, {
      some: {
        $ref: '#/definitions/_external/other-file'
      },
      definitions: {
        _external: {
          'other-file': {
            other: 'content'
          }
        }
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
        $ref: '#/definitions/_external/other-file'
      },
      definitions: {
        _external: {
          'other-file': {
            other: {
              $ref: '#/definitions/_external/more-files'
            }
          },
          'more-files': {
            deep: true
          }
        }
      }
    });
  });

  it('flatens definitions', () => {
    fs.readFileSync.withArgs('swagger.json').returns(
      '{"some":{"$ref":"other/file.json"}}'
    );
    fs.readFileSync.withArgs('other/file.json').returns(
      '{"definitions":{"some":"model"}}');

    const json = swagger.loadSwagger();

    assert.deepEqual(json, {
      some: {
        $ref: '#/definitions/_external/other-file'
      },
      definitions: {
        _external: {
          'other-file': {}
        },
        some: 'model'
      }
    });
  });

  it('does not replace root definitions', () => {
    fs.readFileSync.withArgs('swagger.json').returns(
      '{"some":{"$ref":"other/file.json"},"definitions":{"test":42}}'
    );
    fs.readFileSync.withArgs('other/file.json').returns(
      '{"definitions":{"some":"model"}}');

    const json = swagger.loadSwagger();

    assert.deepEqual(json, {
      some: {
        $ref: '#/definitions/_external/other-file'
      },
      definitions: {
        _external: {
          'other-file': {}
        },
        some: 'model',
        test: 42
      }
    });
  });

  it('does not read same ref twice', () => {
    fs.readFileSync.withArgs('swagger.json').returns(
      '{"some":{"$ref":"other/file.json"},"more":{"$ref":"other/file.json"}}'
    );
    fs.readFileSync.withArgs('other/file.json').returns('{}');

    const json = swagger.loadSwagger();

    sinon.assert.calledTwice(fs.readFileSync);
    // ... but it does replace the reference twice!
    assert.deepEqual(json, {
      some: {
        $ref: '#/definitions/_external/other-file'
      },
      more: {
        $ref: '#/definitions/_external/other-file'
      },
      definitions: {
        _external: {
          'other-file': {}
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
