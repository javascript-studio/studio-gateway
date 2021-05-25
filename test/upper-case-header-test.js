'use strict';

const { assert } = require('@sinonjs/referee-sinon');
const { upperCaseHeaders } = require('../lib/upper-case-headers');

describe('upperCaseHeaders', () => {
  it('converts first character to upperCase', () => {
    const result = upperCaseHeaders({ test: 'x' });

    assert.equals(result, { Test: 'x' });
  });

  it('converts characters after dashes to upperCase', () => {
    const result = upperCaseHeaders({ 'x-test-foo-bar': 'x' });

    assert.equals(result, { 'X-Test-Foo-Bar': 'x' });
  });

  it('retains upper case characters', () => {
    const result = upperCaseHeaders({ 'X-TEST-Foo-Bar': 'x' });

    assert.equals(result, { 'X-TEST-Foo-Bar': 'x' });
  });
});
