import * as assert from "assert";
import * as nock from "nock";
import {
  PublicClient1,
  DefaultSymbol,
  DefaultTimeout,
  Ticker,
  Stats
} from "../index";

const client = new PublicClient1();
const apiUri = "https://api.bitfinex.com";

suite("PublicClient v1", () => {
  test("constructor", () => {
    assert.deepStrictEqual(client._rpoptions, {
      baseUrl: apiUri,
      timeout: DefaultTimeout,
      json: true
    });
    assert.deepStrictEqual(client.symbol, DefaultSymbol);
  });

  test("constructor (with options)", () => {
    const symbol = "ethbtc";
    const timeout = 20000;
    const client = new PublicClient1({ symbol, timeout });
    assert.deepStrictEqual(client._rpoptions, {
      baseUrl: apiUri,
      timeout: timeout,
      json: true
    });
    assert.deepStrictEqual(client.symbol, symbol);
  });

  test(".getTicker()", async () => {
    const symbol = "ethbtc";
    const response: Ticker = {
      mid: "244.755",
      bid: "244.75",
      ask: "244.76",
      last_price: "244.82",
      low: "244.2",
      high: "248.19",
      volume: "7842.11542563",
      timestamp: "1444253422.348340958"
    };
    nock(apiUri)
      .get("/v1/pubticker/" + symbol)
      .reply(200, response);
    const data = await client.getTicker({ symbol });
    assert.deepStrictEqual(data, response);
  });

  test(".getStats()", async () => {
    const symbol = "ethbtc";
    const response: Stats = [
      {
        period: 1,
        volume: "7967.96766158"
      },
      {
        period: 7,
        volume: "55938.67260266"
      },
      {
        period: 30,
        volume: "275148.09653645"
      }
    ];
    nock(apiUri)
      .get("/v1/stats/" + symbol)
      .reply(200, response);
    const data = await client.getStats({ symbol });
    assert.deepStrictEqual(data, response);
  });
});
