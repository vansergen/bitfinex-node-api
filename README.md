# bitfinex-node-api [![Build Status](https://travis-ci.com/vansergen/bitfinex-node-api.svg?branch=master)](https://travis-ci.com/vansergen/bitfinex-node-api) [![GitHub version](https://badge.fury.io/gh/vansergen%2Fbitfinex-node-api.svg)](https://github.com/vansergen/bitfinex-node-api) ![node](https://img.shields.io/node/v/bitfinex-node-api) ![NPM](https://img.shields.io/npm/l/bitfinex-node-api) ![npm](https://img.shields.io/npm/dt/bitfinex-node-api) ![GitHub top language](https://img.shields.io/github/languages/top/vansergen/bitfinex-node-api)

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
  group
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
const key = "BitfinexAPIKey";
const secret = "BitfinexAPISecret";
import { AuthenticatedClient1 } from "bitfinex-node-api";
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
  walletto
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
  walletselected
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
  is_postonly
});
```

- [`newOrders`](https://docs.bitfinex.com/v1/reference#rest-auth-orders)

```typescript
const order1 = {
  amount: "1",
  price: "3",
  type: "limit",
  exchange: "bitfinex",
  symbol: "ETCUSD",
  side: "buy",
  is_postonly: true
};
const order2 = {
  amount: "2",
  price: "2",
  type: "limit",
  exchange: "bitfinex",
  symbol: "ETCUSD",
  side: "buy"
};
const orders = [order1, order2];
const result = await client.newOrders({ orders });
```
