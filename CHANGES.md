# Changes

## 2.5.1

- 🐛 [`49d7dca`](https://github.com/javascript-studio/studio-gateway/commit/49d7dca80752e6e3bd638f9c91066e3fec3b96e1)
  Populate resource in proxy integration events

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2023-11-29._

## 2.5.0

- 🍏 [`bd5e7e4`](https://github.com/javascript-studio/studio-gateway/commit/bd5e7e46e47bbe3d7cd8f15b9e50f5a44ff86e5c)
  Remove swagger basePath from pathname
- ✨ [`ca38011`](https://github.com/javascript-studio/studio-gateway/commit/ca38011e6ada85c934431a4f42ea116a6f102215)
  Fix platform dependent test

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2023-01-20._

## 2.4.7

- 🐛 [`2e39414`](https://github.com/javascript-studio/studio-gateway/commit/2e394142a4713b494e18e7f1f3d012a68f6780a6)
  Fix default AWS account ID

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2021-06-23._

## 2.4.6

- 🐛 [`f319b9c`](https://github.com/javascript-studio/studio-gateway/commit/f319b9c8e7ffe14df2043fbc74726e3ae24d191e)
  Set `pathParameters` and `queryStringParameters` to null if empty

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2021-06-14._

## 2.4.5

- 🐛 [`6c8eb40`](https://github.com/javascript-studio/studio-gateway/commit/6c8eb406f5310f999ab3795c6b4a5e8f78f02ed2)
  Fix authorizer data on request context
- 🐛 [`dd54d0e`](https://github.com/javascript-studio/studio-gateway/commit/dd54d0e7fbf5786953c4eb17f880df2665d0a7a4)
  Fix header casing

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2021-05-25._

## 2.4.4

- 🐛 [`fd55e13`](https://github.com/javascript-studio/studio-gateway/commit/fd55e1345f44baecb6b011ee4e29fd28ba60a97f)
  Adjust logging received requests

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2021-05-21._

## 2.4.3

- 🐛 [`26390cf`](https://github.com/javascript-studio/studio-gateway/commit/26390cfc9d349b0fedf2e4a2c67b9d6929e6a0fa)
  Adjust logging received requests

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2021-05-21._

## 2.4.2

- 🐛 [`b90a33d`](https://github.com/javascript-studio/studio-gateway/commit/b90a33de4e4022f6928d29efd87a5f02803de0c3)
  Fail if Lambda integration httpMethod is not POST (#9)

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2021-05-05._

## 2.4.1

- 🐛 [`8e5bcbc`](https://github.com/javascript-studio/studio-gateway/commit/8e5bcbcbf722a3b1235f104692e9648d903428a6)
  Do not require token validation

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2021-04-12._

## 2.4.0

- 🍏 [`2b001c7`](https://github.com/javascript-studio/studio-gateway/commit/2b001c7bc65ef4423ab3c01b70faa5e5b5c3a0b2)
  Implement greedy path parameters
- 🍏 [`b56fc27`](https://github.com/javascript-studio/studio-gateway/commit/b56fc277d47423142dd20cea198cd57a614be697)
  Implement any method
- 🍏 [`1b181e6`](https://github.com/javascript-studio/studio-gateway/commit/1b181e6c9c2283ef423cec1a8c929868e31dd90a)
  Implement proxy integration
- 🐛 [`82433d8`](https://github.com/javascript-studio/studio-gateway/commit/82433d832fe071f099f551b36393480d59a8da4d)
  Check for empty security config
- ✨ [`a6d28d6`](https://github.com/javascript-studio/studio-gateway/commit/a6d28d642ac46acf18046c5bc8701f8e5e32b7a2)
  Configure npm token for CI build
- ✨ [`a2fdd12`](https://github.com/javascript-studio/studio-gateway/commit/a2fdd126ebcc30d905e960d8a4a8208d0e684eb6)
  Pass parsed URL to integration
- ✨ [`18f8a3f`](https://github.com/javascript-studio/studio-gateway/commit/18f8a3f481898d839c0f34bd5d77868fcd2c4ff5)
  Move `parseLamdaName` into own file
- ✨ [`3ab3cd2`](https://github.com/javascript-studio/studio-gateway/commit/3ab3cd27af65c1a676eb3360d5ce8becedcdad2d)
  Move template parsing into integration-aws
- ✨ [`5cf34ef`](https://github.com/javascript-studio/studio-gateway/commit/5cf34ef819f0ed996c43da82f63d481a049bb299)
  Move response handling into integration-aws
- ✨ [`af950fc`](https://github.com/javascript-studio/studio-gateway/commit/af950fcd9e2b46fe3e365e15713e591684544ac6)
  Rename request to integration-aws
- ✨ [`b8c3c03`](https://github.com/javascript-studio/studio-gateway/commit/b8c3c035a0f9c540f63afd7a2151569f6a07e6a7)
  Configure GitHub actions
- ✨ [`6eb66ba`](https://github.com/javascript-studio/studio-gateway/commit/6eb66ba613885776d33ffa62248b481255560495)
  Upgrade mocha and referee-sinon
- ✨ [`293e9cd`](https://github.com/javascript-studio/studio-gateway/commit/293e9cdaa034e91d1a95971499f70b6d390985c0)
  Upgrade eslint and eslint config
- ✨ [`0902da9`](https://github.com/javascript-studio/studio-gateway/commit/0902da9b285c0608666af4eb30fea60444bcf369)
  Update dependencies
- ✨ [`899987d`](https://github.com/javascript-studio/studio-gateway/commit/899987db8dba7fe2a2596f955433711c2d665316)
  Use npm 7
- ✨ [`469f15d`](https://github.com/javascript-studio/studio-gateway/commit/469f15d2a415a41151779c72cf8cf9d3b438c553)
  Add .gitignore

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2021-04-11._

## 2.3.4

- 🐛 [`f16523f`](https://github.com/javascript-studio/studio-gateway/commit/f16523fcc5fc9382db6a7844ad3b47b596fd7fd4)
  Fix message property when unauthorized

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2020-07-29._

## 2.3.3

- 🐛 [`6c5cf73`](https://github.com/javascript-studio/studio-gateway/commit/6c5cf73f09eb49a68f3a0cc16212da4b0a95387e)
  Fix status code when unauthorized

_Released by [Maximilian Antoni](https://github.com/mantoni) on 2020-07-29._

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
