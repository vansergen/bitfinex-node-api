/* eslint-disable @typescript-eslint/no-floating-promises */
import { deepStrictEqual } from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import {
  ApiUrl,
  DefaultCurrency,
  DefaultSymbol,
  type IFundingBook,
  type ILend,
  type IOrderBook,
  PublicClient,
  type IStat,
  type ISymbolDetail,
  type ITicker,
  type ITrade,
} from "../index.js";
import { mockFetch } from "./mock.js";

const client = new PublicClient();

describe("PublicClient", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("constructor", () => {
    deepStrictEqual(client.base_url.toString(), ApiUrl);
    deepStrictEqual(client.symbol, DefaultSymbol);
    deepStrictEqual(client.currency, DefaultCurrency);
  });

  test("constructor (custom values)", () => {
    const url = "https://example.com/";
    const symbol = "ETHUSD";
    const currency = "ETH";
    const custom = new PublicClient({ url, symbol, currency });
    deepStrictEqual(custom.base_url.toString(), url);
    deepStrictEqual(custom.symbol, symbol);
    deepStrictEqual(custom.currency, currency);
  });

  test(".getTicker()", async () => {
    const symbol = "ETHUSD";
    const response: ITicker = {
      mid: "244.755",
      bid: "244.75",
      ask: "244.76",
      last_price: "244.82",
      low: "244.2",
      high: "248.19",
      volume: "7842.11542563",
      timestamp: "1444253422.348340958",
    };
    mockFetch({ path: `/v1/pubticker/${symbol}`, method: "GET" }, response);

    const data = await client.getTicker({ symbol });
    deepStrictEqual(data, response);
  });

  test(".getTicker() (with default symbol)", async () => {
    const response: ITicker = {
      mid: "244.755",
      bid: "244.75",
      ask: "244.76",
      last_price: "244.82",
      low: "244.2",
      high: "248.19",
      volume: "7842.11542563",
      timestamp: "1444253422.348340958",
    };
    mockFetch(
      { path: `/v1/pubticker/${DefaultSymbol}`, method: "GET" },
      response,
    );

    const data = await client.getTicker();
    deepStrictEqual(data, response);
  });

  test(".getStats()", async () => {
    const symbol = "ETHUSD";
    const response: IStat[] = [
      { period: 1, volume: "7967.96766158" },
      { period: 7, volume: "55938.67260266" },
      { period: 30, volume: "275148.09653645" },
    ];
    mockFetch({ path: `/v1/stats/${symbol}`, method: "GET" }, response);

    const data = await client.getStats({ symbol });
    deepStrictEqual(data, response);
  });

  test(".getFundingBook()", async () => {
    const currency = "USD";
    const limit_bids = 1;
    const limit_asks = 1;
    const response: IFundingBook = {
      bids: [
        {
          rate: "9.1287",
          amount: "5000.0",
          period: 30,
          timestamp: "1444257541.0",
          frr: "No",
        },
      ],
      asks: [
        {
          rate: "8.3695",
          amount: "407.5",
          period: 2,
          timestamp: "1444260343.0",
          frr: "No",
        },
      ],
    };
    mockFetch(
      {
        path: `/v1/lendbook/${currency}`,
        method: "GET",
        query: { limit_bids: 1, limit_asks: 1 },
      },
      response,
    );

    const data = await client.getFundingBook({
      currency,
      limit_bids,
      limit_asks,
    });
    deepStrictEqual(data, response);
  });

  test(".getFundingBook() (with default currency)", async () => {
    const response: IFundingBook = { bids: [], asks: [] };
    mockFetch(
      { path: `/v1/lendbook/${DefaultCurrency}`, method: "GET" },
      response,
    );

    const data = await client.getFundingBook();
    deepStrictEqual(data, response);
  });

  test(".getOrderBook()", async () => {
    const symbol = "ETHUSD";
    const limit_bids = 1;
    const limit_asks = 1;
    const group = 1 as const;
    const response: IOrderBook = {
      bids: [
        { price: "574.61", amount: "0.1439327", timestamp: "1472506127.0" },
      ],
      asks: [{ price: "574.62", amount: "19.1334", timestamp: "1472506126.0" }],
    };
    mockFetch(
      {
        path: `/v1/book/${symbol}`,
        method: "GET",
        query: { limit_bids: 1, limit_asks: 1, group: 1 },
      },
      response,
    );

    const data = await client.getOrderBook({
      symbol,
      limit_bids,
      limit_asks,
      group,
    });
    deepStrictEqual(data, response);
  });

  test(".getTrades()", async () => {
    const symbol = "ETHUSD";
    const timestamp = 1444266681;
    const limit_trades = 1;
    const response: ITrade[] = [
      {
        timestamp: 1444266681,
        tid: 11988919,
        price: "244.8",
        amount: "0.03297384",
        exchange: "bitfinex",
        type: "sell",
      },
    ];
    mockFetch(
      {
        path: `/v1/trades/${symbol}`,
        method: "GET",
        query: { timestamp: 1444266681, limit_trades: 1 },
      },
      response,
    );

    const data = await client.getTrades({ symbol, timestamp, limit_trades });
    deepStrictEqual(data, response);
  });

  test(".getLends()", async () => {
    const currency = "USD";
    const timestamp = 1444266681;
    const limit_lends = 1;
    const response: ILend[] = [
      {
        rate: "9.8998",
        amount_lent: "22528933.77950878",
        amount_used: "0.0",
        timestamp: 1444264307,
      },
    ];
    mockFetch(
      {
        path: `/v1/lends/${currency}`,
        method: "GET",
        query: { timestamp: 1444266681, limit_lends: 1 },
      },
      response,
    );

    const data = await client.getLends({ currency, timestamp, limit_lends });
    deepStrictEqual(data, response);
  });

  test(".getSymbols()", async () => {
    const response = ["btcusd", "ltcusd", "ltcbtc"];
    mockFetch({ path: "/v1/symbols", method: "GET" }, response);

    const data = await client.getSymbols();
    deepStrictEqual(data, response);
  });

  test(".getSymbolDetails()", async () => {
    const response: ISymbolDetail[] = [
      {
        pair: "btcusd",
        price_precision: 5,
        initial_margin: "30.0",
        minimum_margin: "15.0",
        maximum_order_size: "2000.0",
        minimum_order_size: "0.002",
        expiration: "NA",
        margin: true,
      },
    ];
    mockFetch({ path: "/v1/symbols_details", method: "GET" }, response);

    const data = await client.getSymbolDetails();
    deepStrictEqual(data, response);
  });
});
