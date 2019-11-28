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
