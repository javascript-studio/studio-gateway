# Changes

## 2.1.1

- 🐛 [`e412fbe`](https://github.com/javascript-studio/studio-gateway/commit/e412fbe388fe68da42e365bfab6251479dc1b689)
  Fix stage variable check

## 2.1.0

- 🍏 [`3384515`](https://github.com/javascript-studio/studio-gateway/commit/33845156a924580c071092554a39e0604f89452a)
  Support stage variables

## 2.0.0

- 💥 [`6100329`](https://github.com/javascript-studio/studio-gateway/commit/610032979bc83932e88f474ceaceac8fd5a52bdd)
  __BREAKING:__ Upgrade Studio Log to v2
- 🐛 [`cf5596e`](https://github.com/javascript-studio/studio-gateway/commit/cf5596ec2cd10e2cca5238941c0580c02f1a4a4f)
  Use `Buffer.from` instead of deprecated `new Buffer`
- ✨ [`b22cbd8`](https://github.com/javascript-studio/studio-gateway/commit/b22cbd8c5875ebfa3ad23ed63361a76b9f078c9f)
  Use Sinon default sandbox
- ✨ [`fb779b4`](https://github.com/javascript-studio/studio-gateway/commit/fb779b45fbfc2c5c54fae4cf6a9202e2a98b86d4)
  Use Sinon + Referee
- 📚 [`d330f37`](https://github.com/javascript-studio/studio-gateway/commit/d330f378e598c53c4ad9877365320ac13eddb7f1)
  Add commit links with `--commits`

## 1.8.0

- 🍏 Cache authorization tokens according to configured ttl
- ✨ Update dependencies
- 🐛 Add `--exit` option to mocha

## 1.7.1

- 🐛 Use [json-parse-better-errors][]
- 🐛 Use `sinon.createSandbox` instead of `sinon.sandbox.create`

[json-parse-better-errors]: https://github.com/zkat/json-parse-better-errors

## 1.7.0

- 🍏 Support array parameters
- 📚 Shorten API documentation
- ✨ Change internal function naming convention

## 1.6.1

- Reduce duplication in log message

## 1.6.0

- Use `@studio/log`

## 1.5.0

- Support boolean parameters

## 1.4.2

- Look for `content-type` header instead of `accept`
- Handle invalid request exceptions

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
