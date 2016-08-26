/*eslint-env mocha*/
'use strict';

const assert = require('assert');
const templates = require('../lib/templates');

describe('templates.render', () => {

  it('$input.body', () => {
    const res = templates.render('$input.body', {}, {}, {}, '{"raw":"body"}');

    assert.equal(res, '{"raw":"body"}');
  });

  it('$input.params()', () => {
    const res = templates.render('$input.params()', {}, {
      params: { a: 'a' },
      query: { b: 'b' },
      headers: { c: 'c' }
    });

    assert.deepEqual(res, '{path={a=a}, querystring={b=b}, headers={c=c}}');
  });

  it('$input.params(x) path', () => {
    const res = templates.render('$input.params("x")', {}, {
      params: { x: 'param' },
      query: { x: 'query' },
      headers: { x: 'header' }
    });

    assert.equal(res, 'param');
  });

  it('$input.params(x) query', () => {
    const res = templates.render('$input.params("x")', {}, {
      params: {},
      query: { x: 'query' },
      headers: { x: 'header' }
    });

    assert.equal(res, 'query');
  });

  it('$input.params(x) headers', () => {
    const res = templates.render('$input.params("x")', {}, {
      params: {},
      query: {},
      headers: { x: 'header' }
    });

    assert.equal(res, 'header');
  });

  it('$input.json(path)', () => {
    const res = templates.render('$input.json("$.x")', {}, {}, {
      x: { y: 'test' }
    });

    assert.equal(res, '{"y":"test"}');
  });

  it('$input.path(path)', () => {
    const res = templates.render('$input.path("$.x").size()', {}, {}, {
      x: 'test'
    });

    assert.equal(res, '1');
  });

  it('$util.escapeJavaScript(str)', () => {
    const res = templates.render('$util.escapeJavaScript(\'{"x":"test"}\')',
      {}, {});

    assert.equal(res, '{\\"x\\":\\"test\\"}');
  });

  it('$util.parseJson(str)', () => {
    const res = templates.render('$util.parseJson(\'{"x":"test"}\').x', {}, {});

    assert.equal(res, 'test');
  });

  it('$util.urlEncode(str)', () => {
    const res = templates.render('$util.urlEncode(\'a b\')', {}, {});

    assert.equal(res, 'a%20b');
  });

  it('$util.urlDecode(str)', () => {
    const res = templates.render('$util.urlDecode(\'a%20b\')', {}, {});

    assert.equal(res, 'a b');
  });

  it('$util.base64Encode(str)', () => {
    const res = templates.render('$util.base64Encode(\'test\')', {}, {});

    assert.equal(res, 'dGVzdA==');
  });

  it('$util.base64Decode(str)', () => {
    const res = templates.render('$util.base64Decode(\'dGVzdA==\')', {}, {});

    assert.equal(res, 'test');
  });

});
