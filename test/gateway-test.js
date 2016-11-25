/*eslint-env mocha*/
'use strict';

const fs = require('fs');
const supertest = require('supertest');
const assert = require('assert');
const sinon = require('sinon');
const gateway = require('..');

const minimal_mock = {
  responses: { 200: {} },
  'x-amazon-apigateway-integration': {
    type: 'mock'
  }
};

function lambdaUri(name = 'some-lambda') {
  return  'arn:aws:apigateway:eu-central-1:lambda:path/2015-03-31/'
    + 'functions/arn:aws:lambda:eu-central-1:123456789:function:'
    + `studio_${name}:current/invocations`;
}

function define_lambda(req_template = '$input.json(\'$\')', res_template) {
  const responseTemplates = res_template ? {
    'application/json': res_template
  } : null;
  return {
    type: 'aws',
    uri: lambdaUri(),
    requestTemplates: {
      'application/json': req_template
    },
    responses: {
      default: {
        statusCode: '200',
        responseTemplates
      }
    }
  };
}

describe('gateway', () => {
  let sandbox;
  let swagger;
  let server;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(console, 'info');
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
        '/foo': {
          post: minimal_mock
        }
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

  it('emits "lambda" event with empty body', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': define_lambda()
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
        sinon.assert.calledWith(stub, 'some-lambda', {
          // Empty body
        }, {}, sinon.match.func);
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
              uri: lambdaUri(),
              requestTemplates: {
                'application/json': '{}'
              },
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
      .expect('{"errorMessage":"{\\"code\\":\\"E_FOO\\"}"}')
      .expect(500, done);
  });

  it('uses matching error response template to extract json', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': {
              type: 'aws',
              uri: lambdaUri(),
              requestTemplates: {
                'application/json': '{}'
              },
              responses: {
                '.*"code":"E_*': {
                  statusCode: '500',
                  responseTemplates: {
                    'application/json': '$input.path(\'$.errorMessage\')'
                  }
                }
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
            'x-amazon-apigateway-integration':
              define_lambda('{"auth":"$input.params(\'Authorization\')"}')
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
          auth: 'Secret'
        }, {}, sinon.match.func);
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
            'x-amazon-apigateway-integration': define_lambda()
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
        }, {}, sinon.match.func);
        done();
      });
  });

  it('maps nested body json to parameter', (done) => {
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
                    type: 'object',
                    properties: {
                      thing: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }],
            'x-amazon-apigateway-integration': define_lambda()
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
      .send({ some: { thing: 'content' } })
      .expect(200, (err) => {
        assert.ifError(err);
        sinon.assert.calledOnce(stub);
        sinon.assert.calledWith(stub, 'some-lambda', {
          some: { thing: 'content' }
        }, {}, sinon.match.func);
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
            'x-amazon-apigateway-integration': define_lambda()
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
        sinon.assert.calledWith(stub, 'some-lambda', {}, {}, sinon.match.func);
        done();
      });
  });

  it('throws if body has no schema', () => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            parameters: [{
              in: 'body'
            }],
            'x-amazon-apigateway-integration': define_lambda()
          }
        }
      }
    });

    assert.throws(() => {
      create();
    }, /^Error: \[POST \/foo\] Missing schema in body parameter$/);
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
            'x-amazon-apigateway-integration':
              define_lambda('{"some":"$input.params(\'some\')"}')
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
        }, {}, sinon.match.func);
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
            'x-amazon-apigateway-integration': define_lambda()
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
        }, {}, sinon.match.func);
        done();
      });
  });

  it('maps path parameter', (done) => {
    swag({
      paths: {
        '/path/{this}/{that}': {
          get: {
            responses: { 200: {} },
            parameters: [{
              name: 'this',
              in: 'path',
              type: 'string'
            }, {
              name: 'that',
              in: 'path',
              type: 'string'
            }],
            'x-amazon-apigateway-integration': define_lambda(
              '{"this":"$input.params(\'this\')",'
              + '"that":"$input.params(\'that\')"}')
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .get('/path/foo/bar')
      .expect(200, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.calledOnce(stub);
        sinon.assert.calledWith(stub, 'some-lambda', {
          this: 'foo',
          that: 'bar'
        }, {}, sinon.match.func);
        done();
      });
  });

  it('uses response template', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': define_lambda('{}',
              '{"wrapped":$input.json(\'$\')}')
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, { some: 'response' });
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .expect(JSON.stringify({ wrapped: { some: 'response' } }))
      .expect(200, done);
  });

  it('throws error with generated request template if JSON error', (done) => {
    sandbox.stub(console, 'error');
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': define_lambda('no json', '{}')
          }
        }
      }
    });
    create();

    supertest(server)
      .post('/foo')
      .expect(JSON.stringify({
        errorMessage: 'Failed to parse event \'no json\': '
          + 'Unexpected token o in JSON at position 1'
      }))
      .expect(500, (err) => {
        sinon.assert.calledTwice(console.info);
        done(err);
      });
  });

  it('invokes secured lambda', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            security: [{
              JWT: []
            }],
            responses: { 200: {} },
            'x-amazon-apigateway-integration': define_lambda(
              '{"user":"$context.authorizer.principalId"}'
            )
          }
        }
      },
      securityDefinitions: {
        JWT: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          'x-amazon-apigateway-authtype': 'custom',
          'x-amazon-apigateway-authorizer': {
            type: 'token',
            authorizerUri: lambdaUri('some-auth'),
            identityValidationExpression: '[^\\.]+\\.[^\\.]+\\.[^\\.]+',
            authorizerResultTtlInSeconds: 3600
          }
        }
      }
    });
    create();
    const stub = sinon.stub();
    stub.withArgs('some-auth').yields(null, { principalId: 'User123' });
    stub.withArgs('some-lambda').yields(null, { some: 'response' });
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect('{"some":"response"}')
      .expect(200, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.calledTwice(stub);
        sinon.assert.calledWith(stub, 'some-auth', {
          authorizationToken: 'Bearer abc.def.ghi'
        }, {}, sinon.match.func);
        sinon.assert.calledWith(stub, 'some-lambda', {
          user: 'User123'
        }, {}, sinon.match.func);
        done();
      });
  });

  it('responds with 403 if security lambda fails', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            security: [{
              JWT: []
            }],
            responses: { 200: {} },
            'x-amazon-apigateway-integration': define_lambda()
          }
        }
      },
      securityDefinitions: {
        JWT: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          'x-amazon-apigateway-authtype': 'custom',
          'x-amazon-apigateway-authorizer': {
            type: 'token',
            authorizerUri: lambdaUri('some-auth'),
            identityValidationExpression: '[^\\.]+\\.[^\\.]+\\.[^\\.]+',
            authorizerResultTtlInSeconds: 3600
          }
        }
      }
    });
    create();
    const stub = sinon.stub();
    stub.withArgs('some-auth').yields('Unauthorized');
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect('{"errorMessage":"Unauthorized"}')
      .expect(403, (err) => {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('responds with 403 if validation expression does not match', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            security: [{
              JWT: []
            }],
            responses: { 200: {} },
            'x-amazon-apigateway-integration': define_lambda()
          }
        }
      },
      securityDefinitions: {
        JWT: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          'x-amazon-apigateway-authtype': 'custom',
          'x-amazon-apigateway-authorizer': {
            type: 'token',
            authorizerUri: lambdaUri('some-auth'),
            identityValidationExpression: '[^\\.]+\\.[^\\.]+\\.[^\\.]+',
            authorizerResultTtlInSeconds: 3600
          }
        }
      }
    });
    create();
    const stub = sinon.stub();
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .set('Authorization', 'something else')
      .expect('{"errorMessage":"Unauthorized"}')
      .expect(403, (err) => {
        if (err) {
          throw err;
        }
        sinon.assert.notCalled(stub);
        done();
      });
  });

});
