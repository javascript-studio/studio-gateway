# Changes

## 1.4.1

- Fix `$input.path` function to return first array element

## 1.4.0

- Swagger models now allow nested objects. However, they're not recursively
  validated yet.
- Fix swagger `$ref` within arrays and within `$ref`ed files.

## 1.3.1

This fix makes error returned by Lambda functions behave more like the AWS API
Gateway implementation.

## 1.3.0

- Support custom security Lambda functions
- Fix template `$context` access

## 1.2.1

- Handle `JSON.parse` exception for request templates

## 1.2.0

Any `${variables}` in the `swagger.json` is now replaced with the corresponding
environment variable. If a variable is not defined, an exception is thrown. The
new `swagger_env` option allows to define a `dotenv` file to be loaded.

A `swagger` command was introduced to compile `swagger.json` into single file.
These flags are available for the new `swagger` command:

- `--env` loads the given dotenv config file
- `--file` allows to override the default swagger.json file
- `--outfile` write to the given file instead of standard out

## 1.1.0

__Features:__

- The Gateway now supports Velocity templates and JSON Path queries for the AWS
  integration. This means the `requestTemplates` and the `responseTemplates`
  are parsed and invoked with full `$input` and `$util` support.
- The request parameters now support "path" and URLs may contain placeholders,
  e.g. `/users/:user`. The corresponding value can then be used in the request
  template with `$input.params('user')`.

__Bugfixes:__

- Lambda error handling now works more like what AWS does, thanks to the
  request templates support the new behavior is closer to reality.

## 1.0.0

- Inception
