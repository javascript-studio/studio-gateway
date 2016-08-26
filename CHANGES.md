# Changes

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
