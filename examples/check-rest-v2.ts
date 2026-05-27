/**
 * Live smoke-test for the Bitfinex v2 public REST endpoints.
 *
 * Usage:
 *   npx tsx examples/check-rest-v2.ts
 *
 * Optional env vars:
 *   BFX_V2_SYMBOL          Trading symbol (default: tBTCUSD)
 *   BFX_V2_FUNDING_SYMBOL  Funding symbol (default: fUSD)
 *   BFX_V2_DERIV_KEY       Derivatives key (default: tBTCF0:USTF0)
 */
import {
  ApiUrlV2,
  type IAggregatedBookEntry,
  type IAggregatedFundingBookEntry,
  type IBookEntryV2,
  type ICandleV2,
  type IDerivativeStatus,
  type IFundingStat,
  type IFundingTickerV2,
  type IFundingTradeV2,
  type ILeaderboardEntry,
  type ILiquidation,
  type IRawBookEntry,
  type IRawFundingBookEntry,
  type IStatV2,
  type ITickerV2,
  type ITradeV2,
  type ITradingTickerV2,
  type ITradingTradeV2,
  PublicClientV2,
} from "../index.js";

const symbol = process.env.BFX_V2_SYMBOL ?? "tBTCUSD";
const fundingSymbol = process.env.BFX_V2_FUNDING_SYMBOL ?? "fUSD";
const derivKey = process.env.BFX_V2_DERIV_KEY ?? "tBTCF0:USTF0";

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

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNum(value: unknown): boolean {
  return value === null || isNum(value);
}

