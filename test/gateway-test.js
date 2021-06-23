'use strict';

const fs = require('fs');
const supertest = require('supertest');
const { assert, refute, match, sinon } = require('@sinonjs/referee-sinon');
const logger = require('@studio/log');
const gateway = require('..');

const log = logger('API Gateway');

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

function defineLambda(req_template = '$input.json(\'$\')', res_template = null) {
  const responseTemplates = res_template ? {
    'application/json': res_template
  } : null;
  return {
    type: 'aws',
    uri: lambdaUri(),
    httpMethod: 'POST',
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
  let swagger;
  let server;

  beforeEach(() => {
    sinon.stub(log, 'error');
    sinon.stub(log, 'terminate');
    swagger = sinon.stub(fs, 'readFileSync').withArgs('swagger.json');
  });

  afterEach((done) => {
    sinon.restore();
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
      .expect(404, (err) => {
        assert.calledOnceWith(log.terminate, 'Not found', {
          method: 'GET',
          url: '/unknown'
        });
        done(err);
      });
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

  it('responds with stage variable', (done) => {
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
                    'method.response.header.x-foo-bar': 'stageVariables.test'
                  },
                  responseTemplate: '{}'
                }
              }
            }
          }
        }
      }
    });

    supertest(create({ stageVariables: { test: 'thingy' } }))
      .get('/foo')
      .expect('content-type', 'application/json')
      .expect('x-foo-bar', 'thingy')
      .expect(200, done);
  });

  it('emits "lambda" event with empty body', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': defineLambda()
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
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
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
              httpMethod: 'POST',
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
              httpMethod: 'POST',
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

  it('maps stage name', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            parameters: [],
            'x-amazon-apigateway-integration':
              defineLambda('{"stage":"$context.stage"}')
          }
        }
      }
    });
    create({ stage: 'beta' });
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('Authorization', 'Secret')
      .expect(200, (err) => {
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
          stage: 'beta'
        }, {}, sinon.match.func);
        done();
      });
  });

  it('maps stage variable', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            parameters: [],
            'x-amazon-apigateway-integration':
              defineLambda('{"foo":"$stageVariables.foo"}')
          }
        }
      }
    });
    create({ stageVariables: { foo: 'bar' } });
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('Authorization', 'Secret')
      .expect(200, (err) => {
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
          foo: 'bar'
        }, {}, sinon.match.func);
        done();
      });
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
              defineLambda('{"auth":"$input.params(\'Authorization\')"}')
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
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
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
            'x-amazon-apigateway-integration': defineLambda()
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
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
          some: 'content'
        }, {}, sinon.match.func);
        done();
      });
  });

  it('allows any type if "type" is not specified', (done) => {
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
                  some: {}
                }
              }
            }],
            'x-amazon-apigateway-integration': defineLambda()
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
      .send({ some: 42 })
      .expect(200, (err) => {
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
          some: 42
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
            'x-amazon-apigateway-integration': defineLambda()
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
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
          some: { thing: 'content' }
        }, {}, sinon.match.func);
        done();
      });
  });

  it('maps body json with array to parameter', (done) => {
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
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  }
                }
              }
            }],
            'x-amazon-apigateway-integration': defineLambda()
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
      .send({ some: ['array', 'content'] })
      .expect(200, (err) => {
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
          some: ['array', 'content']
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
                type: 'object',
                properties: {}
              }
            }],
            'x-amazon-apigateway-integration': defineLambda()
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
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {}, {}, sinon.match.func);
        done();
      });
  });

  it('maps schema-less body as is', (done) => {
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
            'x-amazon-apigateway-integration': defineLambda()
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
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
          some: 'content'
        }, {}, sinon.match.func);
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
            'x-amazon-apigateway-integration': defineLambda()
          }
        }
      }
    });

    assert.exception(() => {
      create();
    }, /^Error: \[POST \/foo\] Missing schema in body parameter$/);
  });

  it('maps query to parameter (string)', (done) => {
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
              defineLambda('{"some":"$input.params(\'some\')"}')
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
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
          some: 'query'
        }, {}, sinon.match.func);
        done();
      });
  });

  it('maps query to parameter (boolean)', (done) => {
    swag({
      paths: {
        '/foo': {
          get: {
            responses: { 200: {} },
            parameters: [{
              name: 'some',
              in: 'query',
              type: 'boolean'
            }],
            'x-amazon-apigateway-integration':
              defineLambda('{"some":$input.params(\'some\')}')
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .get('/foo?some=1')
      .expect(200, (err) => {
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
          some: true
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
            'x-amazon-apigateway-integration': defineLambda()
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
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
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
            'x-amazon-apigateway-integration': defineLambda(
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
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', {
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
            'x-amazon-apigateway-integration': defineLambda('{}',
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
    swag({
      paths: {
        '/foo': {
          post: {
            responses: { 200: {} },
            'x-amazon-apigateway-integration': defineLambda('no json', '{}')
          }
        }
      }
    });
    create();

    supertest(server)
      .post('/foo')
      .expect(JSON.stringify({
        errorMessage: 'Internal server error'
      }))
      .expect(500, (err) => {
        assert.calledOnce(log.error);
        assert.calledWith(log.error, 'Internal server error', {
          method: 'POST',
          url: '/foo',
          headers: match.object
        }, match({
          name: 'SyntaxError',
          message: 'Unexpected token o in JSON at position 1 while parsing '
            + 'near \'no json\''
        }));
        done(err);
      });
  });

  function jwtAuth() {
    swag({
      paths: {
        '/foo': {
          post: {
            security: [{
              JWT: []
            }],
            responses: { 200: {} },
            'x-amazon-apigateway-integration': defineLambda(
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
  }

  it('invokes secured lambda', (done) => {
    jwtAuth();
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
        assert.isNull(err);
        assert.calledTwice(stub);
        assert.calledWith(stub, 'some-auth', {
          authorizationToken: 'Bearer abc.def.ghi'
        }, {}, sinon.match.func);
        assert.calledWith(stub, 'some-lambda', {
          user: 'User123'
        }, {}, sinon.match.func);
        done();
      });
  });

  it('responds with 403 if security lambda fails', (done) => {
    jwtAuth();
    const stub = sinon.stub();
    stub.withArgs('some-auth').yields('Unauthorized');
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect('{"message":"Unauthorized"}')
      .expect(401, (err) => {
        assert.isNull(err);
        done();
      });
  });

  it('responds with 403 if validation expression does not match', (done) => {
    jwtAuth();
    create();
    const stub = sinon.stub();
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .set('Authorization', 'something else')
      .expect('{"message":"Unauthorized"}')
      .expect(401, (err) => {
        assert.isNull(err);
        refute.called(stub);
        done();
      });
  });

  it('caches secured lambda response', (done) => {
    jwtAuth();
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
        assert.isNull(err);
        stub.resetHistory();

        supertest(server)
          .post('/foo')
          .set('accept', 'application/json')
          .set('Authorization', 'Bearer abc.def.ghi')
          .expect('{"some":"response"}')
          .expect(200, (err2) => {
            assert.isNull(err2);
            assert.calledOnceWith(stub, 'some-lambda', {
              user: 'User123'
            }, {}, sinon.match.func);
            done();
          });
      });
  });

  it('exposes context from secured lambda reply', (done) => {
    swag({
      paths: {
        '/foo': {
          post: {
            security: [{
              JWT: []
            }],
            responses: { 200: {} },
            'x-amazon-apigateway-integration': defineLambda(
              '{"key":"$context.authorizer.key","is":$context.authorizer.is}'
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
            authorizerUri: lambdaUri('some-auth')
          }
        }
      }
    });
    create();

    const stub = sinon.stub();
    stub.withArgs('some-auth').yields(null, {
      principalId: 'User123',
      context: {
        key: 'value',
        is: 42
      }
    });
    stub.withArgs('some-lambda').yields(null, { some: 'response' });
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect('{"some":"response"}')
      .expect(200, (err) => {
        assert.isNull(err);
        assert.calledWith(stub, 'some-lambda', {
          key: 'value',
          is: 42
        });
        done();
      });
  });

  it('responds with 400 if required parameter is missing', (done) => {
    swag({
      paths: {
        '/foo': {
          get: {
            responses: { 200: {} },
            parameters: [{
              name: 'some',
              in: 'query',
              type: 'string',
              required: true
            }],
            'x-amazon-apigateway-integration': defineLambda()
          }
        }
      }
    });
    create();
    const stub = sinon.stub().yields('Unexpected');
    server.on('lambda', stub);

    supertest(server)
      .get('/foo')
      .set('accept', 'application/json')
      .expect('{"errorMessage":"Invalid request"}')
      .expect(400, (err) => {
        assert.isNull(err);
        refute.called(stub);
        done();
      });
  });

  function createPostWithBodyAndRequiredField() {
    return {
      post: {
        responses: { 200: {} },
        parameters: [{
          in: 'body',
          schema: {
            type: 'object',
            properties: {
              test: {
                type: 'string'
              }
            },
            required: ['test']
          }
        }],
        'x-amazon-apigateway-integration': defineLambda()
      }
    };
  }

  it('responds with 400 if required body property is missing', (done) => {
    swag({
      paths: {
        '/foo': createPostWithBodyAndRequiredField()
      }
    });
    create();
    const stub = sinon.stub().yields('Unexpected');
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .send({})
      .expect(400, '{"errorMessage":"Invalid request"}', (err) => {
        assert.isNull(err);
        refute.called(stub);
        done();
      });
  });

  it('responds with 200 if required body property is provided', (done) => {
    swag({
      paths: {
        '/foo': createPostWithBodyAndRequiredField()
      }
    });
    create();
    const stub = sinon.stub().yields(null, {});
    server.on('lambda', stub);

    supertest(server)
      .post('/foo')
      .set('accept', 'application/json')
      .send({ test: 'yes' })
      .expect(200, '{}', (err) => {
        assert.isNull(err);
        assert.calledOnceWith(stub);
        done();
      });
  });

  it('invokes aws_proxy integration lambda', (done) => {
    swag({
      paths: {
        '/foo': {
          get: {
            'x-amazon-apigateway-integration': {
              type: 'aws_proxy',
              uri: lambdaUri(),
              httpMethod: 'POST'
            }
          }
        }
      }
    });
    create({ stage: 'beta', stageVariables: {} });
    const stub = sinon.stub();
    stub.withArgs('some-lambda').yields(null, {
      statusCode: 200,
      body: '{}'
    });
    server.on('lambda', stub);

    supertest(server)
      .get('/foo')
      .set('accept', 'application/json')
      .send({ test: 'yes' })
      .expect(200, '{}', (err) => {
        assert.isNull(err);
        assert.calledOnceWith(stub, 'some-lambda', match({
          path: '/foo',
          httpMethod: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          pathParameters: null,
          queryStringParameters: null,
          stageVariables: {},
          requestContext: match({
            accountId: '000000000000',
            stage: 'beta',
            authorizer: null,
            identity: {},
            httpMethod: 'GET'
          }),
          isBase64Encoded: false
        }));
        done();
      });
  });

  it('invokes aws_proxy integration lambda with path and query parameters', (done) => {
    swag({
      paths: {
        '/foo/{key}': {
          put: {
            security: [{
              JWT: []
            }],
            'x-amazon-apigateway-integration': {
              type: 'aws_proxy',
              uri: lambdaUri(),
              httpMethod: 'POST'
            }
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
            authorizerUri: lambdaUri('some-auth')
          }
        }
      }
    });
    create({ stage: 'beta', stageVariables: { foo: 'bar' } });
    const stub = sinon.stub();
    stub.withArgs('some-auth').yields(null, {
      principalId: 'User123',
      context: {
        key: 'value',
        is: 42
      }
    });
    stub.withArgs('some-lambda').yields(null, {
      statusCode: 200,
      body: '{}'
    });
    server.on('lambda', stub);

    supertest(server)
      .put('/foo/thingy?this=that')
      .set('accept', 'application/json')
      .set('Authorization', 'Bearer abc.def.ghi')
      .send({ test: 'yes' })
      .expect(200, '{}', (err) => {
        assert.isNull(err);
        assert.calledWith(stub, 'some-auth', {
          authorizationToken: 'Bearer abc.def.ghi'
        });
        assert.calledWith(stub, 'some-lambda', match({
          path: '/foo/thingy',
          httpMethod: 'PUT',
          headers: {
            'Accept': 'application/json'
          },
          pathParameters: { key: 'thingy' },
          queryStringParameters: { this: 'that' },
          stageVariables: { foo: 'bar' },
          requestContext: match({
            accountId: '000000000000',
            stage: 'beta',
            authorizer: {
              principalId: 'User123',
              key: 'value',
              is: '42'
            },
            identity: {},
            httpMethod: 'PUT'
          }),
          body: '{"test":"yes"}',
          isBase64Encoded: false
        }));
        done();
      });
  });

  it('invokes aws_proxy integration lambda with any method', (done) => {
    swag({
      paths: {
        '/foo': {
          'x-amazon-apigateway-any-method': {
            'x-amazon-apigateway-integration': {
              type: 'aws_proxy',
              uri: lambdaUri(),
              httpMethod: 'POST'
            }
          }
        }
      }
    });
    create();
    const stub = sinon.stub().withArgs('some-lambda').yields(null, {
      statusCode: 200,
      body: '{}'
    });
    server.on('lambda', stub);

    supertest(server)
      .delete('/foo')
      .send()
      .expect(200, (err) => {
        assert.isNull(err);
        assert.calledWith(stub, 'some-lambda', match({
          path: '/foo',
          httpMethod: 'DELETE'
        }));
        done();
      });
  });

  it('invokes aws_proxy integration lambda with {proxy+} parameter', (done) => {
    swag({
      paths: {
        '/foo/{proxy+}': {
          get: {
            'x-amazon-apigateway-integration': {
              type: 'aws_proxy',
              uri: lambdaUri(),
              httpMethod: 'POST'
            }
          }
        }
      }
    });
    create();
    const stub = sinon.stub().withArgs('some-lambda').yields(null, {
      statusCode: 200,
      body: '{}'
    });
    server.on('lambda', stub);

    supertest(server)
      .get('/foo/bar/baz')
      .send()
      .expect(200, (err) => {
        assert.isNull(err);
        assert.calledWith(stub, 'some-lambda', match({
          path: '/foo/bar/baz',
          httpMethod: 'GET',
          pathParameters: {
            proxy: 'bar/baz'
          }
        }));
        done();
      });
  });

});
