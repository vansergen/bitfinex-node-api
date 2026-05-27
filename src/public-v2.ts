import { Fetch, type IFetchOptions } from "rpc-request";
import { type IRecordType, PublicClient } from "./public.js";

export const ApiUrlV2 = "https://api-pub.bitfinex.com/v2/";
export const DefaultV2Symbol = "tBTCUSD";

/**
 * Error envelope returned by Bitfinex v2 endpoints: `["error", CODE, MESSAGE]`.
 * Covers the documented maintenance error (`code: 20060`) and any other error
 * code returned in the same shape.
 *
 * https://docs.bitfinex.com/docs/rest-general#maintenance-error
 */
export class BitfinexError extends Error {
  public readonly code: number;

  public constructor(code: number, message: string) {
    super(`Bitfinex error ${code}: ${message}`);
    this.name = "BitfinexError";
    this.code = code;
  }
}

function asBitfinexError(data: unknown): BitfinexError | null {
  if (
    Array.isArray(data) &&
    data.length === 3 &&
    data[0] === "error" &&
    typeof data[1] === "number" &&
    typeof data[2] === "string"
  ) {
    return new BitfinexError(data[1], data[2]);
  }
  return null;
}

export type IBookPrecisionV2 = "P0" | "P1" | "P2" | "P3" | "P4" | "R0";
export type IBookLength = 1 | 25 | 100 | 250;
export type ISortDirection = -1 | 1;
export type ISection = "hist" | "last";

export type ICandleTimeFrame =
  | "12h"
  | "14D"
  | "15m"
  | "1D"
  | "1M"
  | "1W"
  | "1h"
  | "1m"
  | "30m"
  | "3h"
  | "5m"
  | "6h";

export type IStatsKey =
  | "credits.size.sym"
  | "credits.size"
  | "funding.size"
  | "pos.size"
  | "vol.1d"
  | "vol.30d"
  | "vol.7d"
  | "vwap";

export type IStatsSize = "1d" | "1m" | "30m";

export type ILeaderboardTimeFrame = "1M" | "1w" | "3h";

export interface IPublicClientV2Options {
  url?: URL | string | undefined;
  symbol?: string;
}

/* -------------------------------------------------------------------------- */
/*  Response interfaces                                                        */
/* -------------------------------------------------------------------------- */

export interface IPlatformStatus {
  status: 0 | 1;
}

export interface ITradingTickerV2 {
  type: "trading_ticker";
  symbol: string;
  bid: number;
  bid_size: number;
  ask: number;
  ask_size: number;
  daily_change: number;
  daily_change_relative: number;
  last_price: number;
  volume: number;
  high: number;
  low: number;
}

export interface IFundingTickerV2 {
  type: "funding_ticker";
  symbol: string;
  frr: number;
  bid: number;
  bid_period: number;
  bid_size: number;
  ask: number;
  ask_period: number;
  ask_size: number;
  daily_change: number;
  daily_change_relative: number;
  last_price: number;
  volume: number;
  high: number;
  low: number;
  frr_amount_available: number;
}

export type ITickerV2 = IFundingTickerV2 | ITradingTickerV2;

export interface ITickerHistoryV2 {
  symbol: string;
  bid: number;
  ask: number;
  mts: number;
}

export interface ITradingTradeV2 {
  type: "trading_trade";
  id: number;
  mts: number;
  amount: number;
  price: number;
}

export interface IFundingTradeV2 {
  type: "funding_trade";
  id: number;
  mts: number;
  amount: number;
  rate: number;
  period: number;
}

export type ITradeV2 = IFundingTradeV2 | ITradingTradeV2;

export interface IAggregatedBookEntry {
  type: "book";
  price: number;
  count: number;
  amount: number;
}

export interface IRawBookEntry {
  type: "raw_book";
  order_id: number;
  price: number;
  amount: number;
}

export interface IAggregatedFundingBookEntry {
  type: "funding_book";
  rate: number;
  period: number;
  count: number;
  amount: number;
}

