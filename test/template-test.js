/*eslint-env mocha*/
'use strict';

const { assert } = require('@sinonjs/referee-sinon');
const { renderTemplate } = require('../lib/templates');

describe('renderTemplate', () => {

  it('$context.authorizer.principalId', () => {
    const res = renderTemplate('$context.authorizer.principalId', {
      authorizer: {
        principalId: 'User123'
      }
    }, {}, {}, '');

    assert.equals(res, 'User123');
  });

  it('$input.body', () => {
    const res = renderTemplate('$input.body', {}, {}, {}, '{"raw":"body"}');

    assert.json(res, { raw: 'body' });
  });

  it('$input.params()', () => {
    const res = renderTemplate('$input.params()', {}, {
      params: { a: 'a' },
      query: { b: 'b' },
      headers: { c: 'c' }
    });

    assert.equals(res, '{path={a=a}, querystring={b=b}, headers={c=c}}');
  });

  it('$input.params(x) path', () => {
    const res = renderTemplate('$input.params("x")', {}, {
      params: { x: 'param' },
      query: { x: 'query' },
      headers: { x: 'header' }
    });

    assert.equals(res, 'param');
  });

  it('$input.params(x) query', () => {
    const res = renderTemplate('$input.params("x")', {}, {
      params: {},
      query: { x: 'query' },
      headers: { x: 'header' }
    });

    assert.equals(res, 'query');
  });

  it('$input.params(x) headers', () => {
    const res = renderTemplate('$input.params("x")', {}, {
      params: {},
      query: {},
      headers: { x: 'header' }
    });

    assert.equals(res, 'header');
  });

  it('$input.json(path)', () => {
    const res = renderTemplate('$input.json("$.x")', {}, {}, {
      x: { y: 'test' }
    });

    assert.json(res, { y: 'test' });
  });

  it('$input.path(path)', () => {
    const res = renderTemplate('$input.path("$.x")', {}, {}, {
      x: 'test'
    });

    assert.equals(res, 'test');
  });

  it('quoted $util.path(path) with string value', () => {
    // Use this notation for optional body values:
    const res = renderTemplate('{"x":"$input.path(\'$.y\')"}', {}, {}, {
      y: 'y'
    });

    assert.json(res, { x: 'y' });
  });

  it('quoted $util.path(path) with undefined', () => {
    // Use this notation for optional body values:
    const res = renderTemplate('{"x":"$input.path(\'$.y\')"}', {}, {}, {});

    assert.json(res, { x: '' });
  });

  it('$util.escapeJavaScript(str)', () => {
    const res = renderTemplate('$util.escapeJavaScript(\'{"x":"test"}\')',
      {}, {});

    assert.equals(res, '{\\"x\\":\\"test\\"}');
  });

  it('$util.parseJson(str)', () => {
    const res = renderTemplate('$util.parseJson(\'{"x":"test"}\').x', {}, {});

    assert.equals(res, 'test');
  });

  it('$util.urlEncode(str)', () => {
    const res = renderTemplate('$util.urlEncode(\'a b\')', {}, {});

    assert.equals(res, 'a%20b');
  });

  it('$util.urlDecode(str)', () => {
    const res = renderTemplate('$util.urlDecode(\'a%20b\')', {}, {});

    assert.equals(res, 'a b');
  });

  it('$util.base64Encode(str)', () => {
    const res = renderTemplate('$util.base64Encode(\'test\')', {}, {});

    assert.equals(res, 'dGVzdA==');
  });

  it('$util.base64Decode(str)', () => {
    const res = renderTemplate('$util.base64Decode(\'dGVzdA==\')', {}, {});

    assert.equals(res, 'test');
  });

  it('stageVariables.test', () => {
    const res = renderTemplate('$stageVariables.test', {}, {}, {}, {}, {
      test: 42
    });

    assert.equals(res, '42');
  });

});
