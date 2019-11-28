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
