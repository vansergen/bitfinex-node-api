import { Fetch, type IFetchOptions } from "rpc-request";

export type IRecordType = Record<string, boolean | number | string | undefined>;

export interface IBitfinexGetOptions extends IFetchOptions {
  options?: IRecordType;
}

export const ApiUrl = "https://api.bitfinex.com/v1/";
export const DefaultSymbol = "BTCUSD";
export const DefaultCurrency = "USD";

export interface ISymbolOptions {
  symbol?: string;
}

export interface ICurrencyOptions {
  currency?: string;
}

export interface IFundingBookOptions extends ICurrencyOptions {
  limit_bids?: number;
  limit_asks?: number;
}

export interface IOrderBookOptions extends ISymbolOptions {
  limit_bids?: number;
  limit_asks?: number;
  group?: 0 | 1;
}

export interface ITradesOptions extends ISymbolOptions {
  timestamp?: number;
  limit_trades?: number;
}

export interface ILendsOptions extends ICurrencyOptions {
  timestamp?: number;
  limit_lends?: number;
}

export interface ITicker {
  mid: string;
  bid: string;
  ask: string;
  last_price: string;
  low: string;
  high: string;
  volume: string;
  timestamp: string;
}

export interface IStat {
  period: number;
  volume: string;
}

export interface IFundingBookItem {
  rate: string;
  amount: string;
  period: number;
  timestamp: string;
  frr: "No" | "Yes";
}

export interface IFundingBook {
  bids: IFundingBookItem[];
  asks: IFundingBookItem[];
}

export interface IOrderBookItem {
  price: string;
  amount: string;
  timestamp: string;
}

export interface IOrderBook {
  bids: IOrderBookItem[];
  asks: IOrderBookItem[];
}

export interface ITrade {
  timestamp: number;
  tid: number;
  price: string;
  amount: string;
  exchange: "bitfinex";
  type: "buy" | "sell";
}

export interface ILend {
  rate: string;
  amount_lent: string;
  amount_used: string;
  timestamp: number;
}

export interface ISymbolDetail {
  pair: string;
  price_precision: number;
  initial_margin: string;
  minimum_margin: string;
  maximum_order_size: string;
  minimum_order_size: string;
  expiration: string;
  margin: boolean;
}

export interface IPublicClientOptions {
  url?: URL | string | undefined;
  symbol?: string;
  currency?: string;
}

export class PublicClient extends Fetch {
  readonly #symbol: string;
  readonly #currency: string;

  public constructor({
    url = ApiUrl,
    symbol = DefaultSymbol,
    currency = DefaultCurrency,
  }: IPublicClientOptions = {}) {
    super({ base_url: new URL(url), transform: "json" });
    this.#symbol = symbol;
    this.#currency = currency;
  }

  public get base_url(): URL {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return super.base_url!;
  }

  public get symbol(): string {
    return this.#symbol;
  }

  public get currency(): string {
    return this.#currency;
  }

  public get<T = unknown>(
    path = "",
    { options, ...init }: IBitfinexGetOptions = {},
  ): Promise<T> {
    const url = new URL(path, this.base_url);
    PublicClient.setQuery(url.searchParams, options);

    return super.get(url.toString(), init);
  }

  /** Get the ticker. */
  public getTicker({
    symbol = this.#symbol,
  }: ISymbolOptions = {}): Promise<ITicker> {
    return this.get<ITicker>(`pubticker/${symbol}`);
  }

  /** Various statistics about the requested pair. */
  public getStats({ symbol = this.#symbol }: ISymbolOptions = {}): Promise<
    IStat[]
  > {
    return this.get<IStat[]>(`stats/${symbol}`);
  }

  /** Get the full margin funding book. */
  public getFundingBook({
    currency = this.#currency,
    ...options
  }: IFundingBookOptions = {}): Promise<IFundingBook> {
    return this.get<IFundingBook>(`lendbook/${currency}`, { options });
  }

  /** Get the full order book. */
  public getOrderBook({
    symbol = this.#symbol,
    ...options
  }: IOrderBookOptions = {}): Promise<IOrderBook> {
    return this.get<IOrderBook>(`book/${symbol}`, { options });
  }

  /** Get a list of the most recent trades for the given symbol. */
  public getTrades({
    symbol = this.#symbol,
    ...options
  }: ITradesOptions = {}): Promise<ITrade[]> {
    return this.get<ITrade[]>(`trades/${symbol}`, { options });
  }

  /**
   * Get a list of the most recent funding data for the given currency: total
   * amount provided and Flash Return Rate (in % by 365 days) over time.
   */
  public getLends({
    currency = this.#currency,
    ...options
  }: ILendsOptions = {}): Promise<ILend[]> {
    return this.get<ILend[]>(`lends/${currency}`, { options });
  }

  /** Get the list of symbol names. */
  public getSymbols(): Promise<string[]> {
    return this.get<string[]>("symbols");
  }

  /** Get a list of valid symbol IDs and the pair details. */
  public getSymbolDetails(): Promise<ISymbolDetail[]> {
    return this.get<ISymbolDetail[]>("symbols_details");
  }

  public static setQuery(query: URLSearchParams, object?: IRecordType): void {
    for (const key in object) {
      const value = object[key];
      if (typeof value !== "undefined") {
        query.set(key, value.toString());
      }
    }
  }
}