export interface IRawFundingBookEntry {
  type: "raw_funding_book";
  offer_id: number;
  period: number;
  rate: number;
  amount: number;
}

export type IBookEntryV2 =
  | IAggregatedBookEntry
  | IAggregatedFundingBookEntry
  | IRawBookEntry
  | IRawFundingBookEntry;

export interface IStatV2 {
  mts: number;
  value: number;
}

export interface ICandleV2 {
  mts: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface IDerivativeStatus {
  key: string;
  mts: number;
  deriv_price: number;
  spot_price: number;
  insurance_fund_balance: number;
  next_funding_evt_timestamp_ms: number | null;
  next_funding_accrued: number | null;
  next_funding_step: number | null;
  current_funding: number | null;
  mark_price: number;
  open_interest: number | null;
  clamp_min: number | null;
  clamp_max: number | null;
}

export interface ILiquidation {
  pos_id: number;
  mts: number;
  symbol: string;
  amount: number;
  base_price: number;
  is_match: 0 | 1;
  is_market_sold: 0 | 1;
  price_acquired: number | null;
}

export interface ILeaderboardEntry {
  mts: number;
  username: string;
  ranking: number;
  value: number;
  twitter_handle: string | null;
}

export interface IFundingStat {
  mts: number;
  frr: number;
  avg_period: number;
  funding_amount: number;
  funding_amount_used: number;
  funding_below_threshold: number;
}

export interface IVASP {
  id: string;
  name: string;
}

export type IVASPs = IVASP[];

export interface IMarketAveragePrice {
  rate_avg: number;
  amount: number;
}

export interface IForeignExchangeRate {
  current_rate: number;
}

/* -------------------------------------------------------------------------- */
/*  Method option interfaces                                                   */
/* -------------------------------------------------------------------------- */

export interface ISymbolOptionsV2 {
  symbol?: string;
}

export interface ITickersOptions {
  symbols: "ALL" | string[];
}

export interface ITickersHistoryOptions {
  symbols: "ALL" | string[];
  start?: number;
  end?: number;
  limit?: number;
}

export interface ITradesOptionsV2 extends ISymbolOptionsV2 {
  limit?: number;
  start?: number;
  end?: number;
  sort?: ISortDirection;
}

export interface IBookOptionsV2 extends ISymbolOptionsV2 {
  precision?: IBookPrecisionV2;
  len?: IBookLength;
}

interface IStatsCommonOptions {
  symbol: string;
  section: ISection;
  sort?: ISortDirection;
  start?: number;
  end?: number;
  limit?: number;
}

export interface IStatsPosSizeOptions extends IStatsCommonOptions {
  key: "pos.size";
  size: "1m";
  side: "long" | "short";
}

export interface IStatsCreditsSymOptions extends IStatsCommonOptions {
  key: "credits.size.sym";
  size: "1m";
  pair: string;
}

export interface IStatsCreditsOrFundingSizeOptions extends IStatsCommonOptions {
  key: "credits.size" | "funding.size";
  size: "1m";
}

export interface IStatsVolOptions extends IStatsCommonOptions {
  key: "vol.1d" | "vol.30d" | "vol.7d";
  size: "30m";
}

export interface IStatsVwapOptions extends IStatsCommonOptions {
  key: "vwap";
  size: "1d";
}

export type IStatsOptions =
  | IStatsCreditsOrFundingSizeOptions
  | IStatsCreditsSymOptions
  | IStatsPosSizeOptions
  | IStatsVolOptions
  | IStatsVwapOptions;

export interface ICandlesOptions {
  timeframe: ICandleTimeFrame;
  symbol: string;
  section: ISection;
  aggr?: number;
  period_start?: string;
  period_end?: string;
  sort?: ISortDirection;
  start?: number;
  end?: number;
  limit?: number;
}

export interface IConfigsOptions {
  configs: string | string[];
}

export interface IDerivativesStatusOptions {
  keys: "ALL" | string[];
}

export interface IDerivativesStatusHistoryOptions {
  key: string;
  sort?: ISortDirection;
  start?: number;
  end?: number;
  limit?: number;
}

export interface ILiquidationsOptions {
  sort?: ISortDirection;
  start?: number;
  end?: number;
  limit?: number;
}

export interface ILeaderboardsOptions {
  key: string;
  timeframe: ILeaderboardTimeFrame;
  symbol: string;
  sort?: ISortDirection;
  start?: number;
  end?: number;
  limit?: number;
}

export interface IFundingStatsOptions extends ISymbolOptionsV2 {
  start?: number;
  end?: number;
  limit?: number;
}

export interface IMarketAveragePriceOptions {
  symbol: string;
  amount: number | string;
  period?: number;
  rate_limit?: number | string;
}

export interface IForeignExchangeRateOptions {
  ccy1: string;
  ccy2: string;
}

/* -------------------------------------------------------------------------- */
/*  Decoder helpers                                                            */
/* -------------------------------------------------------------------------- */

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function toNullableNumber(value: unknown): number | null {
  return value === null || typeof value === "undefined"
    ? null
    : toNumber(value);
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : String(value);
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function decodeTradingTicker(row: readonly unknown[]): ITradingTickerV2 {
  return {
    type: "trading_ticker",
    symbol: toString(row[0]),
    bid: toNumber(row[1]),
    bid_size: toNumber(row[2]),
    ask: toNumber(row[3]),
    ask_size: toNumber(row[4]),
    daily_change: toNumber(row[5]),
    daily_change_relative: toNumber(row[6]),
    last_price: toNumber(row[7]),
    volume: toNumber(row[8]),
    high: toNumber(row[9]),
    low: toNumber(row[10]),
  };
}

function decodeFundingTicker(row: readonly unknown[]): IFundingTickerV2 {
  return {
    type: "funding_ticker",
    symbol: toString(row[0]),
    frr: toNumber(row[1]),
    bid: toNumber(row[2]),
    bid_period: toNumber(row[3]),
    bid_size: toNumber(row[4]),
    ask: toNumber(row[5]),
    ask_period: toNumber(row[6]),
    ask_size: toNumber(row[7]),
    daily_change: toNumber(row[8]),
    daily_change_relative: toNumber(row[9]),
    last_price: toNumber(row[10]),
    volume: toNumber(row[11]),
    high: toNumber(row[12]),
    low: toNumber(row[13]),
    frr_amount_available: toNumber(row[16]),
  };
}

function isFundingSymbol(symbol: string): boolean {
  return symbol.startsWith("f");
}

function decodeTicker(symbol: string, row: readonly unknown[]): ITickerV2 {
  const prefixed: readonly unknown[] = [symbol, ...row];
  if (isFundingSymbol(symbol)) {
    return decodeFundingTicker(prefixed);
  }
  return decodeTradingTicker(prefixed);
}

function decodeTickersRow(row: readonly unknown[]): ITickerV2 {
  const symbol = toString(row[0]);
  if (isFundingSymbol(symbol)) {
    return decodeFundingTicker(row);
  }
  return decodeTradingTicker(row);
}

function decodeTickerHistory(row: readonly unknown[]): ITickerHistoryV2 {
  return {
    symbol: toString(row[0]),
    bid: toNumber(row[1]),
    ask: toNumber(row[3]),
    mts: toNumber(row[12]),
  };
}

function decodeTradingTrade(row: readonly unknown[]): ITradingTradeV2 {
  return {
    type: "trading_trade",
    id: toNumber(row[0]),
    mts: toNumber(row[1]),
    amount: toNumber(row[2]),
    price: toNumber(row[3]),
  };
}

function decodeFundingTrade(row: readonly unknown[]): IFundingTradeV2 {
  return {
    type: "funding_trade",
    id: toNumber(row[0]),
    mts: toNumber(row[1]),
    amount: toNumber(row[2]),
    rate: toNumber(row[3]),
    period: toNumber(row[4]),
  };
}

function decodeBookEntry(
  row: readonly unknown[],
  isFunding: boolean,
  isRaw: boolean,
): IBookEntryV2 {
  if (isFunding && isRaw) {
    return {
      type: "raw_funding_book",
      offer_id: toNumber(row[0]),
      period: toNumber(row[1]),
      rate: toNumber(row[2]),
      amount: toNumber(row[3]),
    };
  }
  if (isFunding) {
    return {
      type: "funding_book",
      rate: toNumber(row[0]),
      period: toNumber(row[1]),
      count: toNumber(row[2]),
      amount: toNumber(row[3]),
    };
  }
  if (isRaw) {
    return {
      type: "raw_book",
      order_id: toNumber(row[0]),
      price: toNumber(row[1]),
      amount: toNumber(row[2]),
    };
  }
  return {
    type: "book",
    price: toNumber(row[0]),
    count: toNumber(row[1]),
    amount: toNumber(row[2]),
  };
}

function decodeStat(row: readonly unknown[]): IStatV2 {
  return { mts: toNumber(row[0]), value: toNumber(row[1]) };
}

function decodeCandle(row: readonly unknown[]): ICandleV2 {
  return {
    mts: toNumber(row[0]),
    open: toNumber(row[1]),
    close: toNumber(row[2]),
    high: toNumber(row[3]),
    low: toNumber(row[4]),
    volume: toNumber(row[5]),
  };
}

function decodeDerivativeStatus(row: readonly unknown[]): IDerivativeStatus {
  return {
    key: toString(row[0]),
    mts: toNumber(row[1]),
    deriv_price: toNumber(row[3]),
    spot_price: toNumber(row[4]),
    insurance_fund_balance: toNumber(row[6]),
    next_funding_evt_timestamp_ms: toNullableNumber(row[8]),
    next_funding_accrued: toNullableNumber(row[9]),
    next_funding_step: toNullableNumber(row[10]),
    current_funding: toNullableNumber(row[12]),
    mark_price: toNumber(row[15]),
    open_interest: toNullableNumber(row[18]),
    clamp_min: toNullableNumber(row[22]),
    clamp_max: toNullableNumber(row[23]),
  };
}

function decodeLiquidation(row: readonly unknown[]): ILiquidation {
  const data = Array.isArray(row[0]) ? (row[0] as readonly unknown[]) : row;
  return {
    pos_id: toNumber(data[1]),
    mts: toNumber(data[2]),
    symbol: toString(data[4]),
    amount: toNumber(data[5]),
    base_price: toNumber(data[6]),
    is_match: toNumber(data[8]) === 1 ? 1 : 0,
    is_market_sold: toNumber(data[9]) === 1 ? 1 : 0,
    price_acquired: toNullableNumber(data[11]),
  };
}

function decodeLeaderboard(row: readonly unknown[]): ILeaderboardEntry {
  return {
    mts: toNumber(row[0]),
    username: toString(row[2]),
    ranking: toNumber(row[3]),
    value: toNumber(row[6]),
    twitter_handle: toNullableString(row[9]),
  };
}

function decodeFundingStat(row: readonly unknown[]): IFundingStat {
  return {
    mts: toNumber(row[0]),
    frr: toNumber(row[3]),
    avg_period: toNumber(row[4]),
    funding_amount: toNumber(row[7]),
    funding_amount_used: toNumber(row[8]),
    funding_below_threshold: toNumber(row[11]),
  };
}

function joinSymbols(value: "ALL" | string[]): string {
  return value === "ALL" ? "ALL" : value.join(",");
}

function toOptions(query: object): IRecordType {
  const out: IRecordType = {};
  for (const [k, v] of Object.entries(query)) {
    if (typeof v === "undefined" || v === null) {
      // skip
    } else if (Array.isArray(v)) {
      out[k] = v.join(",");
    } else if (
      typeof v === "boolean" ||
      typeof v === "number" ||
      typeof v === "string"
    ) {
      out[k] = v;
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Client                                                                     */
/* -------------------------------------------------------------------------- */

export class PublicClientV2 extends Fetch {
  readonly #symbol: string;

  public constructor({
    url = ApiUrlV2,
    symbol = DefaultV2Symbol,
  }: IPublicClientV2Options = {}) {
    super({ base_url: new URL(url), transform: "json" });
    this.#symbol = symbol;
  }

  public get base_url(): URL {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return super.base_url!;
  }

  public get symbol(): string {
    return this.#symbol;
  }

  public override async get<T = unknown>(
    path = "",
    init: IFetchOptions & { options?: IRecordType } = {},
  ): Promise<T> {
    const { options, ...rest } = init;
    const url = new URL(path, this.base_url);
    PublicClient.setQuery(url.searchParams, options);
    const data = await super.get<T>(url.toString(), rest);
    const error = asBitfinexError(data);
    if (error !== null) {
      throw error;
    }
    return data;
  }

  public override async post<T = unknown>(
    path = "",
    init: IFetchOptions = {},
    body: Record<string, unknown> = {},
  ): Promise<T> {
    const url = new URL(path, this.base_url);
    const data = await super.post<T>(url.toString(), {
      ...init,
      body: JSON.stringify(body),
      headers: { ...init.headers, "Content-Type": "application/json" },
    });
    const error = asBitfinexError(data);
    if (error !== null) {
      throw error;
    }
    return data;
  }

  /** Get the current status of the platform (operative or maintenance). */
  public async getPlatformStatus(): Promise<IPlatformStatus> {
    const [status] = await this.get<[0 | 1]>("platform/status");
    return { status };
  }

  /** High level overview of the state of the market for a single trading or funding pair. */
  public async getTicker({
    symbol = this.symbol,
  }: ISymbolOptionsV2 = {}): Promise<ITickerV2> {
    const row = await this.get<unknown[]>(`ticker/${symbol}`);
    return decodeTicker(symbol, row);
  }

  /** High level overview of the state of the market for several pairs. */
  public async getTickers({ symbols }: ITickersOptions): Promise<ITickerV2[]> {
    const rows = await this.get<unknown[][]>("tickers", {
      options: toOptions({ symbols: joinSymbols(symbols) }),
    });
    return rows.map(decodeTickersRow);
  }

  /** Historical data for the tickers endpoint. */
  public async getTickersHistory({
    symbols,
    ...rest
  }: ITickersHistoryOptions): Promise<ITickerHistoryV2[]> {
    const rows = await this.get<unknown[][]>("tickers/hist", {
      options: toOptions({ symbols: joinSymbols(symbols), ...rest }),
    });
    return rows.map(decodeTickerHistory);
  }

  /** Public trades that have occurred for the requested trading or funding pair. */
  public async getTrades({
    symbol = this.symbol,
    ...rest
  }: ITradesOptionsV2 = {}): Promise<ITradeV2[]> {
    const rows = await this.get<unknown[][]>(`trades/${symbol}/hist`, {
      options: toOptions(rest),
    });
    const decoder = isFundingSymbol(symbol)
      ? decodeFundingTrade
      : decodeTradingTrade;
    return rows.map((row) => decoder(row));
  }

  /** Order book of a given pair. */
  public async getBook({
    symbol = this.symbol,
    precision = "P0",
    len,
  }: IBookOptionsV2 = {}): Promise<IBookEntryV2[]> {
    const rows = await this.get<unknown[][]>(`book/${symbol}/${precision}`, {
      options: toOptions({ len }),
    });
    const funding = isFundingSymbol(symbol);
    const raw = precision === "R0";
    return rows.map((row) => decodeBookEntry(row, funding, raw));
  }

  /** Various statistics about the requested pair. */
  public async getStats(options: IStatsOptions): Promise<IStatV2 | IStatV2[]> {
    let keyPath = `${options.key}:${options.size}:${options.symbol}`;
    if (options.key === "pos.size") {
      keyPath += `:${options.side}`;
    } else if (options.key === "credits.size.sym") {
      keyPath += `:${options.pair}`;
    }
    const { section, sort, start, end, limit } = options;
    const data = await this.get<unknown[]>(`stats1/${keyPath}/${section}`, {
      options: toOptions({ sort, start, end, limit }),
    });
    if (section === "last") {
      return decodeStat(data);
    }
    return (data as unknown[][]).map(decodeStat);
  }

  /** Provides a way to access charting candle info. */
  public async getCandles({
    timeframe,
    symbol,
    section,
    aggr,
    period_start,
    period_end,
    ...rest
  }: ICandlesOptions): Promise<ICandleV2 | ICandleV2[]> {
    const parts = [`trade:${timeframe}:${symbol}`];
    if (typeof aggr !== "undefined") {
      parts.push(`a${aggr}`);
    }
    if (typeof period_start !== "undefined") {
      parts.push(`p${period_start}`);
    }
    if (typeof period_end !== "undefined") {
      parts.push(`p${period_end}`);
    }
    const data = await this.get<unknown[]>(
      `candles/${parts.join(":")}/${section}`,
      { options: toOptions(rest) },
    );
    if (section === "last") {
      return decodeCandle(data);
    }
    return (data as unknown[][]).map(decodeCandle);
  }

  /** Public configurations endpoint. Returns raw data as documented per config key. */
  public getConfigs({ configs }: IConfigsOptions): Promise<unknown[]> {
    const path = typeof configs === "string" ? configs : configs.join(",");
    return this.get<unknown[]>(`conf/${path}`);
  }

  /** Endpoint used to receive different types of platform information. */
  public async getDerivativesStatus({
    keys,
  }: IDerivativesStatusOptions): Promise<IDerivativeStatus[]> {
    const rows = await this.get<unknown[][]>("status/deriv", {
      options: toOptions({ keys: joinSymbols(keys) }),
    });
    return rows.map(decodeDerivativeStatus);
  }

  /** History of derivative statuses for a single key. */
  public async getDerivativesStatusHistory({
    key,
    ...rest
  }: IDerivativesStatusHistoryOptions): Promise<IDerivativeStatus[]> {
    const rows = await this.get<unknown[][]>(`status/deriv/${key}/hist`, {
      options: toOptions(rest),
    });
    return rows.map(decodeDerivativeStatus);
  }

  /** Endpoint to retrieve liquidations. */
  public async getLiquidations(
    options: ILiquidationsOptions = {},
  ): Promise<ILiquidation[]> {
    const rows = await this.get<unknown[][]>("liquidations/hist", {
      options: toOptions(options),
    });
    return rows.map(decodeLiquidation);
  }

  /** Get leaderboards entries. */
  public async getLeaderboards({
    key,
    timeframe,
    symbol,
    ...rest
  }: ILeaderboardsOptions): Promise<ILeaderboardEntry[]> {
    const rows = await this.get<unknown[][]>(
      `rankings/${key}:${timeframe}:${symbol}/hist`,
      { options: toOptions(rest) },
    );
    return rows.map(decodeLeaderboard);
  }

  /** Get a list of the most recent funding data: FRR, average period, etc. */
  public async getFundingStats({
    symbol = this.symbol,
    ...rest
  }: IFundingStatsOptions = {}): Promise<IFundingStat[]> {
    const rows = await this.get<unknown[][]>(`funding/stats/${symbol}/hist`, {
      options: toOptions(rest),
    });
    return rows.map(decodeFundingStat);
  }

  /** List of Virtual Asset Service Providers supported by Bitfinex. */
  public getVASPs(): Promise<IVASPs> {
    return this.get<IVASPs>("ext/vasps");
  }

  /** Calculate the average execution price for trading. */
  public async getMarketAveragePrice(
    body: IMarketAveragePriceOptions,
  ): Promise<IMarketAveragePrice> {
    const [rate_avg, amount] = await this.post<[number, number]>(
      "calc/trade/avg",
      {},
      { ...body },
    );
    return { rate_avg, amount };
  }

  /** Calculate the exchange rate between two currencies. */
  public async getForeignExchangeRate(
    body: IForeignExchangeRateOptions,
  ): Promise<IForeignExchangeRate> {
    const [current_rate] = await this.post<[number]>(
      "calc/fx",
      {},
      { ...body },
    );
    return { current_rate };
  }
}
