import { RPC } from "rpc-request";

export const DefaultTimeout = 30000;
export const DefaultSymbol = "btcusd";
export const DefaultCurrency = "usd";

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
}
