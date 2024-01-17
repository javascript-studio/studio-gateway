# Studio Gateway

A custom [Swagger][] server and compiler with [AWS Lambda
and mock integration][aws-int], for local API Gateway testing.

## Features

- Request parameters, header & query mappings
- Request body models
- Request-/Response Velocity templates and JSON Path queries
- Response mappings with regular expressions
- Response headers
- AWS Lambda integration
- AWS Mock integration
- Swagger `$ref` to external files - compiles to single AWS compatible file

## Usage

Assuming a `swagger.json` file in the current directory:

```js
const Gateway = require('@studio/gateway');
const Lambda = require('@studio/lambda');

const lambda = Lambda.create();
const gateway = Gateway.create();
gateway.on('lambda', lambda.invoke);
gateway.listen(1337);
```

## API

- `gateway = Gateway.create([options])`: Returns a new gateway server
  for the given options.
  - `swagger_file`: The swagger file to read. Defaults to `swagger.json`.
  - `swagger_env`: The [dotenv][] config to read.
  - `stage`: The stage name to use. Defaults to "local".
  - `stageVariables`: The stage variables to use. Default to an empty object.
- `gateway.listen(port[, callback])`: Bind the server to the given port.

## Events

- `lambda(name, event, context, callback)`: When a Lambda integration should be
  invoked. See [@studio/lambda][] for a custom Lambda execution environment.

## Swagger command

This module ships with a `swagger` command to compile a `swagger.json` file with
references to other files into a single AWS compatible file.

Use in npm scripts like this:

```json
{
  "scripts": {
    "swagger:prod": "swagger -o target/swagger-prod.json"
  }
}
```

The `swagger` optionally loads the [dotenv][] module and replaces environment
`${variables}`.

These options are supported:

- `-f, --file`: Sets the name of the swagger file. Defaults to `swagger.json`.
- `-e, --env`: Sets the path to a `dotenv` config file.
- `-o, --outfile`: Defines the output file to write to. If not specified, the
  result is printed to standard out.

Note that all environment variables can be used. When using npm scripts as
shown above, you can also do things like `${npm_package_version}`.

[Swagger]: http://swagger.io
[aws-int]: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html
[@studio/lambda]: https://github.com/javascript-studio/studio-lambda
[dotenv]: https://www.npmjs.com/package/dotenv
