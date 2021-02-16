# bitfinex-node-api ![CI Status](https://github.com/vansergen/bitfinex-node-api/workflows/CI/badge.svg) ![npm](https://img.shields.io/npm/v/bitfinex-node-api) [![Coverage Status](https://coveralls.io/repos/github/vansergen/bitfinex-node-api/badge.svg?branch=master)](https://coveralls.io/github/vansergen/bitfinex-node-api?branch=master) [![Known Vulnerabilities](https://snyk.io/test/github/vansergen/bitfinex-node-api/badge.svg)](https://snyk.io/test/github/vansergen/bitfinex-node-api) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release) [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) ![NPM license](https://img.shields.io/npm/l/bitfinex-node-api) ![node version](https://img.shields.io/node/v/bitfinex-node-api) ![npm downloads](https://img.shields.io/npm/dt/bitfinex-node-api) ![GitHub top language](https://img.shields.io/github/languages/top/vansergen/bitfinex-node-api)

Bitfinex Node.js library

## Installation

```bash
npm install bitfinex-node-api
```

## Usage

### PublicClient1

```typescript
import { PublicClient1 } from "bitfinex-node-api";
const client = new PublicClient1();
```

- [`getTicker`](https://docs.bitfinex.com/v1/reference#rest-public-ticker)

```typescript
const symbol = "btcusd";
const ticker = await client.getTicker({ symbol });
```

- [`getStats`](https://docs.bitfinex.com/v1/reference#rest-public-stats)

```typescript
const symbol = "btcusd";
const stats = await client.getStats({ symbol });
```

- [`getFundingBook`](https://docs.bitfinex.com/v1/reference#rest-public-fundingbook)

```typescript
const currency = "usd";
const limit_bids = 10;
const limit_asks = 5;
const book = await client.getFundingBook({ currency, limit_bids, limit_asks });
```

- [`getOrderBook`](https://docs.bitfinex.com/v1/reference#rest-public-orderbook)

```typescript
const symbol = "btcusd";
const limit_bids = 20;
const limit_asks = 10;
const group = 1;
const book = await client.getOrderBook({
  symbol,
  limit_bids,
  limit_asks,
  group,
});
```

- [`getTrades`](https://docs.bitfinex.com/v1/reference#rest-public-trades)

```typescript
const symbol = "btcusd";
const timestamp = 1444266681;
const limit_trades = 10;
const trades = await client.getTrades({ symbol, timestamp, limit_trades });
```

- [`getLends`](https://docs.bitfinex.com/v1/reference#rest-public-lends)

```typescript
const currency = "usd";
const timestamp = 1444266681;
const limit_lends = 10;
const lends = await client.getLends({ currency, timestamp, limit_lends });
```

- [`getSymbols`](https://docs.bitfinex.com/v1/reference#rest-public-symbols)

```typescript
const symbols = await client.getSymbols();
```

- [`getSymbolDetails`](https://docs.bitfinex.com/v1/reference#rest-public-symbol-details)

```typescript
const symbolDetails = await client.getSymbolDetails();
```

### AuthenticatedClient1

```typescript
import { AuthenticatedClient1 } from "bitfinex-node-api";
const key = "BitfinexAPIKey";
const secret = "BitfinexAPISecret";
const client = new AuthenticatedClient1({ key, secret });
```

- [`getAccountInfo`](https://docs.bitfinex.com/v1/reference#rest-auth-account-info)

```typescript
const info = await client.getAccountInfo();
```

- [`getAccountFees`](https://docs.bitfinex.com/v1/reference#rest-auth-fees)

```typescript
const fees = await client.getAccountFees();
```

- [`getSummary`](https://docs.bitfinex.com/v1/reference#rest-auth-summary)

```typescript
const summary = await client.getSummary();
```

- [`getDepositAddress`](https://docs.bitfinex.com/v1/reference#rest-auth-deposit)

```typescript
const method = "zcash";
const wallet_name = "trading";
const renew = 1;
const result = await client.getDepositAddress({ method, wallet_name, renew });
```

- [`getKeyPermissions`](https://docs.bitfinex.com/v1/reference#auth-key-permissions)

```typescript
const permissions = await client.getKeyPermissions();
```

- [`getMarginInformation`](https://docs.bitfinex.com/v1/reference#rest-auth-margin-information)

```typescript
const marginInformation = await client.getMarginInformation();
```

- [`getWalletBalances`](https://docs.bitfinex.com/v1/reference#rest-auth-wallet-balances)

```typescript
const balances = await client.getWalletBalances();
```

- [`transfer`](https://docs.bitfinex.com/v1/reference#rest-auth-transfer-between-wallets)

```typescript
const amount = "1.00954735";
const currency = "BAB";
const walletfrom = "trading";
const walletto = "exchange";
const result = await client.transfer({
  amount,
  currency,
  walletfrom,
  walletto,
});
```

- [`withdraw`](https://docs.bitfinex.com/v1/reference#rest-auth-withdrawal)

```typescript
const amount = "1.0";
const address = "1DKwqRhDmVyHJDL4FUYpDmQMYA3Rsxtvur";
const walletselected = "exchange";
const withdraw_type = "bitcoin";
const result = await client.withdraw({
  amount,
  withdraw_type,
  address,
  walletselected,
});
```

- [`newOrder`](https://docs.bitfinex.com/v1/reference#rest-auth-orders)

```typescript
const amount = "1";
const price = "3";
const type = "limit";
const exchange = "bitfinex";
const symbol = "ETCUSD";
const side = "buy";
const is_postonly = true;
const order = await client.newOrder({
  amount,
  price,
  type,
  exchange,
  symbol,
  side,
  is_postonly,
});
```

- [`newOrders`](https://docs.bitfinex.com/v1/reference#rest-auth-multiple-new-orders)

```typescript
const order1 = {
  amount: "1",
  price: "3",
  type: "limit",
  exchange: "bitfinex",
  symbol: "ETCUSD",
  side: "buy",
  is_postonly: true,
};
const order2 = {
  amount: "2",
  price: "2",
  type: "limit",
  symbol: "ETCUSD",
  side: "buy",
};
const orders = [order1, order2];
const result = await client.newOrders({ orders });
```

- [`cancelOrder`](https://docs.bitfinex.com/v1/reference#rest-auth-cancel-order)

```typescript
const order_id = 446915287;
const order = await client.cancelOrder({ order_id });
```

- [`cancelOrders`](https://docs.bitfinex.com/v1/reference#rest-auth-cancel-multiple-orders)

```typescript
const order_id1 = 446915287;
const order_id2 = 446915287;
const order_ids = [order_id1, order_id2];
const { result } = await client.cancelOrders({ order_ids });
```

- [`cancelAllOrders`](https://docs.bitfinex.com/v1/reference#rest-auth-cancel-all-orders)

```typescript
const { result } = await client.cancelAllOrders();
```

- [`replaceOrder`](https://docs.bitfinex.com/v1/reference#rest-auth-replace-order)

```typescript
const amount = "3";
const price = "101";
const type = "limit";
const exchange = "bitfinex";
const side = "sell";
const is_postonly = true;
const symbol = "ETCUSD";
const order_id = 1;
const order = await client.replaceOrder({
  amount,
  price,
  type,
  exchange,
  symbol,
  side,
  is_postonly,
});
```

- [`getOrder`](https://docs.bitfinex.com/v1/reference#rest-auth-order-status)

```typescript
const order_id = 448411153;
const order = await client.getOrder({ order_id });
```

- [`getOrders`](https://docs.bitfinex.com/v1/reference#rest-auth-active-orders)

```typescript
const orders = await client.getOrders();
```

- [`getOrderHistory`](https://docs.bitfinex.com/v1/reference#rest-auth-orders-history)

```typescript
const limit = 50;
const orders = await client.getOrderHistory({ limit });
```

- [`getPositions`](https://docs.bitfinex.com/v1/reference#rest-auth-active-positions)

```typescript
const positions = await client.getPositions();
```

- [`claimPosition`](https://docs.bitfinex.com/v1/reference#rest-auth-claim-position)

```typescript
const position_id = 943715;
const amount = "1.0";
const position = await client.claimPosition({ position_id, amount });
```

- [`getBalanceHistory`](https://docs.bitfinex.com/v1/reference#rest-auth-balance-history)

```typescript
const currency = "USD";
const since = "1444277602.0";
const history = await client.getBalanceHistory({ currency, since });
```

- [`getDepositsWithdrawals`](https://docs.bitfinex.com/v1/reference#rest-auth-deposit-withdrawal-history)

```typescript
const currency = "BTC";
const since = "1444277602.0";
const limit = 10;
const history = await client.getDepositsWithdrawals({ currency, since, limit });
```

- [`getPastTrades`](https://docs.bitfinex.com/v1/reference#rest-auth-past-trades)

```typescript
const symbol = "BTCEUR";
const limit_trades = 25;
const reverse = 1;
const trades = await client.getPastTrades({ symbol, limit_trades, reverse });
```

- [`newOffer`](https://docs.bitfinex.com/v1/reference#rest-auth-new-offer)

```typescript
const currency = "USD";
const amount = "50.0";
const rate = "20.0";
const period = 2;
const direction = "lend";
const offer = await client.newOffer({
  currency,
  amount,
  rate,
  period,
  direction,
});
```

- [`cancelOffer`](https://docs.bitfinex.com/v1/reference#rest-auth-cancel-offer)

```typescript
const offer_id = 13800585;
const offer = await client.cancelOffer({ offer_id });
```

- [`offerStatus`](https://docs.bitfinex.com/v1/reference#rest-auth-offer-status)

```typescript
const offer_id = 13800585;
const offer = await client.offerStatus({ offer_id });
```

- [`activeCredits`](https://docs.bitfinex.com/v1/reference#rest-auth-active-credits)

```typescript
const credits = await client.activeCredits();
```

- [`getOffers`](https://docs.bitfinex.com/v1/reference#rest-auth-offers)

```typescript
const offers = await client.getOffers();
```

- [`offersHistory`](https://docs.bitfinex.com/v1/reference#rest-auth-offers-hist)

```typescript
const limit = 25;
const offers = await client.offersHistory({ limit });
```

- [`getFundingTrades`](https://docs.bitfinex.com/v1/reference#rest-auth-mytrades-funding)

```typescript
const symbol = "USD";
const limit_trades = 1;
const until = "1444141858.0";
const trades = await client.getFundingTrades({ limit_trades, symbol, until });
```

- [`getTakenFunds`](https://docs.bitfinex.com/v1/reference#rest-auth-active-funding-used-in-a-margin-position)

```typescript
const funds = await client.getTakenFunds();
```
