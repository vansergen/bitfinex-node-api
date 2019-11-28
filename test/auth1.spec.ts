import * as assert from "assert";
import * as nock from "nock";
import {
  AuthenticatedClient1,
  DefaultTimeout,
  DefaultSymbol,
  DefaultCurrency,
  AccountInfo,
  AccountFees,
  Summary,
  DepositAddress,
  KeyPermissions,
  MarginInformation,
  WalletBalance,
  TransferResponse
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

  test(".getAccountFees()", async () => {
    const response: AccountFees = {
      withdraw: {
        BTC: "0.0004",
        LTC: "0.001",
        ETH: "0.00135",
        ETC: "0.01"
      }
    };
    const uri = "/v1/account_fees";
    nock(apiUri)
      .post(uri, ({ request }) => request === uri)
      .reply(200, response);
    const data = await client.getAccountFees();
    assert.deepStrictEqual(data, response);
  });

  test(".getSummary()", async () => {
    const response: Summary = {
      time: "2019-11-28T09:04:05.375000Z",
      status: { resid_hint: null },
      is_locked: false,
      trade_vol_30d: [
        {
          curr: "Total (USD)",
          vol: 0,
          vol_maker: 0,
          vol_BFX: 0,
          vol_BFX_maker: 0
        }
      ],
      fees_funding_30d: {},
      fees_funding_total_30d: 0,
      fees_trading_30d: {},
      fees_trading_total_30d: 0,
      maker_fee: 0.001,
      taker_fee: 0.002,
      deriv_maker_rebate: -0.0002,
      deriv_taker_fee: 0.00075
    };
    const uri = "/v1/summary";
    nock(apiUri)
      .post(uri, ({ request }) => request === uri)
      .reply(200, response);
    const data = await client.getSummary();
    assert.deepStrictEqual(data, response);
  });

  test(".getDepositAddress()", async () => {
    const response: DepositAddress = {
      result: "success",
      method: "zcash",
      currency: "ZEC",
      address: "t1ZQ8G1k4TyPUnb8gyJyNGogApsHVK7mysp"
    };
    const uri = "/v1/deposit/new";
    const method = "zcash";
    const wallet_name: "trading" = "trading";
    const renew: 1 = 1;
    const params = { wallet_name, renew, method };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, params);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.getDepositAddress(params);
    assert.deepStrictEqual(data, response);
  });

  test(".getKeyPermissions()", async () => {
    const response: KeyPermissions = {
      account: { read: true, write: false },
      history: { read: true, write: false },
      orders: { read: true, write: true },
      positions: { read: true, write: true },
      funding: { read: true, write: true },
      wallets: { read: true, write: true },
      withdraw: { read: false, write: true }
    };
    const uri = "/v1/key_info";
    nock(apiUri)
      .post(uri, ({ request }) => request === uri)
      .reply(200, response);
    const data = await client.getKeyPermissions();
    assert.deepStrictEqual(data, response);
  });

  test(".getMarginInformation()", async () => {
    const response: MarginInformation = {
      margin_balance: "241.90964507",
      tradable_balance: "603.774112675",
      unrealized_pl: "0.0",
      unrealized_swap: "0.0",
      net_value: "241.90964507",
      required_margin: "0.0",
      leverage: "2.5",
      margin_requirement: "0.0",
      margin_limits: [
        {
          on_pair: "BTCUSD",
          initial_margin: "30.0",
          margin_requirement: "15.0",
          tradable_balance: "732.192590045666666667"
        },
        {
          on_pair: "LTCUSD",
          initial_margin: "30.0",
          margin_requirement: "15.0",
          tradable_balance: "732.192590045666666667"
        }
      ],
      message:
        "Margin requirement, leverage and tradable balance are now per pair. Values displayed in the root of the JSON message are incorrect (deprecated). You will find the correct ones under margin_limits, for each pair. Please update your code as soon as possible."
    };
    const uri = "/v1/margin_infos";
    nock(apiUri)
      .post(uri, ({ request }) => request === uri)
      .reply(200, response);
    const data = await client.getMarginInformation();
    assert.deepStrictEqual(data, response);
  });

  test(".getWalletBalances()", async () => {
    const response: WalletBalance[] = [
      { type: "exchange", currency: "zil", amount: "0.0", available: "0.0" },
      { type: "trading", currency: "bab", amount: "0.0", available: "0.0" },
      { type: "deposit", currency: "zec", amount: "0.0", available: "0.0" }
    ];
    const uri = "/v1/balances";
    nock(apiUri)
      .post(uri, ({ request }) => request === uri)
      .reply(200, response);
    const data = await client.getWalletBalances();
    assert.deepStrictEqual(data, response);
  });

  test(".transfer()", async () => {
    const response: TransferResponse = [
      {
        status: "success",
        message: "1.00954735 Bitcoin Cash transfered from Margin to Exchange"
      }
    ];
    const uri = "/v1/transfer";
    const amount = "1.00954735";
    const currency = "BAB";
    const walletfrom: "trading" = "trading";
    const walletto: "exchange" = "exchange";
    const params = { amount, currency, walletfrom, walletto };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, params);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.transfer(params);
    assert.deepStrictEqual(data, response);
  });
});
