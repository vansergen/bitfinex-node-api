import * as assert from "assert";
import { PublicClient1, DefaultSymbol, DefaultTimeout } from "../index";

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
});
