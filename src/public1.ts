import { FetchClient } from "rpc-request";

export const ApiUri = "https://api.bitfinex.com/v1/";
export const DefaultSymbol = "BTCUSD";
export const DefaultCurrency = "USD";

export interface Symb {
  symbol?: string;
}

export interface Currency {
  currency?: string;
}

export interface GetFundingBook extends Currency {
  limit_bids?: number;
  limit_asks?: number;
}

export interface GetOrderBook extends Symb {
  limit_bids?: number;
  limit_asks?: number;
  group?: 0 | 1;
}

export interface GetTrades extends Symb {
  timestamp?: number;
  limit_trades?: number;
}

export interface GetLends extends Currency {
  timestamp?: number;
  limit_lends?: number;
}

export interface Ticker {
  mid: string;
  bid: string;
  ask: string;
  last_price: string;
  low: string;
  high: string;
  volume: string;
  timestamp: string;
}

export interface Stat {
  period: number;
  volume: string;
}

export interface FundingBookItem {
  rate: string;
  amount: string;
  period: number;
  timestamp: string;
  frr: "No" | "Yes";
}

export interface FundingBook {
  bids: FundingBookItem[];
  asks: FundingBookItem[];
}

export interface OrderBookItem {
  price: string;
  amount: string;
  timestamp: string;
}

export interface OrderBook {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
}

export interface Trade {
  timestamp: number;
  tid: number;
  price: string;
  amount: string;
  exchange: "bitfinex";
  type: "sell" | "buy";
}

export interface Lend {
  rate: string;
  amount_lent: string;
  amount_used: string;
  timestamp: number;
}

export interface SymbolDetail {
  pair: string;
  price_precision: number;
  initial_margin: string;
  minimum_margin: string;
  maximum_order_size: string;
  minimum_order_size: string;
  expiration: string;
  margin: boolean;
}

export interface PublicClient1Params {
  symbol?: string;
  timeout?: number;
  currency?: string;
}

export class PublicClient1 extends FetchClient<unknown> {
  public readonly symbol: string;
  public readonly currency: string;

  public constructor({
    symbol = DefaultSymbol,
    currency = DefaultCurrency,
  }: PublicClient1Params = {}) {
    super({}, { baseUrl: ApiUri, transform: "json" });
    this.symbol = symbol;
    this.currency = currency;
  }

  /** Get the ticker */
  public async getTicker({ symbol = this.symbol }: Symb = {}): Promise<Ticker> {
    const ticker = (await this.get(`pubticker/${symbol}`)) as Ticker;
    return ticker;
  }

  /** Various statistics about the requested pair. */
  public async getStats({ symbol = this.symbol }: Symb = {}): Promise<Stat[]> {
    const stats = (await this.get(`stats/${symbol}`)) as Stat[];
    return stats;
  }

  /** Get the full margin funding book */
  public async getFundingBook({
    currency = this.currency,
    ...qs
  }: GetFundingBook = {}): Promise<FundingBook> {
    const url = new URL(`lendbook/${currency}`, ApiUri);
    PublicClient1.addOptions(url, { ...qs });
    const path = `${url.pathname}${url.search}`;
    const book = (await this.get(path)) as FundingBook;
    return book;
  }

  /** Get the full order book. */
  public async getOrderBook({
    symbol = this.symbol,
    ...qs
  }: GetOrderBook = {}): Promise<OrderBook> {
    const url = new URL(`book/${symbol}`, ApiUri);
    PublicClient1.addOptions(url, { ...qs });
    const path = `${url.pathname}${url.search}`;
    const book = (await this.get(path)) as OrderBook;
    return book;
  }

  /** Get a list of the most recent trades for the given symbol. */
  public async getTrades({
    symbol = this.symbol,
    ...qs
  }: GetTrades = {}): Promise<Trade[]> {
    const url = new URL(`trades/${symbol}`, ApiUri);
    PublicClient1.addOptions(url, { ...qs });
    const path = `${url.pathname}${url.search}`;
    const trades = (await this.get(path)) as Trade[];
    return trades;
  }

  /** Get a list of the most recent funding data for the given currency: total amount provided and Flash Return Rate (in % by 365 days) over time. */
  public async getLends({
    currency = this.currency,
    ...qs
  }: GetLends = {}): Promise<Lend[]> {
    const url = new URL(`lends/${currency}`, ApiUri);
    PublicClient1.addOptions(url, { ...qs });
    const path = `${url.pathname}${url.search}`;
    const lends = (await this.get(path)) as Lend[];
    return lends;
  }

  /** Get the list of symbol names. */
  public async getSymbols(): Promise<string[]> {
    const symbols = (await this.get("symbols")) as string[];
    return symbols;
  }

  /** Get a list of valid symbol IDs and the pair details. */
  public async getSymbolDetails(): Promise<SymbolDetail[]> {
    const details = (await this.get("symbols_details")) as SymbolDetail[];
    return details;
  }

  protected static addOptions(
    target: URL,
    data: Record<string, string | number | boolean | undefined>
  ): void {
    for (const key in data) {
      const value = data[key];
      if (typeof value !== "undefined") {
        target.searchParams.append(key, value.toString());
      }
    }
  }
}
