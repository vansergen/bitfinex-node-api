/**
 * Live smoke-test for the Bitfinex v1 public REST endpoints.
 *
 * Usage:
 *   npx tsx examples/check-rest.ts
 *
 * Optional env vars:
 *   BFX_SYMBOL    Trading symbol (default: BTCUSD)
 *   BFX_CURRENCY  Funding currency (default: USD)
 */
import { PublicClient } from "../index.js";

const symbol = process.env.BFX_SYMBOL ?? "BTCUSD";
const currency = process.env.BFX_CURRENCY ?? "USD";

interface ICheck {
  name: string;
  ok: boolean;
  detail: string;
}

const results: ICheck[] = [];

function record(name: string, ok: boolean, detail = ""): void {
  results.push({ name, ok, detail });
  const tag = ok ? "✓" : "✗";
  console.log(`  ${tag} ${name}${detail ? ` — ${detail}` : ""}`);
}

function isNumStr(value: unknown): boolean {
  return typeof value === "string" && Number.isFinite(Number(value));
}

function isNum(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function preview(value: unknown): string {
  return JSON.stringify(value).slice(0, 120);
}

const client = new PublicClient({ symbol, currency });

async function checkTicker(): Promise<void> {
  console.log(`\n[GET /pubticker/${symbol}]`);
  try {
    const t = await client.getTicker();
    const ok =
      isNumStr(t.mid) &&
      isNumStr(t.bid) &&
      isNumStr(t.ask) &&
      isNumStr(t.last_price) &&
      isNumStr(t.low) &&
      isNumStr(t.high) &&
      isNumStr(t.volume) &&
      isNumStr(t.timestamp);
    record(
      "ITicker shape",
      ok,
      ok ? `bid=${t.bid}, ask=${t.ask}, last=${t.last_price}` : preview(t),
    );
  } catch (error) {
    record("ITicker shape", false, (error as Error).message);
  }
}

async function checkStats(): Promise<void> {
  console.log(`\n[GET /stats/${symbol}]`);
  try {
    const stats = await client.getStats();
    const ok =
      Array.isArray(stats) &&
      stats.length > 0 &&
      stats.every((s) => isNum(s.period) && isNumStr(s.volume));
    record(
      "IStat[] shape",
      ok,
      ok
        ? `${stats.length} periods: ${stats.map((s) => `${s.period}d=${s.volume}`).join(", ")}`
        : preview(stats),
    );
  } catch (error) {
    record("IStat[] shape", false, (error as Error).message);
  }
}

async function checkFundingBook(): Promise<void> {
  console.log(`\n[GET /lendbook/${currency}]`);
  try {
    const book = await client.getFundingBook({ limit_bids: 5, limit_asks: 5 });
    const validRow = (r: {
      rate: string;
      amount: string;
      period: number;
      timestamp: string;
      frr: string;
    }): boolean =>
      isNumStr(r.rate) &&
      isNumStr(r.amount) &&
      isNum(r.period) &&
      isNumStr(r.timestamp) &&
      (r.frr === "Yes" || r.frr === "No");
    const ok =
      Array.isArray(book.bids) &&
      Array.isArray(book.asks) &&
      book.bids.every(validRow) &&
      book.asks.every(validRow);
    record(
      "IFundingBook shape",
      ok,
      ok ? `${book.bids.length} bids, ${book.asks.length} asks` : preview(book),
    );
  } catch (error) {
    record("IFundingBook shape", false, (error as Error).message);
  }
}

async function checkOrderBook(): Promise<void> {
  console.log(`\n[GET /book/${symbol}]`);
  try {
    const book = await client.getOrderBook({ limit_bids: 5, limit_asks: 5 });
    const validRow = (r: {
      price: string;
      amount: string;
      timestamp: string;
    }): boolean =>
      isNumStr(r.price) && isNumStr(r.amount) && isNumStr(r.timestamp);
    const ok =
      Array.isArray(book.bids) &&
      Array.isArray(book.asks) &&
      book.bids.length > 0 &&
      book.asks.length > 0 &&
      book.bids.every(validRow) &&
      book.asks.every(validRow);
    record(
      "IOrderBook shape",
      ok,
      ok
        ? `${book.bids.length} bids (best=${book.bids[0]!.price}), ${book.asks.length} asks (best=${book.asks[0]!.price})`
        : preview(book),
    );
    if (ok) {
      const bestBid = Number(book.bids[0]!.price);
      const bestAsk = Number(book.asks[0]!.price);
      record(
        "best bid < best ask (uncrossed book)",
        bestBid < bestAsk,
        `bid=${bestBid}, ask=${bestAsk}, spread=${(bestAsk - bestBid).toFixed(2)}`,
      );
      const bidsDescending = book.bids.every(
        (b, i) => i === 0 || Number(book.bids[i - 1]!.price) >= Number(b.price),
      );
      const asksAscending = book.asks.every(
        (a, i) => i === 0 || Number(book.asks[i - 1]!.price) <= Number(a.price),
      );
      record(
        "bids sorted descending, asks ascending",
        bidsDescending && asksAscending,
        `bidsDesc=${bidsDescending}, asksAsc=${asksAscending}`,
      );
    }
  } catch (error) {
    record("IOrderBook shape", false, (error as Error).message);
  }
}

async function checkTrades(): Promise<void> {
  console.log(`\n[GET /trades/${symbol}]`);
  const limit_trades = 5;
  try {
    const trades = await client.getTrades({ limit_trades });
    const ok =
      Array.isArray(trades) &&
      trades.length > 0 &&
      trades.every(
        (t) =>
          isNum(t.timestamp) &&
          isNum(t.tid) &&
          isNumStr(t.price) &&
          isNumStr(t.amount) &&
          t.exchange === "bitfinex" &&
          (t.type === "buy" || t.type === "sell"),
      );
    record(
      "ITrade[] shape",
      ok,
      ok
        ? `${trades.length} trades, last tid=${trades[0]!.tid} @ ${trades[0]!.price}`
        : preview(trades),
    );
    record(
      "limit_trades respected (length <= 5)",
      trades.length <= limit_trades,
      `got ${trades.length}`,
    );
    const newestFirst = trades.every(
      (t, i) => i === 0 || trades[i - 1]!.timestamp >= t.timestamp,
    );
    record(
      "trades sorted newest-first",
      newestFirst,
      `tids: ${trades.map((t) => t.tid).join(", ")}`,
    );
  } catch (error) {
    record("ITrade[] shape", false, (error as Error).message);
  }
}

async function checkLends(): Promise<void> {
  console.log(`\n[GET /lends/${currency}]`);
  try {
    const lends = await client.getLends({ limit_lends: 5 });
    const ok =
      Array.isArray(lends) &&
      lends.length > 0 &&
      lends.every(
        (l) =>
          isNumStr(l.rate) &&
          isNumStr(l.amount_lent) &&
          isNumStr(l.amount_used) &&
          isNum(l.timestamp),
      );
    record(
      "ILend[] shape",
      ok,
      ok
        ? `${lends.length} rows, latest rate=${lends[0]!.rate}`
        : preview(lends),
    );
  } catch (error) {
    record("ILend[] shape", false, (error as Error).message);
  }
}

async function checkSymbols(): Promise<void> {
  console.log("\n[GET /symbols]");
  try {
    const symbols = await client.getSymbols();
    const ok =
      Array.isArray(symbols) &&
      symbols.length > 0 &&
      symbols.every((s) => typeof s === "string" && s.length > 0);
    const includesBtcusd = symbols.includes("btcusd");
    record(
      "string[] shape",
      ok,
      ok ? `${symbols.length} symbols` : preview(symbols),
    );
    record(
      'list contains "btcusd"',
      includesBtcusd,
      includesBtcusd ? "ok" : "btcusd missing",
    );
  } catch (error) {
    record("string[] shape", false, (error as Error).message);
  }
}

async function checkSymbolDetails(): Promise<void> {
  console.log("\n[GET /symbols_details]");
  try {
    const details = await client.getSymbolDetails();
    const ok =
      Array.isArray(details) &&
      details.length > 0 &&
      details.every(
        (d) =>
          typeof d.pair === "string" &&
          isNum(d.price_precision) &&
          isNumStr(d.initial_margin) &&
          isNumStr(d.minimum_margin) &&
          isNumStr(d.maximum_order_size) &&
          isNumStr(d.minimum_order_size) &&
          typeof d.expiration === "string" &&
          typeof d.margin === "boolean",
      );
    const btc = details.find((d) => d.pair === "btcusd");
    record(
      "ISymbolDetail[] shape",
      ok,
      ok ? `${details.length} pairs` : preview(details),
    );
    record(
      "btcusd entry present and parsed",
      typeof btc !== "undefined" &&
        isNum(btc.price_precision) &&
        isNumStr(btc.minimum_order_size),
      btc
        ? `precision=${btc.price_precision}, min_order=${btc.minimum_order_size}`
        : "btcusd missing",
    );
  } catch (error) {
    record("ISymbolDetail[] shape", false, (error as Error).message);
  }
}

async function checkDefaults(): Promise<void> {
  console.log("\n[client defaults]");
  record(
    "base_url is v1",
    client.base_url.toString() === "https://api.bitfinex.com/v1/",
    client.base_url.toString(),
  );
  record("symbol default", client.symbol === symbol, `symbol=${client.symbol}`);
  record(
    "currency default",
    client.currency === currency,
    `currency=${client.currency}`,
  );
}

async function checkCustomSymbolOverride(): Promise<void> {
  console.log("\n[per-call symbol override]");
  try {
    const ticker = await client.getTicker({ symbol: "ETHUSD" });
    const ok =
      isNumStr(ticker.bid) &&
      isNumStr(ticker.ask) &&
      isNumStr(ticker.last_price);
    record(
      "getTicker({symbol: 'ETHUSD'}) returns ETHUSD",
      ok,
      ok ? `bid=${ticker.bid}, ask=${ticker.ask}` : preview(ticker),
    );
    // Default client.symbol must remain BTCUSD (per-call did not mutate).
    record(
      "per-call override does not mutate client.symbol",
      client.symbol === symbol,
      `client.symbol=${client.symbol}`,
    );
  } catch (error) {
    record(
      "getTicker({symbol: 'ETHUSD'}) returns ETHUSD",
      false,
      (error as Error).message,
    );
  }
}

async function checkErrorFor404(): Promise<void> {
  console.log("\n[GET /pubticker/INVALIDPAIR (negative test)]");
  try {
    await client.getTicker({ symbol: "NOTAPAIR" });
    record("rejects on invalid symbol", false, "request resolved unexpectedly");
  } catch (error) {
    record(
      "rejects on invalid symbol",
      true,
      (error as Error).message.slice(0, 80),
    );
  }
}

async function main(): Promise<void> {
  console.log("Hitting https://api.bitfinex.com/v1/ ...");
  await checkDefaults();
  await checkTicker();
  await checkStats();
  await checkFundingBook();
  await checkOrderBook();
  await checkTrades();
  await checkLends();
  await checkSymbols();
  await checkSymbolDetails();
  await checkCustomSymbolOverride();
  await checkErrorFor404();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n=== ${results.length - failed.length}/${results.length} checks passed ===`,
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error("Fatal:", (error as Error).message);
  process.exit(1);
});
