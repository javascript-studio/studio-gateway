/*eslint-env mocha*/
'use strict';

const fs = require('fs');
const supertest = require('supertest');
const sinon = require('sinon');
const gateway = require('..');

const SOME_LAMBDA = {
  type: 'aws',
  uri: '__APIGATEWAY__/__LAMBDA__some-lambda:current/invocations',
  responses: {
    default: { statusCode: '200' }
  }
};

describe('gateway', () => {
  let sandbox;
  let swagger;
  let server;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    swagger = sandbox.stub(fs, 'readFileSync').withArgs('swagger.json');
  });

  afterEach((done) => {
    sandbox.restore();
    if (server) {
      server.close(done);
      server = null;
    } else {
      done();
    }
  });

  function create(options) {
    server = gateway.create(options);
    server.listen();
    return server;
  }

  function swag(json) {
    swagger.returns(JSON.stringify(json));
  }

  it('returns 404 for unknown path', (done) => {
    swag({ paths: {} });

    supertest(create())
      .get('/unknown')
      .expect(404, done);
  });

  it('returns 404 for unknown method', (done) => {
    swag({
      paths: {
        '/foo': { post: {} }
      }
    });

    supertest(create())
      .get('/foo')
      .expect(404, done);
  });

  it('returns 404 if aws integration is missing', (done) => {
    swag({
      paths: {
        '/foo': { get: {} }
      }
    });

    supertest(create())
      .get('/foo')
      .expect(404, done);
  });

  it('responds with mock response', (done) => {
    swag({
      paths: {
        '/foo': {
          get: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': {
              type: 'mock',
              responses: {
                default: {
                  statusCode: '200',
                  responseParameters: {
                    'method.response.header.x-foo-bar': '"test"'
                  },
                  responseTemplate: '{}'
                }
              }
            }
          }
        }
      }
    });

    supertest(create())
      .get('/foo')
      .expect('content-type', 'application/json')
      .expect('x-foo-bar', 'test')
      .expect(200, done);
  });

  it('replaces __ORIGIN__ with request origin', (done) => {
    swag({
      paths: {
        '/foo': {
          get: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': {
              type: 'mock',
              responses: {
                default: {
                  statusCode: '200',
                  responseParameters: {
                    'method.response.header.x-foo-bar': '"__ORIGIN__"'
                  },
                  responseTemplate: '{}'
                }
              }
            }
          }
        }
      }
    });

    supertest(create())
      .get('/foo')
      .set('origin', 'http://javascript.studio')
      .expect('x-foo-bar', 'http://javascript.studio')
      .expect(200, done);
  });

  it('emits "lambda" event with empty body', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': SOME_LAMBDA
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, { some: 'response' });
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .send({ some: 'request' }) // ignored
      .expect('{"some":"response"}')
      .expect(200, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.calledOnce(stub);
        sinon.assert.calledWith(stub, 'some-lambda', {}); // empty body
        done();
      });
  });

  it('checks for regexp match to figure out response to use', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': {
              type: 'aws',
              uri: '__APIGATEWAY__/__LAMBDA__some-lambda:current/invocations',
              responses: {
                '.*"code":"E_*': { statusCode: '500' },
                default: { statusCode: '200' }
              }
            }
          }
        }
      }
    });
    create();
    server.on('lambda', sinon.stub().yields('{"code":"E_FOO"}'));

    supertest(server)
      .post('/foo')
      .expect('{"code":"E_FOO"}')
      .expect(500, done);
  });

  it('maps request header to parameter', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            parameters: [{
              name: 'Authorization',
              in: 'header',
              type: 'string'
            }],
            'x-amazon-apigateway-integration': SOME_LAMBDA
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('Authorization', 'Secret')
      .expect(200, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.calledOnce(stub);
        sinon.assert.calledWith(stub, 'some-lambda', {
          Authorization: 'Secret'
        });
        done();
      });
  });

  it('maps body json to parameter', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            parameters: [{
              in: 'body',
              schema: {
                type: 'object',
                properties: {
                  some: {
                    type: 'string'
                  }
                }
              }
            }],
            'x-amazon-apigateway-integration': SOME_LAMBDA
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .send({ some: 'content' })
      .expect(200, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.calledOnce(stub);
        sinon.assert.calledWith(stub, 'some-lambda', {
          some: 'content'
        });
        done();
      });
  });

  it('does not map body json to parameter if not in schema', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            parameters: [{
              in: 'body',
              schema: {
                type: 'object'
              }
            }],
            'x-amazon-apigateway-integration': SOME_LAMBDA
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .send({ some: 'content' }) // provided, but ignored
      .expect(200, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.calledOnce(stub);
        sinon.assert.calledWith(stub, 'some-lambda', {});
        done();
      });
  });

  it('fails if body has no schema', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            parameters: [{
              in: 'body'
            }],
            'x-amazon-apigateway-integration': SOME_LAMBDA
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .send({ some: 'content' })
      .expect(JSON.stringify({
        errorMessage: 'Missing schema in body parameter'
      }))
      .expect(500, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.notCalled(stub);
        done();
      });
  });

  it('maps query to parameter', (done) => {
    swag({
      paths: {
        '/foo': {
          get: {
            responses: { 200: {} },
            parameters: [{
              name: 'some',
              in: 'query',
              type: 'string'
            }],
            'x-amazon-apigateway-integration': SOME_LAMBDA
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .get('/foo?some=query')
      .expect(200, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.calledOnce(stub);
        sinon.assert.calledWith(stub, 'some-lambda', {
          some: 'query'
        });
        done();
      });
  });

  it('maps non-json body to parameter', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            parameters: [{
              in: 'body',
              schema: {
                type: 'object',
                properties: {
                  some: {
                    type: 'string'
                  }
                }
              }
            }],
            'x-amazon-apigateway-integration': SOME_LAMBDA
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .send('some=content')
      .expect(200, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.calledOnce(stub);
        sinon.assert.calledWith(stub, 'some-lambda', {
          some: 'content'
        });
        done();
      });

  });

});
