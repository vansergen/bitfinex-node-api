/* eslint-disable @typescript-eslint/no-floating-promises */
import { deepStrictEqual, rejects } from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import {
  ApiUrlV2,
  DefaultV2Symbol,
  type IAggregatedBookEntry,
  type IAggregatedFundingBookEntry,
  type ICandleV2,
  type IDerivativeStatus,
  type IForeignExchangeRate,
  type IFundingStat,
  type IFundingTickerV2,
  type IFundingTradeV2,
  type ILeaderboardEntry,
  type ILiquidation,
  type IMarketAveragePrice,
  type IPlatformStatus,
  type IRawBookEntry,
  type IRawFundingBookEntry,
  type IStatV2,
  type ITickerHistoryV2,
  type ITradingTickerV2,
  type ITradingTradeV2,
  type IVASPs,
  BitfinexError,
  PublicClientV2,
} from "../index.js";
import { mockFetch } from "./mock.js";

const client = new PublicClientV2();

describe("PublicClientV2", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("constructor", () => {
    deepStrictEqual(client.base_url.toString(), ApiUrlV2);
    deepStrictEqual(client.symbol, DefaultV2Symbol);
  });

  test("constructor (custom values)", () => {
    const url = "https://example.com/";
    const symbol = "tETHUSD";
    const custom = new PublicClientV2({ url, symbol });
    deepStrictEqual(custom.base_url.toString(), url);
    deepStrictEqual(custom.symbol, symbol);
  });

  test(".getPlatformStatus()", async () => {
    mockFetch({ path: "/v2/platform/status", method: "GET" }, [1]);
    const data = await client.getPlatformStatus();
    deepStrictEqual(data, { status: 1 } satisfies IPlatformStatus);
  });

  test(".getTicker() (trading)", async () => {
    const symbol = "tBTCUSD";
    mockFetch(
      { path: `/v2/ticker/${symbol}`, method: "GET" },
      [76892, 5.8, 76926, 7.03, 810, 0.01, 76874, 1438.81, 76984, 74027],
    );
    const data = await client.getTicker({ symbol });
    deepStrictEqual(data, {
      type: "trading_ticker",
      symbol,
      bid: 76892,
      bid_size: 5.8,
      ask: 76926,
      ask_size: 7.03,
      daily_change: 810,
      daily_change_relative: 0.01,
      last_price: 76874,
      volume: 1438.81,
      high: 76984,
      low: 74027,
    } satisfies ITradingTickerV2);
  });

  test(".getTicker() (funding, default symbol)", async () => {
    const symbol = "fUSD";
    const custom = new PublicClientV2({ symbol });
    mockFetch({ path: `/v2/ticker/${symbol}`, method: "GET" }, [
      0.00039778,
      0.00029,
      2,
      21298086,
      0.00008723,
      2,
      123300,
      -0.000015,
      -0.15,
      0.00007587,
      1000,
      0.0004,
      0.00007,
      null,
      null,
      42,
    ]);
    const data = await custom.getTicker();
    deepStrictEqual(data, {
      type: "funding_ticker",
      symbol,
      frr: 0.00039778,
      bid: 0.00029,
      bid_period: 2,
      bid_size: 21298086,
      ask: 0.00008723,
      ask_period: 2,
      ask_size: 123300,
      daily_change: -0.000015,
      daily_change_relative: -0.15,
      last_price: 0.00007587,
      volume: 1000,
      high: 0.0004,
      low: 0.00007,
      frr_amount_available: 42,
    } satisfies IFundingTickerV2);
  });

  test(".getTickers()", async () => {
    mockFetch(
      {
        path: "/v2/tickers",
        method: "GET",
        query: { symbols: "tBTCUSD,fUSD" },
      },
      [
        [
          "tBTCUSD",
          76892,
          5.8,
          76926,
          7.03,
          810,
          0.01,
          76874,
          1438.81,
          76984,
          74027,
        ],
        [
          "fUSD",
          0.00039778,
          0.00029,
          2,
          21298086,
          0.00008723,
          2,
          123300,
          -0.000015,
          -0.15,
          0.00007587,
          1000,
          0.0004,
          0.00007,
          null,
          null,
          42,
        ],
      ],
    );
    const data = await client.getTickers({ symbols: ["tBTCUSD", "fUSD"] });
    deepStrictEqual(data.length, 2);
    deepStrictEqual(data[0]?.type, "trading_ticker");
    deepStrictEqual(data[1]?.type, "funding_ticker");
    deepStrictEqual(data[0]?.symbol, "tBTCUSD");
    deepStrictEqual(data[1]?.symbol, "fUSD");
  });

  test(".getTickers({ symbols: 'ALL' })", async () => {
    mockFetch(
      { path: "/v2/tickers", method: "GET", query: { symbols: "ALL" } },
      [],
    );
    const data = await client.getTickers({ symbols: "ALL" });
    deepStrictEqual(data, []);
  });

  test(".getTickersHistory()", async () => {
    mockFetch(
      {
        path: "/v2/tickers/hist",
        method: "GET",
        query: { symbols: "tBTCUSD", limit: 1 },
      },
      [
        [
          "tBTCUSD",
          76892,
          null,
          76926,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          1700000000000,
        ],
      ],
    );
    const data = await client.getTickersHistory({
      symbols: ["tBTCUSD"],
      limit: 1,
    });
    deepStrictEqual(data, [
      {
        symbol: "tBTCUSD",
        bid: 76892,
        ask: 76926,
        mts: 1700000000000,
      },
    ] satisfies ITickerHistoryV2[]);
  });

  test(".getTrades() (trading)", async () => {
    const symbol = "tBTCUSD";
    mockFetch(
      {
        path: `/v2/trades/${symbol}/hist`,
        method: "GET",
        query: { limit: 2, sort: -1 },
      },
      [
        [123, 1700000000000, -0.5, 76800],
        [122, 1699999999000, 1.2, 76801],
      ],
    );
    const data = await client.getTrades({ symbol, limit: 2, sort: -1 });
    deepStrictEqual(data, [
      {
        type: "trading_trade",
        id: 123,
        mts: 1700000000000,
        amount: -0.5,
        price: 76800,
      },
      {
        type: "trading_trade",
        id: 122,
        mts: 1699999999000,
        amount: 1.2,
        price: 76801,
      },
    ] satisfies ITradingTradeV2[]);
  });

  test(".getTrades() (funding)", async () => {
    const symbol = "fUSD";
    mockFetch({ path: `/v2/trades/${symbol}/hist`, method: "GET" }, [
      [1, 1700000000000, 5000, 0.0004, 2],
    ]);
    const data = await client.getTrades({ symbol });
    deepStrictEqual(data, [
      {
        type: "funding_trade",
        id: 1,
        mts: 1700000000000,
        amount: 5000,
        rate: 0.0004,
        period: 2,
      },
    ] satisfies IFundingTradeV2[]);
  });

  test(".getBook() (aggregated trading)", async () => {
    const symbol = "tBTCUSD";
    mockFetch(
      {
        path: `/v2/book/${symbol}/P0`,
        method: "GET",
        query: { len: 1 },
      },
      [
        [76800, 2, 1.5],
        [76900, 3, -2.5],
      ],
    );
    const data = await client.getBook({ symbol, precision: "P0", len: 1 });
    deepStrictEqual(data, [
      { type: "book", price: 76800, count: 2, amount: 1.5 },
      { type: "book", price: 76900, count: 3, amount: -2.5 },
    ] satisfies IAggregatedBookEntry[]);
  });

  test(".getBook() (raw trading)", async () => {
    const symbol = "tBTCUSD";
    mockFetch({ path: `/v2/book/${symbol}/R0`, method: "GET" }, [
      [42, 76800, 1.5],
    ]);
    const data = await client.getBook({ symbol, precision: "R0" });
    deepStrictEqual(data, [
      { type: "raw_book", order_id: 42, price: 76800, amount: 1.5 },
    ] satisfies IRawBookEntry[]);
  });

  test(".getBook() (aggregated funding)", async () => {
    const symbol = "fUSD";
    mockFetch({ path: `/v2/book/${symbol}/P0`, method: "GET" }, [
      [0.0004, 2, 3, 1000],
    ]);
    const data = await client.getBook({ symbol, precision: "P0" });
    deepStrictEqual(data, [
      {
        type: "funding_book",
        rate: 0.0004,
        period: 2,
        count: 3,
        amount: 1000,
      },
    ] satisfies IAggregatedFundingBookEntry[]);
  });

  test(".getBook() (raw funding)", async () => {
    const symbol = "fUSD";
    mockFetch({ path: `/v2/book/${symbol}/R0`, method: "GET" }, [
      [99, 2, 0.0004, 1000],
    ]);
    const data = await client.getBook({ symbol, precision: "R0" });
    deepStrictEqual(data, [
      {
        type: "raw_funding_book",
        offer_id: 99,
        period: 2,
        rate: 0.0004,
        amount: 1000,
      },
    ] satisfies IRawFundingBookEntry[]);
  });

  test(".getStats() (last)", async () => {
    mockFetch(
      {
        path: "/v2/stats1/funding.size:1m:fUSD/last",
        method: "GET",
      },
      [1700000000000, 1234567.89],
    );
    const data = await client.getStats({
      key: "funding.size",
      size: "1m",
      symbol: "fUSD",
      section: "last",
    });
    deepStrictEqual(data, {
      mts: 1700000000000,
      value: 1234567.89,
    } satisfies IStatV2);
  });

  test(".getStats() (pos.size with side)", async () => {
    mockFetch(
      {
        path: "/v2/stats1/pos.size:1m:tBTCUSD:long/hist",
        method: "GET",
        query: { limit: 1 },
      },
      [[1700000000000, 5.5]],
    );
    const data = await client.getStats({
      key: "pos.size",
      size: "1m",
      symbol: "tBTCUSD",
      side: "long",
      section: "hist",
      limit: 1,
    });
    deepStrictEqual(data, [
      { mts: 1700000000000, value: 5.5 },
    ] satisfies IStatV2[]);
  });

  test(".getStats() (credits.size.sym with trading pair)", async () => {
    mockFetch(
      {
        path: "/v2/stats1/credits.size.sym:1m:fUSD:tBTCUSD/hist",
        method: "GET",
        query: { limit: 1 },
      },
      [[1700000000000, 12345.67]],
    );
    const data = await client.getStats({
      key: "credits.size.sym",
      size: "1m",
      symbol: "fUSD",
      pair: "tBTCUSD",
      section: "hist",
      limit: 1,
    });
    deepStrictEqual(data, [
      { mts: 1700000000000, value: 12345.67 },
    ] satisfies IStatV2[]);
  });

  test(".getStats() (vol.1d uses 30m size)", async () => {
    mockFetch(
      {
        path: "/v2/stats1/vol.1d:30m:tBTCUSD/last",
        method: "GET",
      },
      [1700000000000, 100.5],
    );
    const data = await client.getStats({
      key: "vol.1d",
      size: "30m",
      symbol: "tBTCUSD",
      section: "last",
    });
    deepStrictEqual(data, {
      mts: 1700000000000,
      value: 100.5,
    } satisfies IStatV2);
  });

  test(".getStats() (vwap uses 1d size)", async () => {
    mockFetch(
      {
        path: "/v2/stats1/vwap:1d:tBTCUSD/last",
        method: "GET",
      },
      [1700000000000, 76000],
    );
    const data = await client.getStats({
      key: "vwap",
      size: "1d",
      symbol: "tBTCUSD",
      section: "last",
    });
    deepStrictEqual(data, {
      mts: 1700000000000,
      value: 76000,
    } satisfies IStatV2);
  });

  test(".getCandles() (last, with aggr and periods)", async () => {
    mockFetch(
      {
        path: "/v2/candles/trade:1D:fUSD:a30:p2:p30/last",
        method: "GET",
      },
      [1700000000000, 0.0004, 0.0005, 0.0006, 0.0003, 1000],
    );
    const data = await client.getCandles({
      timeframe: "1D",
      symbol: "fUSD",
      section: "last",
      aggr: 30,
      period_start: "2",
      period_end: "30",
    });
    deepStrictEqual(data, {
      mts: 1700000000000,
      open: 0.0004,
      close: 0.0005,
      high: 0.0006,
      low: 0.0003,
      volume: 1000,
    } satisfies ICandleV2);
  });

  test(".getCandles() (hist)", async () => {
    mockFetch(
      {
        path: "/v2/candles/trade:1m:tBTCUSD/hist",
        method: "GET",
        query: { limit: 1, sort: 1 },
      },
      [[1700000000000, 100, 101, 102, 99, 5]],
    );
    const data = await client.getCandles({
      timeframe: "1m",
      symbol: "tBTCUSD",
      section: "hist",
      limit: 1,
      sort: 1,
    });
    deepStrictEqual(data, [
      {
        mts: 1700000000000,
        open: 100,
        close: 101,
        high: 102,
        low: 99,
        volume: 5,
      },
    ] satisfies ICandleV2[]);
  });

  test(".getConfigs()", async () => {
    const response = [["BTC", "USD"]];
    mockFetch({ path: "/v2/conf/pub:list:currency", method: "GET" }, response);
    const data = await client.getConfigs({ configs: "pub:list:currency" });
    deepStrictEqual(data, response);
  });

  test(".getConfigs() (multiple)", async () => {
    const response = [["BTC"], [["BTCUSD"]]];
    mockFetch(
      {
        path: "/v2/conf/pub:list:currency,pub:list:pair:exchange",
        method: "GET",
      },
      response,
    );
    const data = await client.getConfigs({
      configs: ["pub:list:currency", "pub:list:pair:exchange"],
    });
    deepStrictEqual(data, response);
  });

  test(".getDerivativesStatus()", async () => {
    mockFetch(
      {
        path: "/v2/status/deriv",
        method: "GET",
        query: { keys: "tBTCF0:USTF0" },
      },
      [
        [
          "tBTCF0:USTF0",
          1700000000000,
          null,
          76900,
          76800,
          null,
          1000000,
          null,
          1700000600000,
          0.0001,
          0.0002,
          null,
          0.00005,
          null,
          null,
          76850,
          null,
          null,
          5000,
          null,
          null,
          null,
          70000,
          80000,
        ],
      ],
    );
    const data = await client.getDerivativesStatus({
      keys: ["tBTCF0:USTF0"],
    });
    deepStrictEqual(data, [
      {
        key: "tBTCF0:USTF0",
        mts: 1700000000000,
        deriv_price: 76900,
        spot_price: 76800,
        insurance_fund_balance: 1000000,
        next_funding_evt_timestamp_ms: 1700000600000,
        next_funding_accrued: 0.0001,
        next_funding_step: 0.0002,
        current_funding: 0.00005,
        mark_price: 76850,
        open_interest: 5000,
        clamp_min: 70000,
        clamp_max: 80000,
      },
    ] satisfies IDerivativeStatus[]);
  });

  test(".getDerivativesStatusHistory()", async () => {
    mockFetch(
      {
        path: "/v2/status/deriv/tBTCF0:USTF0/hist",
        method: "GET",
        query: { limit: 1 },
      },
      [
        [
          "tBTCF0:USTF0",
          1700000000000,
          null,
          76900,
          76800,
          null,
          1000000,
          null,
          1700000600000,
          0.0001,
          0.0002,
          null,
          0.00005,
          null,
          null,
          76850,
          null,
          null,
          5000,
          null,
          null,
          null,
          70000,
          80000,
        ],
      ],
    );
    const data = await client.getDerivativesStatusHistory({
      key: "tBTCF0:USTF0",
      limit: 1,
    });
    deepStrictEqual(data.length, 1);
    deepStrictEqual(data[0]?.key, "tBTCF0:USTF0");
  });

  test(".getLiquidations()", async () => {
    mockFetch(
      {
        path: "/v2/liquidations/hist",
        method: "GET",
        query: { limit: 1 },
      },
      [
        [
          "pos",
          7,
          1700000000000,
          null,
          "tBTCUSD",
          -1.5,
          76800,
          null,
          1,
          0,
          null,
          76900,
        ],
      ],
    );
    const data = await client.getLiquidations({ limit: 1 });
    deepStrictEqual(data, [
      {
        pos_id: 7,
        mts: 1700000000000,
        symbol: "tBTCUSD",
        amount: -1.5,
        base_price: 76800,
        is_match: 1,
        is_market_sold: 0,
        price_acquired: 76900,
      },
    ] satisfies ILiquidation[]);
  });

  test(".getLeaderboards()", async () => {
    mockFetch(
      {
        path: "/v2/rankings/plu:3h:tBTCUSD/hist",
        method: "GET",
        query: { limit: 1 },
      },
      [
        [
          1700000000000,
          null,
          "alice",
          1,
          null,
          null,
          1500,
          null,
          null,
          "@alice",
        ],
      ],
    );
    const data = await client.getLeaderboards({
      key: "plu",
      timeframe: "3h",
      symbol: "tBTCUSD",
      limit: 1,
    });
    deepStrictEqual(data, [
      {
        mts: 1700000000000,
        username: "alice",
        ranking: 1,
        value: 1500,
        twitter_handle: "@alice",
      },
    ] satisfies ILeaderboardEntry[]);
  });

  test(".getFundingStats()", async () => {
    mockFetch(
      {
        path: "/v2/funding/stats/fUSD/hist",
        method: "GET",
        query: { limit: 1 },
      },
      [
        [
          1700000000000,
          null,
          null,
          0.0004,
          4,
          null,
          null,
          50000,
          25000,
          null,
          null,
          0.000001,
        ],
      ],
    );
    const data = await client.getFundingStats({ symbol: "fUSD", limit: 1 });
    deepStrictEqual(data, [
      {
        mts: 1700000000000,
        frr: 0.0004,
        avg_period: 4,
        funding_amount: 50000,
        funding_amount_used: 25000,
        funding_below_threshold: 0.000001,
      },
    ] satisfies IFundingStat[]);
  });

  test(".getVASPs()", async () => {
    const response: IVASPs = [
      { id: "did:ethr:0xabc", name: "Example VASP" },
      { id: "did:ethr:0xdef", name: "Another VASP" },
    ];
    mockFetch({ path: "/v2/ext/vasps", method: "GET" }, response);
    const data = await client.getVASPs();
    deepStrictEqual(data, response);
  });

  test(".getMarketAveragePrice()", async () => {
    const body = { symbol: "tBTCUSD", amount: "1.0" };
    mockFetch(
      {
        path: "/v2/calc/trade/avg",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: (s) => s === JSON.stringify(body),
      },
      [76812.5, 1.0],
    );
    const data = await client.getMarketAveragePrice(body);
    deepStrictEqual(data, {
      rate_avg: 76812.5,
      amount: 1.0,
    } satisfies IMarketAveragePrice);
  });

  test(".getForeignExchangeRate()", async () => {
    const body = { ccy1: "BTC", ccy2: "USD" };
    mockFetch(
      {
        path: "/v2/calc/fx",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: (s) => s === JSON.stringify(body),
      },
      [76812.5],
    );
    const data = await client.getForeignExchangeRate(body);
    deepStrictEqual(data, {
      current_rate: 76812.5,
    } satisfies IForeignExchangeRate);
  });

  test("throws BitfinexError on GET maintenance response", async () => {
    mockFetch({ path: "/v2/ticker/tBTCUSD", method: "GET" }, [
      "error",
      20060,
      "maintenance",
    ]);
    await rejects(
      () => client.getTicker({ symbol: "tBTCUSD" }),
      (error: unknown) => {
        if (!(error instanceof BitfinexError)) {
          return false;
        }
        deepStrictEqual(error.code, 20060);
        deepStrictEqual(error.name, "BitfinexError");
        deepStrictEqual(error.message, "Bitfinex error 20060: maintenance");
        return true;
      },
    );
  });

  test("throws BitfinexError on POST error response", async () => {
    mockFetch({ path: "/v2/calc/fx", method: "POST" }, [
      "error",
      10020,
      "ratelimit: too many requests",
    ]);
    await rejects(
      () => client.getForeignExchangeRate({ ccy1: "BTC", ccy2: "USD" }),
      (error: unknown) => {
        if (!(error instanceof BitfinexError)) {
          return false;
        }
        deepStrictEqual(error.code, 10020);
        return true;
      },
    );
  });

  test("does not treat unrelated arrays as errors", async () => {
    mockFetch({ path: "/v2/ticker/tBTCUSD", method: "GET" }, [
      "error",
      20060,
      "maintenance",
      "extra",
    ]);
    // Length 4 — must NOT trigger BitfinexError; passes through to the decoder.
    const data = await client.getTicker({ symbol: "tBTCUSD" });
    deepStrictEqual(data.type, "trading_ticker");
  });

  test("requires numeric code and string message", async () => {
    // String code — wrong shape, do not treat as Bitfinex error envelope.
    mockFetch({ path: "/v2/ticker/tBTCUSD", method: "GET" }, [
      "error",
      "20060",
      "maintenance",
    ]);
    const data = await client.getTicker({ symbol: "tBTCUSD" });
    deepStrictEqual(data.type, "trading_ticker");
  });
});
