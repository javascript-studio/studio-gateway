# JavaScript Studio Gateway

A custom [Swagger][] server and compiler with [AWS Lambda
and mock integration][aws-int], for local API Gateway testing.

## Features

- ✅  Request parameters, header & query mappings
- ✅  Request body models
- ✅  Request-/Response Velocity templates and JSON Path queries
- ✅  Response mappings with regular expressions
- ✅  Response headers
- ✅  AWS Lambda integration
- ✅  AWS Mock integration
- ✅  Swagger `$ref` to external files - compiles to single AWS compatible file

## Usage

Assuming a `swagger.json` file in the current directory:

```js
const gateway = require('@studio/gateway');
const lambda = require('@studio/lambda');

const lambda_ctrl = lambda.create();
const gateway_server = gateway.create(lambda_ctrl)
gateway_server.on('lambda', lambda_ctrl.invoke);
gateway_server.listen(1337);
```

## API

- `gateway_server = gateway.create([options])`: Returns a new gateway server
  for the given options.
    - `swagger_file`: The swagger file to read. Defaults to `swagger.json`.
- `gateway_server.listen(port[, callback])`: Bind the server to the given port.

## Events

- `lambda(name, event, context, callback)`: When a lambda integration should be
  invoked. See [@studio/lambda][] for a custom Lambda execution environment.

## Swagger command

This module ships with a `swagger` command to compile a `swagger.json` file with
references to other files into a single AWS compatible file.

Use in npm scripts like this:

```json
{
  "scripts": {
    "swagger:prod": "swagger > target/swagger-prod.json"
  }
}
```

[Swagger]: http://swagger.io
[aws-int]: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html
[@studio/lambda]: https://github.com/javascript-studio/studio-lambda
