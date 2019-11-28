# bitfinex-node-api

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
