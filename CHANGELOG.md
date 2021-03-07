# Changelog

### [2.3.1](https://github.com/vansergen/bitfinex-node-api/compare/v2.3.0...v2.3.1) (2021-03-07)

### Dependencies

- upgrade `rpc-request` to `v5.0.3` ([26d4980](https://github.com/vansergen/bitfinex-node-api/commit/26d498002761282f65a8c06f1c6e171571b907e1))

## [2.3.0](https://github.com/vansergen/bitfinex-node-api/compare/v2.2.0...v2.3.0) (2021-02-17)

### Features

- add the `closeFunding` method ([3b7f2a6](https://github.com/vansergen/bitfinex-node-api/commit/3b7f2a66e18721f6c5b5ea3fa1b4c61e7cdbd62f))
- add the `closePosition` method ([1704a23](https://github.com/vansergen/bitfinex-node-api/commit/1704a237d15b82876ef08a033ee90f7908643ff0))
- add the `getFundingTrades` method ([191d596](https://github.com/vansergen/bitfinex-node-api/commit/191d596162268b5c25fcfcef2365f98ac4ddc339))
- add the `getTakenFunds` method ([c53a180](https://github.com/vansergen/bitfinex-node-api/commit/c53a180fa27ce012c330aa4c560750669a7a1c3a))
- add the `getTotalFunds` method ([a2c34ed](https://github.com/vansergen/bitfinex-node-api/commit/a2c34ed248c5790e6939a03932700c711d6f0889))
- add the `getUnusedFunds` method ([b80b4c6](https://github.com/vansergen/bitfinex-node-api/commit/b80b4c608d38f3c40f046622c0a8c318ca1f84fa))

## [2.2.0](https://github.com/vansergen/bitfinex-node-api/compare/v2.1.0...v2.2.0) (2021-02-15)

### Features

- add the `activeCredits` method ([973bd1d](https://github.com/vansergen/bitfinex-node-api/commit/973bd1dc6cd09762d92eb3ad935ec5ab3d4ce541))
- add the `cancelOffer` method ([ffee052](https://github.com/vansergen/bitfinex-node-api/commit/ffee05267ec231517d3ca355ef1c2ec8086331e8))
- add the `getDepositsWithdrawals` method ([091c67c](https://github.com/vansergen/bitfinex-node-api/commit/091c67c4b4e16dd00d001abc4ae54ab07f028f9d))
- add the `getOffers` method ([bb643e9](https://github.com/vansergen/bitfinex-node-api/commit/bb643e901fa8d759263c9e7e9ffa0a3252006893))
- add the `getPastTrades` method ([c2fc288](https://github.com/vansergen/bitfinex-node-api/commit/c2fc28892c07feeee668b61dcc4d64f2e0c262ba))
- add the `newOffer` method ([0e20249](https://github.com/vansergen/bitfinex-node-api/commit/0e2024930ed4e6bac0e907c1c5f8ccb7e20655ba))
- add the `offersHistory` method ([2b6a768](https://github.com/vansergen/bitfinex-node-api/commit/2b6a768feec75fc15e2f9c9749a5bae44ad4159f))
- add the `offerStatus` method ([2f24873](https://github.com/vansergen/bitfinex-node-api/commit/2f24873fc636a6da7fec531c29583b6d38955ef8))

### Bug Fixes

- update the `Trade` interface ([a2881bb](https://github.com/vansergen/bitfinex-node-api/commit/a2881bb45ca669406fe2545ee0e94d614db4e31e))

## [2.1.0](https://github.com/vansergen/bitfinex-node-api/compare/v2.0.1...v2.1.0) (2021-02-15)

### Features

- add the `getBalanceHistory` method ([5723a2f](https://github.com/vansergen/bitfinex-node-api/commit/5723a2fa800cec6f1c81b44f7a71b22a4e1a3d91))

### Dependencies

- remove `coveralls` ([13385be](https://github.com/vansergen/bitfinex-node-api/commit/13385be3418e6b4f31edce77a15c865a5410492b))
- upgrade `rpc-request` to `v5.0.2` ([dc7c40d](https://github.com/vansergen/bitfinex-node-api/commit/dc7c40d13bcef295d4c6faa672fc95446eae9a53))

### [2.0.1](https://github.com/vansergen/bitfinex-node-api/compare/v2.0.0...v2.0.1) (2020-12-27)

## [2.0.0](https://github.com/vansergen/bitfinex-node-api/compare/v1.0.0...v2.0.0) (2020-12-27)

### ⚠ BREAKING CHANGES

- drop Node `<14.15.3` support
- the class `PublicClient1` extends `FetchClient`

### Features

- the class `PublicClient1` extends `FetchClient` ([83d38b0](https://github.com/vansergen/bitfinex-node-api/commit/83d38b0a8d28b59e8b1a3d2b52b6d8772fb93088))
- **auth:** add claimPosition method ([294eef2](https://github.com/vansergen/bitfinex-node-api/commit/294eef27f3bdf3603d84c87188c055203c7e325c))
- **auth:** add getOrder method ([99c9cb4](https://github.com/vansergen/bitfinex-node-api/commit/99c9cb4eda30bf67fe6ddb1d7c9a1eaa54513f78))
- **auth:** add getOrderHistory method ([e3edc68](https://github.com/vansergen/bitfinex-node-api/commit/e3edc682838c398f3e1ac9e0da6774f31630d04d))
- **auth:** add getOrders method ([4bcec3f](https://github.com/vansergen/bitfinex-node-api/commit/4bcec3fa2240107ef5b34416c3658af8b38bb4bc))
- **auth:** add getPositions method ([9f50f55](https://github.com/vansergen/bitfinex-node-api/commit/9f50f5520657ff3ce0100bd3f02eef4bfd816de8))
- **auth:** add nonce setter ([5f68c85](https://github.com/vansergen/bitfinex-node-api/commit/5f68c8585a67de497b5c8b24b9c167c2b07852ac))
- **auth:** add replaceOrder method ([d4b1443](https://github.com/vansergen/bitfinex-node-api/commit/d4b1443b57709f4ba2dba215cd0904054cc1b605))
- **auth1:** add cancelAllOrders method ([b62027c](https://github.com/vansergen/bitfinex-node-api/commit/b62027cadb32245e99075c65e884c45d0fc48170))
- **auth1:** add cancelOrder method ([eb594cc](https://github.com/vansergen/bitfinex-node-api/commit/eb594cc43afbf24a676bfd88da3d356a049d9fde))
- **auth1:** add cancelOrders method ([2ec366a](https://github.com/vansergen/bitfinex-node-api/commit/2ec366a66d4401a41504bbb9eefe671efc73792f))
- **auth1:** add getAccountFees method ([cb3f1db](https://github.com/vansergen/bitfinex-node-api/commit/cb3f1dbaab35c85f79080df8d436370166dd0726))
- **auth1:** add getAccountInfo method ([17c8b2a](https://github.com/vansergen/bitfinex-node-api/commit/17c8b2ab41e40a6bfa64a756528f378e913f48b3))
- **auth1:** add getDepositAddress method ([994bdaa](https://github.com/vansergen/bitfinex-node-api/commit/994bdaac03446b0506501e8edee3a79da9484b79))
- **auth1:** add getKeyPermissions method ([e59877e](https://github.com/vansergen/bitfinex-node-api/commit/e59877eb53520ada497ed50abe214bbd82cabc6e))
- **auth1:** add getMarginInformation method ([3cbaa5b](https://github.com/vansergen/bitfinex-node-api/commit/3cbaa5b764ba695779bacf34c457746c07046904))
- **auth1:** add getSummary method ([a791d62](https://github.com/vansergen/bitfinex-node-api/commit/a791d628bc58f10c40c505089c1745ad3b39b174))
- **auth1:** add getWalletBalances method ([9608552](https://github.com/vansergen/bitfinex-node-api/commit/96085522feda5f6c04d0232f4a12c306cb2b3559))
- **auth1:** add newOrder method ([fa99be3](https://github.com/vansergen/bitfinex-node-api/commit/fa99be30086633cbc6eb712081e85754fa3ec111))
- **auth1:** add newOrders method ([c6a95b2](https://github.com/vansergen/bitfinex-node-api/commit/c6a95b2f01524e5dcf734d193cce0e3904f58815))
- **auth1:** add transfer method ([b9e0923](https://github.com/vansergen/bitfinex-node-api/commit/b9e09237a85eca71f3aac800d314651d51f9a717))
- **auth1:** add withdraw method ([6bca2d9](https://github.com/vansergen/bitfinex-node-api/commit/6bca2d9e4bc003c57901705bbe318b9bdae16fdf))
- **module:** add AuthenticatedClient1 class ([2dbc38a](https://github.com/vansergen/bitfinex-node-api/commit/2dbc38a690dc87240eadd78b4e6362143fff708a))
- add signer function ([571b0ef](https://github.com/vansergen/bitfinex-node-api/commit/571b0ef71189ab62043617c46b57bb83850a4e67))

### Bug Fixes

- package.json, package-lock.json & .snyk to reduce vulnerabilities ([0aad4ab](https://github.com/vansergen/bitfinex-node-api/commit/0aad4ab816e396e641c0da7ebc167e036bd67b2a))
- package.json, package-lock.json & .snyk to reduce vulnerabilities ([8e0853f](https://github.com/vansergen/bitfinex-node-api/commit/8e0853f629dda2dd6e0426a684801b0dab73335c))
- package.json, package-lock.json & .snyk to reduce vulnerabilities ([d365377](https://github.com/vansergen/bitfinex-node-api/commit/d365377a9ac7e93b937692013b3f6aba5dcf5ce3))
- upgrade rpc-request from 3.1.2 to 3.1.6 ([e4db559](https://github.com/vansergen/bitfinex-node-api/commit/e4db5590745c05e1abedf596341c7320c5bc6081))
- upgrade snyk from 1.316.1 to 1.316.2 ([4612cc2](https://github.com/vansergen/bitfinex-node-api/commit/4612cc2b84f3bd64973cd1bf883f12d8ba865886))
- upgrade snyk from 1.316.1 to 1.316.2 ([52feaf3](https://github.com/vansergen/bitfinex-node-api/commit/52feaf36219f49f344333ebb665c2e2853b39013))
- **auth:** remove DefaultCurrency from the transfer method ([f67ae40](https://github.com/vansergen/bitfinex-node-api/commit/f67ae400046c610b195c0e5d278a0bb24d415344))

### Performance Improvements

- drop Node `<14.15.3` support ([8cc643e](https://github.com/vansergen/bitfinex-node-api/commit/8cc643ef65561e73e85bce829953c73345c85110))
- signer accepts string as a paylod ([3cc424b](https://github.com/vansergen/bitfinex-node-api/commit/3cc424b955ab762fa63b3603ec93f73dc598b3ce))

### Dependencies

- remove snyk ([3066b28](https://github.com/vansergen/bitfinex-node-api/commit/3066b28de197c6831eb4426c25a5a320fe3c3506))
- update `rpc-request` to `v5.0.1` ([11f3081](https://github.com/vansergen/bitfinex-node-api/commit/11f3081e0e07da9031e4116e5a585ce4e0ae3163))
