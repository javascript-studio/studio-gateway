# Changes

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
