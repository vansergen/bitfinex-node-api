import * as assert from "assert";
import * as nock from "nock";
import {
  AuthenticatedClient1,
  DefaultTimeout,
  DefaultSymbol,
  DefaultCurrency,
  AccountInfo
} from "../index";

const key = "BitfinexAPIKey";
const secret = "BitfinexAPISecret";
const apiUri = "https://api.bitfinex.com";

const client = new AuthenticatedClient1({ key, secret });

suite("AuthenticatedClient v1", () => {
  test("constructor", () => {
    assert.deepStrictEqual(client._rpoptions, {
      baseUrl: apiUri,
      timeout: DefaultTimeout,
      json: true
    });
    assert.deepStrictEqual(client.symbol, DefaultSymbol);
    assert.deepStrictEqual(client.currency, DefaultCurrency);
    assert.deepStrictEqual(client.key, key);
    assert.deepStrictEqual(client.secret, secret);
  });

  test(".post()", async () => {
    const response: any = {};
    const uri = "/some-uri";
    nock(apiUri)
      .post(uri, ({ request, nonce }) => request === uri && nonce)
      .reply(200, response);
    const data = await client.post({ uri });
    assert.deepStrictEqual(data, response);
  });

  test(".getAccountInfo()", async () => {
    const response: AccountInfo = [
      {
        leo_fee_disc_c2c: "0.0",
        leo_fee_disc_c2s: "0.0",
        leo_fee_disc_c2f: 0,
        maker_fees: "0.1",
        taker_fees: "0.2",
        fees: [
          {
            pairs: "BTC",
            maker_fees: "0.1",
            taker_fees: "0.2"
          },
          {
            pairs: "LTC",
            maker_fees: "0.1",
            taker_fees: "0.2"
          },
          {
            pairs: "ETH",
            maker_fees: "0.1",
            taker_fees: "0.2"
          }
        ]
      }
    ];
    const uri = "/v1/account_infos";
    nock(apiUri)
      .post(uri, ({ request }) => request === uri)
      .reply(200, response);
    const data = await client.getAccountInfo();
    assert.deepStrictEqual(data, response);
  });
});
