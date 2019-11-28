import { RPC } from "rpc-request";

export const DefaultTimeout = 30000;
export const DefaultSymbol = "btcusd";
export const DefaultCurrency = "usd";

export type Symb = { symbol?: string };

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
}
