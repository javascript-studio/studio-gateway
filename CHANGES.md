# Changes

## 2.3.2

- 🐛 [`5e88eb1`](https://github.com/javascript-studio/studio-gateway/commit/5e88eb1fc16a06860017220e851ffcf51afe6c95)
  Log 404 failures
- ✨ [`ebc0dea`](https://github.com/javascript-studio/studio-gateway/commit/ebc0dea2cb0d36795815e859a3198eb56f4ae556)
  Add "files" section to `package.json`
- ✨ [`bbd95a7`](https://github.com/javascript-studio/studio-gateway/commit/bbd95a7e6c9aa4a5eeaffaf85b0c1581c36d0035)
  Upgrade referee-sinon to v7
- ✨ [`2d891da`](https://github.com/javascript-studio/studio-gateway/commit/2d891da1aa3ffd55c99763771141a9b1c6b9fc21)
  Update Mocha
- ✨ [`5b0586a`](https://github.com/javascript-studio/studio-gateway/commit/5b0586a3fbae204f7ed6ca29c5130caff2fce726)
  Rename function variables to match naming convention
- ✨ [`945a249`](https://github.com/javascript-studio/studio-gateway/commit/945a2496d4606c3b7091f60209ed9f0a64830eaf)
  npm audit
- ✨ [`daad371`](https://github.com/javascript-studio/studio-gateway/commit/daad3711de737153fa8749564018d8462e98d37d)
  Upgrade eslint to latest
- ✨ [`5ca938d`](https://github.com/javascript-studio/studio-gateway/commit/5ca938d142cd409c9540c8f11ee7d9c6c1902611)
  Upgrade Mocha to latest
- ✨ [`5635652`](https://github.com/javascript-studio/studio-gateway/commit/5635652b0e631c507ad51f401c289700abc967d8)
  Upgrade @sinonjs/referee-sinon to latest
- ✨ [`c4c7978`](https://github.com/javascript-studio/studio-gateway/commit/c4c7978592453a86809ce9aa4c892e22b61e517d)
  Update Studio Changes to v2
- 📚 [`f64e232`](https://github.com/javascript-studio/studio-gateway/commit/f64e2326d23e87003ebe179cf4046a797e7096d4)
  Add copyright statement

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2020-02-28._

## 2.3.1

- 🐛 [`2db3e54`](https://github.com/javascript-studio/studio-gateway/commit/2db3e54a60f335ac6a08665559a83729c8ad9c9a)
  Allow schema-less body
- 🐛 [`1f751a7`](https://github.com/javascript-studio/studio-gateway/commit/1f751a77e5e7a12a9a13fd4d587c24ab0607959b)
  Allow any type if "type" is not specified

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2018-12-05._

## 2.3.0

- 🍏 [`a45e9e9`](https://github.com/javascript-studio/studio-gateway/commit/a45e9e9bf02f1e93c740b2761e31b2cd110287a0)
  Add support for security policy context properties
- 📚 [`758619c`](https://github.com/javascript-studio/studio-gateway/commit/758619c5b124cbdfab2905e6a4ee5fef0f36a2bb)
  Update Studio Changes for `--footer` support

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2018-09-10._

## 2.2.1

- 🐛 [`887c0e6`](https://github.com/javascript-studio/studio-gateway/commit/887c0e6b4d021d668a8912f5abaf168f54db6673)
  Fix required fields check in body schema

## 2.2.0

- 🍏 [`45bf0d9`](https://github.com/javascript-studio/studio-gateway/commit/45bf0d90c7c3b667030411dbb032bf50b8c60cdf)
  Add support for `stage` and `stageVariables` options

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
