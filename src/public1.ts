import { RPC } from "rpc-request";

export const DefaultTimeout = 30000;
export const DefaultSymbol = "BTCUSD";
export const DefaultCurrency = "USD";

export type Symb = { symbol?: string };

export type Currency = { currency?: string };

export type GetFundingBook = Currency & {
  limit_bids?: number;
  limit_asks?: number;
};

export type GetOrderBook = Symb & {
  limit_bids?: number;
  limit_asks?: number;
  group?: 0 | 1;
};

export type GetTrades = Symb & { timestamp?: number; limit_trades?: number };

export type GetLends = Currency & { timestamp?: number; limit_lends?: number };

export type Ticker = {
  mid: string;
  bid: string;
  ask: string;
  last_price: string;
  low: string;
  high: string;
  volume: string;
  timestamp: string;
};

export type Stats = { period: number; volume: string }[];

export type FundingBookItem = {
  rate: string;
  amount: string;
  period: number;
  timestamp: string;
  frr: "No" | "Yes";
};

export type FundingBook = { bids: FundingBookItem[]; asks: FundingBookItem[] };

export type OrderBookItem = {
  price: string;
  amount: string;
  timestamp: string;
};

export type OrderBook = { bids: OrderBookItem[]; asks: OrderBookItem[] };

export type Trade = {
  timestamp: number;
  tid: number;
  price: string;
  amount: string;
  exchange: "bitfinex";
  type: "sell" | "buy" | "";
};

export type Lend = {
  rate: string;
  amount_lent: string;
  amount_used: string;
  timestamp: number;
};

export type SymbolDetail = {
  pair: string;
  price_precision: number;
  initial_margin: string;
  minimum_margin: string;
  maximum_order_size: string;
  minimum_order_size: string;
  expiration: string;
  margin: boolean;
};

export type PublicClient1Params = {
  symbol?: string;
  timeout?: number;
  currency?: string;
};

export class PublicClient1 extends RPC {
  readonly symbol: string;
  readonly currency: string;

  constructor({
    symbol = DefaultSymbol,
    timeout = DefaultTimeout,
    currency = DefaultCurrency
  }: PublicClient1Params = {}) {
    super({ timeout, baseUrl: "https://api.bitfinex.com", json: true });
    this.symbol = symbol;
    this.currency = currency;
  }

  /**
   * Get the ticker
   */
  getTicker({ symbol = this.symbol }: Symb = {}): Promise<Ticker> {
    return this.get({ uri: "/v1/pubticker/" + symbol });
  }

  /**
   * Various statistics about the requested pair.
   */
  getStats({ symbol = this.symbol }: Symb = {}): Promise<Stats> {
    return this.get({ uri: "/v1/stats/" + symbol });
  }

  /**
   * Get the full margin funding book
   */
  getFundingBook({
    currency = this.currency,
    ...qs
  }: GetFundingBook = {}): Promise<FundingBook> {
    return this.get({ uri: "/v1/lendbook/" + currency, qs });
  }

  /**
   * Get the full order book.
   */
  getOrderBook({ symbol = this.symbol, ...qs }: GetOrderBook = {}): Promise<
    OrderBook
  > {
    return this.get({ uri: "/v1/book/" + symbol, qs });
  }

  /**
   * Get a list of the most recent trades for the given symbol.
   */
  getTrades({ symbol = this.symbol, ...qs }: GetTrades = {}): Promise<Trade[]> {
    return this.get({ uri: "/v1/trades/" + symbol, qs });
  }

  /**
   * Get a list of the most recent funding data for the given currency: total amount provided and Flash Return Rate (in % by 365 days) over time.
   */
  getLends({ currency = this.currency, ...qs }: GetLends = {}): Promise<
    Lend[]
  > {
    return this.get({ uri: "/v1/lends/" + currency, qs });
  }

  /**
   * Get the list of symbol names.
   */
  getSymbols(): Promise<string[]> {
    return this.get({ uri: "/v1/symbols" });
  }

  /**
   * Get a list of valid symbol IDs and the pair details.
   */
  getSymbolDetails(): Promise<SymbolDetail[]> {
    return this.get({ uri: "/v1/symbols_details" });
  }
}