function isStr(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableStr(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function preview(value: unknown): string {
  return JSON.stringify(value).slice(0, 160);
}

function isTradingTicker(t: ITickerV2): t is ITradingTickerV2 {
  return t.type === "trading_ticker";
}

function isFundingTicker(t: ITickerV2): t is IFundingTickerV2 {
  return t.type === "funding_ticker";
}

function isTradingTrade(t: ITradeV2): t is ITradingTradeV2 {
  return t.type === "trading_trade";
}

function isFundingTrade(t: ITradeV2): t is IFundingTradeV2 {
  return t.type === "funding_trade";
}

function isAggregatedBook(e: IBookEntryV2): e is IAggregatedBookEntry {
  return e.type === "book";
}

function isRawBook(e: IBookEntryV2): e is IRawBookEntry {
  return e.type === "raw_book";
}

function isAggregatedFundingBook(
  e: IBookEntryV2,
): e is IAggregatedFundingBookEntry {
  return e.type === "funding_book";
}

function isRawFundingBook(e: IBookEntryV2): e is IRawFundingBookEntry {
  return e.type === "raw_funding_book";
}

const client = new PublicClientV2({ symbol });

async function checkDefaults(): Promise<void> {
  console.log("\n[client defaults]");
  record(
    "base_url is v2",
    client.base_url.toString() === ApiUrlV2,
    client.base_url.toString(),
  );
  record("symbol default", client.symbol === symbol, `symbol=${client.symbol}`);
}

async function checkPlatformStatus(): Promise<void> {
  console.log("\n[GET /platform/status]");
  try {
    const status = await client.getPlatformStatus();
    const ok = status.status === 0 || status.status === 1;
    record(
      "IPlatformStatus shape",
      ok,
      ok ? `status=${status.status}` : preview(status),
    );
    record(
      "platform is operative",
      status.status === 1,
      `status=${status.status}`,
    );
  } catch (error) {
    record("IPlatformStatus shape", false, (error as Error).message);
  }
}

async function checkTickerTrading(): Promise<void> {
  console.log(`\n[GET /ticker/${symbol}]`);
  try {
    const ticker = await client.getTicker();
    if (!isTradingTicker(ticker)) {
      record(
        "ITradingTickerV2 shape",
        false,
        `expected trading_ticker, got ${ticker.type}`,
      );
      return;
    }
    const ok =
      isNum(ticker.bid) &&
      isNum(ticker.bid_size) &&
      isNum(ticker.ask) &&
      isNum(ticker.ask_size) &&
      isNum(ticker.daily_change) &&
      isNum(ticker.daily_change_relative) &&
      isNum(ticker.last_price) &&
      isNum(ticker.volume) &&
      isNum(ticker.high) &&
      isNum(ticker.low);
    record(
      "ITradingTickerV2 shape",
      ok,
      ok
        ? `bid=${ticker.bid} ask=${ticker.ask} last=${ticker.last_price}`
        : preview(ticker),
    );
    if (ok) {
      record(
        "best bid < best ask",
        ticker.bid < ticker.ask,
        `spread=${(ticker.ask - ticker.bid).toFixed(2)}`,
      );
    }
  } catch (error) {
    record("ITradingTickerV2 shape", false, (error as Error).message);
  }
}

async function checkTickerFunding(): Promise<void> {
  console.log(`\n[GET /ticker/${fundingSymbol}]`);
  try {
    const ticker = await client.getTicker({ symbol: fundingSymbol });
    if (!isFundingTicker(ticker)) {
      record(
        "IFundingTickerV2 shape",
        false,
        `expected funding_ticker, got ${ticker.type}`,
      );
      return;
    }
    const ok =
      isNum(ticker.frr) &&
      isNum(ticker.bid) &&
      isNum(ticker.bid_period) &&
      isNum(ticker.bid_size) &&
      isNum(ticker.ask) &&
      isNum(ticker.ask_period) &&
      isNum(ticker.ask_size) &&
      isNum(ticker.daily_change) &&
      isNum(ticker.daily_change_relative) &&
      isNum(ticker.last_price) &&
      isNum(ticker.volume) &&
      isNum(ticker.high) &&
      isNum(ticker.low) &&
      isNum(ticker.frr_amount_available);
    record(
      "IFundingTickerV2 shape",
      ok,
      ok
        ? `frr=${ticker.frr} bid=${ticker.bid} ask=${ticker.ask}`
        : preview(ticker),
    );
  } catch (error) {
    record("IFundingTickerV2 shape", false, (error as Error).message);
  }
}

async function checkTickers(): Promise<void> {
  console.log("\n[GET /tickers?symbols=...]");
  try {
    const tickers = await client.getTickers({
      symbols: [symbol, fundingSymbol],
    });
    const ok = Array.isArray(tickers) && tickers.length === 2;
    record(
      "ITickerV2[] shape",
      ok,
      ok ? `${tickers.length} tickers` : preview(tickers),
    );
    const trading = tickers.find(isTradingTicker);
    const funding = tickers.find(isFundingTicker);
    record(
      "trading ticker discriminated",
      typeof trading !== "undefined" && trading.symbol === symbol,
      trading ? `symbol=${trading.symbol}` : "missing",
    );
    record(
      "funding ticker discriminated",
      typeof funding !== "undefined" && funding.symbol === fundingSymbol,
      funding ? `symbol=${funding.symbol}` : "missing",
    );
  } catch (error) {
    record("ITickerV2[] shape", false, (error as Error).message);
  }
}

async function checkTickersHistory(): Promise<void> {
  console.log("\n[GET /tickers/hist]");
  try {
    const history = await client.getTickersHistory({
      symbols: [symbol],
      limit: 5,
    });
    const ok =
      Array.isArray(history) &&
      history.length > 0 &&
      history.every(
        (h) => isStr(h.symbol) && isNum(h.bid) && isNum(h.ask) && isNum(h.mts),
      );
    record(
      "ITickerHistoryV2[] shape",
      ok,
      ok
        ? `${history.length} rows, latest mts=${history[0]!.mts}`
        : preview(history),
    );
    if (ok) {
      const descending = history.every(
        (h, i) => i === 0 || history[i - 1]!.mts >= h.mts,
      );
      record(
        "history sorted newest-first",
        descending,
        `mts: ${history.map((h) => h.mts).join(", ")}`,
      );
    }
  } catch (error) {
    record("ITickerHistoryV2[] shape", false, (error as Error).message);
  }
}

async function checkTradesTrading(): Promise<void> {
  console.log(`\n[GET /trades/${symbol}/hist]`);
  const limit = 5;
  try {
    const trades = await client.getTrades({ symbol, limit });
    const ok =
      Array.isArray(trades) &&
      trades.length > 0 &&
      trades.every(
        (t) =>
          isTradingTrade(t) &&
          isNum(t.id) &&
          isNum(t.mts) &&
          isNum(t.amount) &&
          isNum(t.price),
      );
    record(
      "ITradingTradeV2[] shape",
      ok,
      ok
        ? `${trades.length} trades, last id=${trades[0]!.id} @ ${(trades[0] as ITradingTradeV2).price}`
        : preview(trades),
    );
    record(
      "limit respected (length <= 5)",
      trades.length <= limit,
      `got ${trades.length}`,
    );
    const newestFirst = trades.every(
      (t, i) => i === 0 || trades[i - 1]!.mts >= t.mts,
    );
    record(
      "trades sorted newest-first",
      newestFirst,
      `ids: ${trades.map((t) => t.id).join(", ")}`,
    );
  } catch (error) {
    record("ITradingTradeV2[] shape", false, (error as Error).message);
  }
}

async function checkTradesFunding(): Promise<void> {
  console.log(`\n[GET /trades/${fundingSymbol}/hist]`);
  try {
    const trades = await client.getTrades({
      symbol: fundingSymbol,
      limit: 5,
    });
    const ok =
      Array.isArray(trades) &&
      trades.length > 0 &&
      trades.every(
        (t) =>
          isFundingTrade(t) &&
          isNum(t.id) &&
          isNum(t.mts) &&
          isNum(t.amount) &&
          isNum(t.rate) &&
          isNum(t.period),
      );
    record(
      "IFundingTradeV2[] shape",
      ok,
      ok
        ? `${trades.length} trades, last id=${trades[0]!.id} @ rate=${(trades[0] as IFundingTradeV2).rate}`
        : preview(trades),
    );
  } catch (error) {
    record("IFundingTradeV2[] shape", false, (error as Error).message);
  }
}

async function checkBookAggregatedTrading(): Promise<void> {
  console.log(`\n[GET /book/${symbol}/P0]`);
  try {
    const book = await client.getBook({ symbol, precision: "P0", len: 25 });
    const ok =
      Array.isArray(book) &&
      book.length > 0 &&
      book.every(
        (e) =>
          isAggregatedBook(e) &&
          isNum(e.price) &&
          isNum(e.count) &&
          isNum(e.amount),
      );
    record(
      "IAggregatedBookEntry[] shape",
      ok,
      ok ? `${book.length} levels` : preview(book),
    );
    if (ok) {
      const bids = book.filter(
        (e): e is IAggregatedBookEntry => isAggregatedBook(e) && e.amount > 0,
      );
      const asks = book.filter(
        (e): e is IAggregatedBookEntry => isAggregatedBook(e) && e.amount < 0,
      );
      record(
        "book contains both bids and asks",
        bids.length > 0 && asks.length > 0,
        `bids=${bids.length}, asks=${asks.length}`,
      );
      if (bids.length > 0 && asks.length > 0) {
        const bestBid = Math.max(...bids.map((b) => b.price));
        const bestAsk = Math.min(...asks.map((a) => a.price));
        record(
          "best bid < best ask (uncrossed book)",
          bestBid < bestAsk,
          `bid=${bestBid}, ask=${bestAsk}`,
        );
      }
    }
  } catch (error) {
    record("IAggregatedBookEntry[] shape", false, (error as Error).message);
  }
}

async function checkBookRawTrading(): Promise<void> {
  console.log(`\n[GET /book/${symbol}/R0]`);
  try {
    const book = await client.getBook({ symbol, precision: "R0", len: 25 });
    const ok =
      Array.isArray(book) &&
      book.length > 0 &&
      book.every(
        (e) =>
          isRawBook(e) &&
          isNum(e.order_id) &&
          isNum(e.price) &&
          isNum(e.amount),
      );
    record(
      "IRawBookEntry[] shape",
      ok,
      ok ? `${book.length} orders` : preview(book),
    );
  } catch (error) {
    record("IRawBookEntry[] shape", false, (error as Error).message);
  }
}

async function checkBookAggregatedFunding(): Promise<void> {
  console.log(`\n[GET /book/${fundingSymbol}/P0]`);
  try {
    const book = await client.getBook({
      symbol: fundingSymbol,
      precision: "P0",
      len: 25,
    });
    const ok =
      Array.isArray(book) &&
      book.length > 0 &&
      book.every(
        (e) =>
          isAggregatedFundingBook(e) &&
          isNum(e.rate) &&
          isNum(e.period) &&
          isNum(e.count) &&
          isNum(e.amount),
      );
    record(
      "IAggregatedFundingBookEntry[] shape",
      ok,
      ok ? `${book.length} levels` : preview(book),
    );
  } catch (error) {
    record(
      "IAggregatedFundingBookEntry[] shape",
      false,
      (error as Error).message,
    );
  }
}

async function checkBookRawFunding(): Promise<void> {
  console.log(`\n[GET /book/${fundingSymbol}/R0]`);
  try {
    const book = await client.getBook({
      symbol: fundingSymbol,
      precision: "R0",
      len: 25,
    });
    const ok =
      Array.isArray(book) &&
      book.length > 0 &&
      book.every(
        (e) =>
          isRawFundingBook(e) &&
          isNum(e.offer_id) &&
          isNum(e.period) &&
          isNum(e.rate) &&
          isNum(e.amount),
      );
    record(
      "IRawFundingBookEntry[] shape",
      ok,
      ok ? `${book.length} offers` : preview(book),
    );
  } catch (error) {
    record("IRawFundingBookEntry[] shape", false, (error as Error).message);
  }
}

async function checkStatsLast(): Promise<void> {
  console.log("\n[GET /stats1/pos.size:1m:tBTCUSD:long/last]");
  try {
    const stat = (await client.getStats({
      key: "pos.size",
      size: "1m",
      symbol,
      side: "long",
      section: "last",
    })) as IStatV2;
    const ok = isNum(stat.mts) && isNum(stat.value);
    record(
      "IStatV2 shape (last)",
      ok,
      ok ? `mts=${stat.mts} value=${stat.value}` : preview(stat),
    );
  } catch (error) {
    record("IStatV2 shape (last)", false, (error as Error).message);
  }
}

async function checkStatsHist(): Promise<void> {
  console.log("\n[GET /stats1/funding.size:1m:fUSD/hist]");
  try {
    const stats = (await client.getStats({
      key: "funding.size",
      size: "1m",
      symbol: fundingSymbol,
      section: "hist",
      limit: 5,
    })) as IStatV2[];
    const ok =
      Array.isArray(stats) &&
      stats.length > 0 &&
      stats.every((s) => isNum(s.mts) && isNum(s.value));
    record(
      "IStatV2[] shape (hist)",
      ok,
      ok ? `${stats.length} rows, latest=${stats[0]!.value}` : preview(stats),
    );
  } catch (error) {
    record("IStatV2[] shape (hist)", false, (error as Error).message);
  }
}

async function checkStatsCreditsSym(): Promise<void> {
  console.log(
    `\n[GET /stats1/credits.size.sym:1m:${fundingSymbol}:${symbol}/hist]`,
  );
  try {
    const stats = (await client.getStats({
      key: "credits.size.sym",
      size: "1m",
      symbol: fundingSymbol,
      pair: symbol,
      section: "hist",
      limit: 5,
    })) as IStatV2[];
    const ok =
      Array.isArray(stats) &&
      stats.length > 0 &&
      stats.every((s) => isNum(s.mts) && isNum(s.value));
    record(
      "IStatV2[] credits.size.sym shape",
      ok,
      ok ? `${stats.length} rows, latest=${stats[0]!.value}` : preview(stats),
    );
  } catch (error) {
    record("IStatV2[] credits.size.sym shape", false, (error as Error).message);
  }
}

async function checkCandlesLast(): Promise<void> {
  console.log("\n[GET /candles/trade:1D:tBTCUSD/last]");
  try {
    const candle = (await client.getCandles({
      timeframe: "1D",
      symbol,
      section: "last",
    })) as ICandleV2;
    const ok =
      isNum(candle.mts) &&
      isNum(candle.open) &&
      isNum(candle.close) &&
      isNum(candle.high) &&
      isNum(candle.low) &&
      isNum(candle.volume);
    record(
      "ICandleV2 shape (last)",
      ok,
      ok
        ? `o=${candle.open} c=${candle.close} h=${candle.high} l=${candle.low}`
        : preview(candle),
    );
    if (ok) {
      record(
        "high >= max(open, close), low <= min(open, close)",
        candle.high >= Math.max(candle.open, candle.close) &&
          candle.low <= Math.min(candle.open, candle.close),
        `h=${candle.high} l=${candle.low}`,
      );
    }
  } catch (error) {
    record("ICandleV2 shape (last)", false, (error as Error).message);
  }
}

async function checkCandlesHist(): Promise<void> {
  console.log("\n[GET /candles/trade:1m:tBTCUSD/hist]");
  try {
    const candles = (await client.getCandles({
      timeframe: "1m",
      symbol,
      section: "hist",
      limit: 10,
    })) as ICandleV2[];
    const ok =
      Array.isArray(candles) &&
      candles.length > 0 &&
      candles.every(
        (c) =>
          isNum(c.mts) &&
          isNum(c.open) &&
          isNum(c.close) &&
          isNum(c.high) &&
          isNum(c.low) &&
          isNum(c.volume),
      );
    record(
      "ICandleV2[] shape (hist)",
      ok,
      ok ? `${candles.length} candles` : preview(candles),
    );
  } catch (error) {
    record("ICandleV2[] shape (hist)", false, (error as Error).message);
  }
}

async function checkConfigs(): Promise<void> {
  console.log("\n[GET /conf/pub:list:currency]");
  try {
    const configs = await client.getConfigs({ configs: "pub:list:currency" });
    const ok =
      Array.isArray(configs) &&
      configs.length === 1 &&
      Array.isArray(configs[0]) &&
      (configs[0] as unknown[]).length > 0;
    record(
      "pub:list:currency shape",
      ok,
      ok ? `${(configs[0] as unknown[]).length} currencies` : preview(configs),
    );
  } catch (error) {
    record("pub:list:currency shape", false, (error as Error).message);
  }
}

async function checkConfigsMultiple(): Promise<void> {
  console.log("\n[GET /conf/pub:list:currency,pub:list:pair:exchange]");
  try {
    const configs = await client.getConfigs({
      configs: ["pub:list:currency", "pub:list:pair:exchange"],
    });
    const ok =
      Array.isArray(configs) &&
      configs.length === 2 &&
      Array.isArray(configs[0]) &&
      Array.isArray(configs[1]);
    record(
      "multi config shape",
      ok,
      ok
        ? `${(configs[0] as unknown[]).length} currencies, ${(configs[1] as unknown[]).length} pairs`
        : preview(configs),
    );
  } catch (error) {
    record("multi config shape", false, (error as Error).message);
  }
}

function validateDerivativeRow(d: IDerivativeStatus): boolean {
  return (
    isStr(d.key) &&
    isNum(d.mts) &&
    isNum(d.deriv_price) &&
    isNum(d.spot_price) &&
    isNum(d.insurance_fund_balance) &&
    isNullableNum(d.next_funding_evt_timestamp_ms) &&
    isNullableNum(d.next_funding_accrued) &&
    isNullableNum(d.next_funding_step) &&
    isNullableNum(d.current_funding) &&
    isNum(d.mark_price) &&
    isNullableNum(d.open_interest) &&
    isNullableNum(d.clamp_min) &&
    isNullableNum(d.clamp_max)
  );
}

async function checkDerivativesStatus(): Promise<void> {
  console.log("\n[GET /status/deriv?keys=...]");
  try {
    const data = await client.getDerivativesStatus({ keys: [derivKey] });
    const ok =
      Array.isArray(data) &&
      data.length > 0 &&
      data.every(validateDerivativeRow);
    record(
      "IDerivativeStatus[] shape",
      ok,
      ok
        ? `${data.length} row(s), key=${data[0]!.key}, deriv=${data[0]!.deriv_price}, spot=${data[0]!.spot_price}`
        : preview(data),
    );
  } catch (error) {
    record("IDerivativeStatus[] shape", false, (error as Error).message);
  }
}

async function checkDerivativesStatusHistory(): Promise<void> {
  console.log(`\n[GET /status/deriv/${derivKey}/hist]`);
  try {
    const data = await client.getDerivativesStatusHistory({
      key: derivKey,
      limit: 5,
    });
    const ok =
      Array.isArray(data) &&
      data.length > 0 &&
      data.every(validateDerivativeRow);
    record(
      "IDerivativeStatus[] history shape",
      ok,
      ok ? `${data.length} rows` : preview(data),
    );
  } catch (error) {
    record(
      "IDerivativeStatus[] history shape",
      false,
      (error as Error).message,
    );
  }
}

async function checkLiquidations(): Promise<void> {
  console.log("\n[GET /liquidations/hist]");
  try {
    const data = await client.getLiquidations({ limit: 5 });
    const ok =
      Array.isArray(data) &&
      data.every(
        (l: ILiquidation) =>
          isNum(l.pos_id) &&
          isNum(l.mts) &&
          isStr(l.symbol) &&
          isNum(l.amount) &&
          isNum(l.base_price) &&
          (l.is_match === 0 || l.is_match === 1) &&
          (l.is_market_sold === 0 || l.is_market_sold === 1) &&
          isNullableNum(l.price_acquired),
      );
    record(
      "ILiquidation[] shape",
      ok,
      ok ? `${data.length} liquidations` : preview(data),
    );
  } catch (error) {
    record("ILiquidation[] shape", false, (error as Error).message);
  }
}

async function checkLeaderboards(): Promise<void> {
  console.log("\n[GET /rankings/plu:3h:tBTCUSD/hist]");
  try {
    const data = await client.getLeaderboards({
      key: "plu",
      timeframe: "3h",
      symbol,
      limit: 5,
    });
    const ok =
      Array.isArray(data) &&
      data.every(
        (l: ILeaderboardEntry) =>
          isNum(l.mts) &&
          isStr(l.username) &&
          isNum(l.ranking) &&
          isNum(l.value) &&
          isNullableStr(l.twitter_handle),
      );
    record(
      "ILeaderboardEntry[] shape",
      ok,
      ok
        ? `${data.length} rows${data[0] ? `, top=${data[0].username}@${data[0].ranking}` : ""}`
        : preview(data),
    );
  } catch (error) {
    record("ILeaderboardEntry[] shape", false, (error as Error).message);
  }
}

async function checkFundingStats(): Promise<void> {
  console.log(`\n[GET /funding/stats/${fundingSymbol}/hist]`);
  try {
    const data = await client.getFundingStats({
      symbol: fundingSymbol,
      limit: 5,
    });
    const ok =
      Array.isArray(data) &&
      data.length > 0 &&
      data.every(
        (s: IFundingStat) =>
          isNum(s.mts) &&
          isNum(s.frr) &&
          isNum(s.avg_period) &&
          isNum(s.funding_amount) &&
          isNum(s.funding_amount_used) &&
          isNum(s.funding_below_threshold),
      );
    record(
      "IFundingStat[] shape",
      ok,
      ok ? `${data.length} rows, latest frr=${data[0]!.frr}` : preview(data),
    );
  } catch (error) {
    record("IFundingStat[] shape", false, (error as Error).message);
  }
}

async function checkVASPs(): Promise<void> {
  console.log("\n[GET /ext/vasps]");
  try {
    const vasps = await client.getVASPs();
    const ok =
      Array.isArray(vasps) &&
      vasps.length > 0 &&
      vasps.every((v) => isStr(v.id) && isStr(v.name));
    record(
      "IVASPs shape",
      ok,
      ok
        ? `${vasps.length} providers, first=${vasps[0]!.name}`
        : preview(vasps),
    );
  } catch (error) {
    record("IVASPs shape", false, (error as Error).message);
  }
}

async function checkMarketAveragePrice(): Promise<void> {
  console.log("\n[POST /calc/trade/avg]");
  try {
    const avg = await client.getMarketAveragePrice({ symbol, amount: "0.1" });
    const ok = isNum(avg.rate_avg) && isNum(avg.amount);
    record(
      "IMarketAveragePrice shape",
      ok,
      ok ? `rate_avg=${avg.rate_avg}, amount=${avg.amount}` : preview(avg),
    );
  } catch (error) {
    record("IMarketAveragePrice shape", false, (error as Error).message);
  }
}

async function checkForeignExchangeRate(): Promise<void> {
  console.log("\n[POST /calc/fx]");
  try {
    const fx = await client.getForeignExchangeRate({
      ccy1: "BTC",
      ccy2: "USD",
    });
    const ok = isNum(fx.current_rate) && fx.current_rate > 0;
    record(
      "IForeignExchangeRate shape",
      ok,
      ok ? `current_rate=${fx.current_rate}` : preview(fx),
    );
  } catch (error) {
    record("IForeignExchangeRate shape", false, (error as Error).message);
  }
}

async function checkPerCallSymbolOverride(): Promise<void> {
  console.log("\n[per-call symbol override]");
  try {
    const other = "tETHUSD";
    const ticker = await client.getTicker({ symbol: other });
    const ok =
      isTradingTicker(ticker) && isNum(ticker.bid) && isNum(ticker.ask);
    record(
      `getTicker({symbol: '${other}'}) returns trading ticker`,
      ok,
      ok ? `bid=${(ticker as ITradingTickerV2).bid}` : preview(ticker),
    );
    record(
      "per-call override does not mutate client.symbol",
      client.symbol === symbol,
      `client.symbol=${client.symbol}`,
    );
  } catch (error) {
    record(
      "per-call override does not mutate client.symbol",
      false,
      (error as Error).message,
    );
  }
}

async function checkErrorForInvalidSymbol(): Promise<void> {
  console.log("\n[GET /ticker/tNOTAPAIR (negative test)]");
  try {
    await client.getTicker({ symbol: "tNOTAPAIR" });
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
  console.log(`Hitting ${ApiUrlV2} ...`);
  await checkDefaults();
  await checkPlatformStatus();
  await checkTickerTrading();
  await checkTickerFunding();
  await checkTickers();
  await checkTickersHistory();
  await checkTradesTrading();
  await checkTradesFunding();
  await checkBookAggregatedTrading();
  await checkBookRawTrading();
  await checkBookAggregatedFunding();
  await checkBookRawFunding();
  await checkStatsLast();
  await checkStatsHist();
  await checkStatsCreditsSym();
  await checkCandlesLast();
  await checkCandlesHist();
  await checkConfigs();
  await checkConfigsMultiple();
  await checkDerivativesStatus();
  await checkDerivativesStatusHistory();
  await checkLiquidations();
  await checkLeaderboards();
  await checkFundingStats();
  await checkVASPs();
  await checkMarketAveragePrice();
  await checkForeignExchangeRate();
  await checkPerCallSymbolOverride();
  await checkErrorForInvalidSymbol();

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
