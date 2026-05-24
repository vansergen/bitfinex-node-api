# Bitfinex Node.js API [![CI Status](https://github.com/vansergen/bitfinex-node-api/workflows/CI/badge.svg?branch=main)](https://github.com/vansergen/bitfinex-node-api/actions/workflows/ci.yml?query=branch%3Amain) [![npm version](https://badge.fury.io/js/bitfinex-node-api.svg)](https://badge.fury.io/js/bitfinex-node-api) [![Coverage Status](https://coveralls.io/repos/github/vansergen/bitfinex-node-api/badge.svg?branch=main)](https://coveralls.io/github/vansergen/bitfinex-node-api?branch=main) [![Known Vulnerabilities](https://snyk.io/test/github/vansergen/bitfinex-node-api/badge.svg)](https://snyk.io/test/github/vansergen/bitfinex-node-api) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](code_of_conduct.md) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release) [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) ![NPM license](https://img.shields.io/npm/l/bitfinex-node-api) ![node version](https://img.shields.io/node/v/bitfinex-node-api) ![npm downloads](https://img.shields.io/npm/dt/bitfinex-node-api) ![GitHub top language](https://img.shields.io/github/languages/top/vansergen/bitfinex-node-api)

Node.js client for the [Bitfinex v1 API](https://docs.bitfinex.com/v1/reference) — public and authenticated REST plus the v1 [WebSocket](https://docs.bitfinex.com/v1/docs/ws-general) endpoint.

## Installation

```bash
npm install bitfinex-node-api
```

## Usage

### PublicClient

```typescript
import { PublicClient } from "bitfinex-node-api";

const client = new PublicClient();
```

- [`getTicker`](https://docs.bitfinex.com/v1/reference/rest-public-ticker)

```typescript
const ticker = await client.getTicker({ symbol: "BTCUSD" });
```

- [`getStats`](https://docs.bitfinex.com/v1/reference/rest-public-stats)

```typescript
const stats = await client.getStats({ symbol: "BTCUSD" });
```

- [`getFundingBook`](https://docs.bitfinex.com/v1/reference/rest-public-fundingbook)

```typescript
const book = await client.getFundingBook({
  currency: "USD",
  limit_bids: 10,
  limit_asks: 5,
});
```

- [`getOrderBook`](https://docs.bitfinex.com/v1/reference/rest-public-orderbook)

```typescript
const book = await client.getOrderBook({
  symbol: "BTCUSD",
  limit_bids: 20,
  limit_asks: 10,
  group: 1,
});
```

- [`getTrades`](https://docs.bitfinex.com/v1/reference/rest-public-trades)

```typescript
const trades = await client.getTrades({
  symbol: "BTCUSD",
  timestamp: 1444266681,
  limit_trades: 10,
});
```

- [`getLends`](https://docs.bitfinex.com/v1/reference/rest-public-lends)

```typescript
const lends = await client.getLends({
  currency: "USD",
  timestamp: 1444266681,
  limit_lends: 10,
});
```

- [`getSymbols`](https://docs.bitfinex.com/v1/reference/rest-public-symbols)

```typescript
const symbols = await client.getSymbols();
```

- [`getSymbolDetails`](https://docs.bitfinex.com/v1/reference/rest-public-symbol-details)

```typescript
const details = await client.getSymbolDetails();
```

### AuthenticatedClient

```typescript
import { AuthenticatedClient } from "bitfinex-node-api";

const client = new AuthenticatedClient({
  key: "BitfinexAPIKey",
  secret: "BitfinexAPISecret",
});
```

- [`getAccountInfo`](https://docs.bitfinex.com/v1/reference/rest-auth-account-info)

```typescript
const info = await client.getAccountInfo();
```

- [`getAccountFees`](https://docs.bitfinex.com/v1/reference/rest-auth-fees)

```typescript
const fees = await client.getAccountFees();
```

- [`getSummary`](https://docs.bitfinex.com/v1/reference/rest-auth-summary)

```typescript
const summary = await client.getSummary();
```

- [`getDepositAddress`](https://docs.bitfinex.com/v1/reference/rest-auth-deposit)

```typescript
const address = await client.getDepositAddress({
  method: "bitcoin",
  wallet_name: "trading",
  renew: 1,
});
```

- [`getKeyPermissions`](https://docs.bitfinex.com/v1/reference/auth-key-permissions)

```typescript
const permissions = await client.getKeyPermissions();
```

- [`getMarginInformation`](https://docs.bitfinex.com/v1/reference/rest-auth-margin-information)

```typescript
const margin = await client.getMarginInformation();
```

- [`getWalletBalances`](https://docs.bitfinex.com/v1/reference/rest-auth-wallet-balances)

```typescript
const balances = await client.getWalletBalances();
```

- [`transfer`](https://docs.bitfinex.com/v1/reference/rest-auth-transfer-between-wallets)

```typescript
const result = await client.transfer({
  amount: "1.00954735",
  currency: "BTC",
  walletfrom: "trading",
  walletto: "exchange",
});
```

- [`withdraw`](https://docs.bitfinex.com/v1/reference/rest-auth-withdrawal)

```typescript
const result = await client.withdraw({
  amount: "1.0",
  withdraw_type: "bitcoin",
  address: "1DKwqRhDmVyHJDL4FUYpDmQMYA3Rsxtvur",
  walletselected: "exchange",
});
```

- [`newOrder`](https://docs.bitfinex.com/v1/reference/rest-auth-orders)

```typescript
const order = await client.newOrder({
  amount: "1",
  price: "3",
  type: "limit",
  symbol: "ETCUSD",
  side: "buy",
  is_postonly: true,
});
```

- [`newOrders`](https://docs.bitfinex.com/v1/reference/rest-auth-multiple-new-orders)

```typescript
const result = await client.newOrders({
  orders: [
    {
      amount: "1",
      price: "3",
      type: "limit",
      symbol: "ETCUSD",
      side: "buy",
      is_postonly: true,
    },
    {
      amount: "2",
      price: "2",
      type: "limit",
      symbol: "ETCUSD",
      side: "buy",
    },
  ],
});
```

- [`cancelOrder`](https://docs.bitfinex.com/v1/reference/rest-auth-cancel-order)

```typescript
const order = await client.cancelOrder({ order_id: 446915287 });
```

- [`cancelOrders`](https://docs.bitfinex.com/v1/reference/rest-auth-cancel-multiple-orders)

```typescript
const { result } = await client.cancelOrders({ order_ids: [1, 2] });
```

- [`cancelAllOrders`](https://docs.bitfinex.com/v1/reference/rest-auth-cancel-all-orders)

```typescript
const { result } = await client.cancelAllOrders();
```

- [`replaceOrder`](https://docs.bitfinex.com/v1/reference/rest-auth-replace-order)

```typescript
const order = await client.replaceOrder({
  order_id: 1,
  amount: "3",
  price: "101",
  type: "limit",
  symbol: "ETCUSD",
  side: "sell",
  is_postonly: true,
});
```

- [`getOrder`](https://docs.bitfinex.com/v1/reference/rest-auth-order-status)

```typescript
const order = await client.getOrder({ order_id: 448411153 });
```

- [`getOrders`](https://docs.bitfinex.com/v1/reference/rest-auth-active-orders)

```typescript
const orders = await client.getOrders();
```

- [`getOrderHistory`](https://docs.bitfinex.com/v1/reference/rest-auth-orders-history)

```typescript
const orders = await client.getOrderHistory({ limit: 50 });
```

- [`getPositions`](https://docs.bitfinex.com/v1/reference/rest-auth-active-positions)

```typescript
const positions = await client.getPositions();
```

- [`claimPosition`](https://docs.bitfinex.com/v1/reference/rest-auth-claim-position)

```typescript
const position = await client.claimPosition({
  position_id: 943715,
  amount: "1.0",
});
```

- [`getBalanceHistory`](https://docs.bitfinex.com/v1/reference/rest-auth-balance-history)

```typescript
const history = await client.getBalanceHistory({
  currency: "USD",
  since: "1444277602.0",
});
```

- [`getDepositsWithdrawals`](https://docs.bitfinex.com/v1/reference/rest-auth-deposit-withdrawal-history)

```typescript
const history = await client.getDepositsWithdrawals({
  currency: "BTC",
  since: "1444277602.0",
  limit: 10,
});
```

- [`getPastTrades`](https://docs.bitfinex.com/v1/reference/rest-auth-past-trades)

```typescript
const trades = await client.getPastTrades({
  symbol: "BTCEUR",
  limit_trades: 25,
  reverse: 1,
});
```

- [`newOffer`](https://docs.bitfinex.com/v1/reference/rest-auth-new-offer)

```typescript
const offer = await client.newOffer({
  currency: "USD",
  amount: "50.0",
  rate: "20.0",
  period: 2,
  direction: "lend",
});
```

- [`cancelOffer`](https://docs.bitfinex.com/v1/reference/rest-auth-cancel-offer)

```typescript
const offer = await client.cancelOffer({ offer_id: 13800585 });
```

- [`offerStatus`](https://docs.bitfinex.com/v1/reference/rest-auth-offer-status)

```typescript
const offer = await client.offerStatus({ offer_id: 13800585 });
```

- [`activeCredits`](https://docs.bitfinex.com/v1/reference/rest-auth-active-credits)

```typescript
const credits = await client.activeCredits();
```

- [`getOffers`](https://docs.bitfinex.com/v1/reference/rest-auth-offers)

```typescript
const offers = await client.getOffers();
```

- [`offersHistory`](https://docs.bitfinex.com/v1/reference/rest-auth-offers-hist)

```typescript
const offers = await client.offersHistory({ limit: 25 });
```

- [`getFundingTrades`](https://docs.bitfinex.com/v1/reference/rest-auth-mytrades-funding)

```typescript
const trades = await client.getFundingTrades({
  symbol: "USD",
  limit_trades: 1,
  until: "1444141858.0",
});
```

- [`getTakenFunds`](https://docs.bitfinex.com/v1/reference/rest-auth-active-funding-used-in-a-margin-position)

```typescript
const funds = await client.getTakenFunds();
```

- [`getUnusedFunds`](https://docs.bitfinex.com/v1/reference/rest-auth-active-funding-not-used-in-a-margin-position)

```typescript
const funds = await client.getUnusedFunds();
```

- [`getTotalFunds`](https://docs.bitfinex.com/v1/reference/rest-auth-total-taken-funds)

```typescript
const funds = await client.getTotalFunds();
```

- [`closeFunding`](https://docs.bitfinex.com/v1/reference/rest-auth-close-margin-funding)

```typescript
const funding = await client.closeFunding({ swap_id: 11576737 });
```

- [`closePosition`](https://docs.bitfinex.com/v1/reference/close-position)

```typescript
const response = await client.closePosition({ position_id: 943715 });
```

### WebSocketClient

The [v1 WebSocket](https://docs.bitfinex.com/v1/docs/ws-general) endpoint
(`wss://api.bitfinex.com/ws/1`). Raw array frames are parsed into typed
objects with named fields. Every channel message carries `channel_id` and
`type` so consumers can discriminate without parsing positional arrays.

```typescript
import { WebSocketClient } from "bitfinex-node-api";

const ws = new WebSocketClient({
  key: "BitfinexAPIKey", // optional, only required for `auth`
  secret: "BitfinexAPISecret", // optional, only required for `auth`
});

ws.on("message", (message) => {
  console.log(message);
});

await ws.connect();
```

- `connect` / `disconnect`

```typescript
await ws.connect();
await ws.disconnect();
```

- `ping` — [docs](https://docs.bitfinex.com/v1/docs/ws-general#ping-pong)

```typescript
const pong = await ws.ping();
```

- [`subscribeTicker`](https://docs.bitfinex.com/v1/reference/ws-public-ticker) —
  push every ticker update for a pair.

```typescript
const subscription = await ws.subscribeTicker({ pair: "BTCUSD" });
// Incoming `message` payload:
// {
//   channel_id: 56771,
//   type: "ticker",
//   bid: 76892,
//   bid_size: 5.80585799,
//   ask: 76926,
//   ask_size: 7.03177505,
//   daily_change: 810,
//   daily_change_perc: 0.01064893,
//   last_price: 76874,
//   volume: 1438.81140233,
//   high: 76984,
//   low: 74027,
// }
```

- [`subscribeTrades`](https://docs.bitfinex.com/v1/reference/ws-public-trades) —
  pushes one initial snapshot of recent trades, then `trade_executed` (`te`)
  and `trade_updated` (`tu`) live events.

```typescript
const subscription = await ws.subscribeTrades({ pair: "BTCUSD" });
// Snapshot:
// { channel_id, type: "trades_snapshot", trades: [{ id, timestamp, price, amount }, ...] }
// Live update:
// { channel_id, type: "trade_executed", seq, timestamp, price, amount }
// { channel_id, type: "trade_updated", seq, id, timestamp, price, amount }
```

- [`subscribeBook`](https://docs.bitfinex.com/v1/reference/ws-public-order-books) —
  aggregated order book (`prec` ∈ `P0`–`P3`).

```typescript
const subscription = await ws.subscribeBook({
  pair: "BTCUSD",
  prec: "P0",
  freq: "F0",
  len: 25,
});
// Snapshot:
// { channel_id, type: "book_snapshot", book: [{ price, count, amount }, ...] }
// Update:
// { channel_id, type: "book_update", price, count, amount }
```

- [`subscribeRawBook`](https://docs.bitfinex.com/v1/reference/ws-public-raw-order-books) —
  raw order book at order-id granularity (`prec = R0`).

```typescript
const subscription = await ws.subscribeRawBook({ pair: "BTCUSD", len: 100 });
// Snapshot:
// { channel_id, type: "raw_book_snapshot", book: [{ order_id, price, amount }, ...] }
// Update:
// { channel_id, type: "raw_book_update", order_id, price, amount }
```

- [Heartbeats](https://docs.bitfinex.com/v1/docs/ws-general#heartbeating) are
  emitted on any channel that has not pushed data for a second:

```typescript
// { channel_id, type: "heartbeat" }
```

- `unsubscribe`

```typescript
await ws.unsubscribe({ chanId: subscription.chanId });
```

- [`auth`](https://docs.bitfinex.com/v1/reference/ws-auth-authentication) —
  authenticate to receive private channels. v1 accepts only the documented
  five fields (`event`, `apiKey`, `authSig`, `authNonce`, `authPayload`);
  the v2 extensions `filter`/`dms`/`calc` are not supported.

```typescript
const response = await ws.auth();
```

Once authenticated the server pushes private events on channel id `0`. This
client decodes [wallet snapshots and
updates](https://docs.bitfinex.com/v1/reference/ws-auth-wallets):

```typescript
// { channel_id: 0, type: "wallet_snapshot",
//   wallets: [{ wallet_type, currency, balance, unsettled_interest, balance_available }, ...] }
// { channel_id: 0, type: "wallet_update",
//   wallet_type, currency, balance, unsettled_interest, balance_available }
```

Every other private message comes through as a generic envelope with the v1
mnemonic carried in `type` and the raw payload preserved:

```typescript
// { channel_id: 0, type: "os" | "on" | "ou" | "oc" | ..., payload: [...] }
```

Refer to the official docs to interpret each payload:

| `type`                  | Reference                                                                       |
| ----------------------- | ------------------------------------------------------------------------------- |
| `os`/`on`/`ou`/`oc`     | [Orders](https://docs.bitfinex.com/v1/reference/ws-auth-orders)                 |
| `ps`/`pn`/`pu`/`pc`     | [Positions](https://docs.bitfinex.com/v1/reference/ws-auth-positions)           |
| `te`/`tu`               | [Trades](https://docs.bitfinex.com/v1/reference/ws-auth-trades)                 |
| `fos`/`fon`/`fou`/`foc` | [Funding offers](https://docs.bitfinex.com/v1/reference/ws-auth-offers)         |
| `fcs`/`fcn`/`fcu`/`fcc` | [Funding credits](https://docs.bitfinex.com/v1/reference/ws-auth-credits)       |
| `fls`/`fln`/`flu`/`flc` | [Funding loans](https://docs.bitfinex.com/v1/reference/ws-auth-loans)           |
| `fte`/`ftu`             | [Funding trades](https://docs.bitfinex.com/v1/reference/ws-auth-funding-trades) |
| `bu`                    | [Balance info](https://docs.bitfinex.com/v1/reference/ws-auth-balance-info)     |
| `miu`                   | [Margin info](https://docs.bitfinex.com/v1/reference/ws-auth-margin-info)       |
| `fiu`                   | [Funding info](https://docs.bitfinex.com/v1/reference/ws-auth-funding-info)     |
| `n`                     | [Notifications](https://docs.bitfinex.com/v1/reference/ws-auth-notifications)   |

- [`unauth`](https://docs.bitfinex.com/v1/reference/ws-auth-unauthentication) —
  drop the authenticated session without closing the socket. Failure comes
  back as `{event: "error", code: 10201, ...}` and is surfaced as a rejection.

```typescript
await ws.unauth();
```

- `send` — send any raw payload to the server.

```typescript
await ws.send({ event: "ping" });
```

#### Aborting requests

Every method that returns a promise accepts an `AbortSignal`:

```typescript
const controller = new AbortController();
setTimeout(() => {
  controller.abort();
}, 1000);
const sub = await ws.subscribeTicker({ signal: controller.signal });
```

### Signature

```typescript
import { signature } from "bitfinex-node-api";

const headers = signature({
  key: "BitfinexAPIKey",
  secret: "BitfinexAPISecret",
  payload: Buffer.from(JSON.stringify({ request, nonce })).toString("base64"),
});
```

## Test

```bash
npm test
```
