import assert from "assert";
import nock from "nock";
import {
  AuthenticatedClient1,
  Signer,
  DefaultSymbol,
  DefaultCurrency,
  AccountInfo,
  AccountFees,
  Summary,
  DepositAddress,
  KeyPermissions,
  MarginInformation,
  WalletBalance,
  TransferResponse,
  WithdrawResponse,
  OrderResponse,
  OrderParams,
  NewOrdersResponse,
  Position,
  HistoryBalance,
  DepositWithdrawal,
  PastTrade,
  Offer,
  aff_code,
} from "../index";

const key = "BitfinexAPIKey";
const secret = "BitfinexAPISecret";
const apiUri = "https://api.bitfinex.com";
const NONCE = 1;

const client = new AuthenticatedClient1({ key, secret });

suite("AuthenticatedClient v1", () => {
  test(".post()", async () => {
    const otherClient = new AuthenticatedClient1({ key, secret });
    const _nonce = (): number => NONCE;
    otherClient.nonce = _nonce;
    const response = {} as const;
    const uri = "/some-uri";
    const payload = Buffer.from(
      JSON.stringify({ nonce: `NONCE`, request: uri })
    ).toString("base64");
    nock(apiUri)
      .post(
        uri,
        ({ request, nonce }) => request === uri && typeof nonce === "string",
        { reqheaders: { ...Signer({ key, secret, payload }) } }
      )
      .reply(200, response);
    const data = await client.post(uri);
    assert.deepStrictEqual(data, response);
    assert.deepStrictEqual(otherClient.nonce, _nonce);
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
            taker_fees: "0.2",
          },
          {
            pairs: "LTC",
            maker_fees: "0.1",
            taker_fees: "0.2",
          },
          {
            pairs: "ETH",
            maker_fees: "0.1",
            taker_fees: "0.2",
          },
        ],
      },
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
        ETC: "0.01",
      },
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
          vol_BFX_maker: 0,
        },
      ],
      fees_funding_30d: {},
      fees_funding_total_30d: 0,
      fees_trading_30d: {},
      fees_trading_total_30d: 0,
      maker_fee: 0.001,
      taker_fee: 0.002,
      deriv_maker_rebate: -0.0002,
      deriv_taker_fee: 0.00075,
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
      address: "t1ZQ8G1k4TyPUnb8gyJyNGogApsHVK7mysp",
    };
    const uri = "/v1/deposit/new";
    const method = "zcash";
    const wallet_name = "trading" as const;
    const renew = 1 as const;
    const params = { wallet_name, renew, method };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, params);
        assert.ok(nonce);
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
      withdraw: { read: false, write: true },
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
          tradable_balance: "732.192590045666666667",
        },
        {
          on_pair: "LTCUSD",
          initial_margin: "30.0",
          margin_requirement: "15.0",
          tradable_balance: "732.192590045666666667",
        },
      ],
      message:
        "Margin requirement, leverage and tradable balance are now per pair. Values displayed in the root of the JSON message are incorrect (deprecated). You will find the correct ones under margin_limits, for each pair. Please update your code as soon as possible.",
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
      { type: "deposit", currency: "zec", amount: "0.0", available: "0.0" },
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
        message: "1.00954735 Bitcoin Cash transfered from Margin to Exchange",
      },
    ];
    const uri = "/v1/transfer";
    const amount = "1.00954735";
    const currency = "BAB";
    const walletfrom = "trading" as const;
    const walletto = "exchange" as const;
    const params = { amount, currency, walletfrom, walletto };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, params);
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.transfer(params);
    assert.deepStrictEqual(data, response);
  });

  test(".transfer() (with no `currency`)", async () => {
    const response: TransferResponse = [
      {
        status: "success",
        message: "1.00954735 Bitcoin Cash transfered from Margin to Exchange",
      },
    ];
    const uri = "/v1/transfer";
    const amount = "1.00954735";
    const walletfrom = "trading" as const;
    const walletto = "exchange" as const;
    const params = { amount, walletfrom, walletto };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { ...params, currency: DefaultCurrency });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.transfer(params);
    assert.deepStrictEqual(data, response);
  });

  test(".withdraw()", async () => {
    const response: WithdrawResponse = [
      {
        wallettype: "exchange",
        method: "bitcoin",
        address: "1DKwqRhDmVyHJDL4FUYpDmQMYA3Rsxtvur",
        invoice: null,
        payment_id: null,
        amount: "1.0",
        status: "error",
        message:
          "Cannot withdraw 1.0004 BTC from your exchange wallet. The available balance is only 0.0 BTC. If you have limit orders, open positions, unused or active margin funding, this will decrease your available balance. To increase it, you can cancel limit orders or reduce/close your positions.",
        withdrawal_id: 0,
        fees: "0.0004",
      },
    ];
    const uri = "/v1/withdraw";
    const amount = "1.0";
    const address = "1DKwqRhDmVyHJDL4FUYpDmQMYA3Rsxtvur";
    const walletselected = "exchange" as const;
    const withdraw_type = "bitcoin";
    const params = { amount, address, walletselected, withdraw_type };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, params);
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.withdraw(params);
    assert.deepStrictEqual(data, response);
  });

  test(".newOrder()", async () => {
    const response: OrderResponse = {
      id: 1,
      cid: 4,
      cid_date: "2019-11-29",
      gid: null,
      symbol: "etcusd",
      exchange: "bitfinex",
      price: "3.0",
      avg_execution_price: "0.0",
      side: "buy",
      type: "limit",
      timestamp: "1575025695.649883424",
      is_live: true,
      is_cancelled: false,
      is_hidden: false,
      oco_order: null,
      was_forced: false,
      original_amount: "1.0",
      remaining_amount: "1.0",
      executed_amount: "0.0",
      src: "api",
      meta: { $F7: 1 },
      order_id: 4,
    };
    const uri = "/v1/order/new";
    const amount = "1";
    const price = "3";
    const type = "limit" as const;
    const exchange = "bitfinex" as const;
    const symbol = "ETCUSD";
    const side = "buy" as const;
    const is_postonly = true;
    const params = { amount, price, type, exchange, symbol, side, is_postonly };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { ...params, aff_code });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.newOrder(params);
    assert.deepStrictEqual(data, response);
  });

  test(".newOrder() (with no `symbol`)", async () => {
    const response: OrderResponse = {
      id: 1,
      cid: 4,
      cid_date: "2019-11-29",
      gid: null,
      symbol: "etcusd",
      exchange: "bitfinex",
      price: "3.0",
      avg_execution_price: "0.0",
      side: "buy",
      type: "limit",
      timestamp: "1575025695.649883424",
      is_live: true,
      is_cancelled: false,
      is_hidden: false,
      oco_order: null,
      was_forced: false,
      original_amount: "1.0",
      remaining_amount: "1.0",
      executed_amount: "0.0",
      src: "api",
      meta: { $F7: 1 },
      order_id: 4,
    };
    const uri = "/v1/order/new";
    const amount = "1";
    const price = "3";
    const type = "limit" as const;
    const exchange = "bitfinex" as const;
    const side = "buy" as const;
    const is_postonly = true;
    const params = { amount, price, type, exchange, side, is_postonly };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, {
          ...params,
          symbol: DefaultSymbol,
          aff_code,
        });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.newOrder(params);
    assert.deepStrictEqual(data, response);
  });

  test(".newOrders()", async () => {
    const response: NewOrdersResponse = {
      order_ids: [
        {
          id: 654,
          cid: 456,
          cid_date: "2019-11-29",
          gid: null,
          symbol: "etcusd",
          exchange: "bitfinex",
          price: "3.0",
          avg_execution_price: "0.0",
          side: "buy",
          type: "limit",
          timestamp: "1575030779.494391951",
          is_live: true,
          is_cancelled: false,
          is_hidden: false,
          oco_order: null,
          was_forced: false,
          original_amount: "1.0",
          remaining_amount: "1.0",
          executed_amount: "0.0",
          src: "api",
          meta: { $F7: 1 },
        },
        {
          id: 321,
          cid: 123,
          cid_date: "2019-11-29",
          gid: null,
          symbol: "etcusd",
          exchange: "bitfinex",
          price: "5.0",
          avg_execution_price: "0.0",
          side: "buy",
          type: "limit",
          timestamp: "1575030779.513995919",
          is_live: true,
          is_cancelled: false,
          is_hidden: false,
          oco_order: null,
          was_forced: false,
          original_amount: "2.0",
          remaining_amount: "2.0",
          executed_amount: "0.0",
          src: "api",
          meta: { $F7: 1 },
        },
      ],
      status: "success",
    };
    const uri = "/v1/order/new/multi";
    const order1: OrderParams = {
      amount: "1",
      price: "3",
      type: "limit",
      exchange: "bitfinex",
      symbol: "ETCUSD",
      side: "buy",
      is_postonly: true,
    };
    const order2: OrderParams = {
      amount: "2",
      price: "5",
      type: "limit",
      exchange: "bitfinex",
      symbol: "ETCUSD",
      side: "buy",
      is_postonly: true,
    };
    const orders = [order1, order2];
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.ok(typeof nonce === "string");
        assert.deepStrictEqual(rest, { orders });
        return request === uri;
      })
      .reply(200, response);
    const data = await client.newOrders({ orders });
    assert.deepStrictEqual(data, response);
  });

  test(".newOrders() (with no `symbol`)", async () => {
    const response: NewOrdersResponse = {
      order_ids: [
        {
          id: 654,
          cid: 456,
          cid_date: "2019-11-29",
          gid: null,
          symbol: "etcusd",
          exchange: "bitfinex",
          price: "3.0",
          avg_execution_price: "0.0",
          side: "buy",
          type: "limit",
          timestamp: "1575030779.494391951",
          is_live: true,
          is_cancelled: false,
          is_hidden: false,
          oco_order: null,
          was_forced: false,
          original_amount: "1.0",
          remaining_amount: "1.0",
          executed_amount: "0.0",
          src: "api",
          meta: { $F7: 1 },
        },
        {
          id: 321,
          cid: 123,
          cid_date: "2019-11-29",
          gid: null,
          symbol: "etcusd",
          exchange: "bitfinex",
          price: "5.0",
          avg_execution_price: "0.0",
          side: "buy",
          type: "limit",
          timestamp: "1575030779.513995919",
          is_live: true,
          is_cancelled: false,
          is_hidden: false,
          oco_order: null,
          was_forced: false,
          original_amount: "2.0",
          remaining_amount: "2.0",
          executed_amount: "0.0",
          src: "api",
          meta: { $F7: 1 },
        },
      ],
      status: "success",
    };
    const uri = "/v1/order/new/multi";
    const order1: OrderParams = {
      amount: "1",
      price: "3",
      type: "limit",
      exchange: "bitfinex",
      side: "buy",
      is_postonly: true,
    };
    const order2: OrderParams = {
      amount: "2",
      price: "5",
      type: "limit",
      exchange: "bitfinex",
      symbol: "ETCUSD",
      side: "buy",
      is_postonly: true,
    };
    const orders = [order1, order2];
    const expected = { orders: [{ ...order1, symbol: DefaultSymbol }, order2] };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.ok(typeof nonce === "string");
        assert.deepStrictEqual(rest, expected);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.newOrders({ orders });
    assert.deepStrictEqual(data, response);
  });

  test(".cancelOrder()", async () => {
    const response: OrderResponse = {
      id: 234,
      cid: 5432,
      cid_date: "2019-11-29",
      gid: null,
      symbol: "etcusd",
      exchange: "bitfinex",
      price: "3.0",
      avg_execution_price: "0.0",
      side: "buy",
      type: "limit",
      timestamp: "1575031707.0",
      is_live: true,
      is_cancelled: false,
      is_hidden: false,
      oco_order: null,
      was_forced: false,
      original_amount: "1.0",
      remaining_amount: "1.0",
      executed_amount: "0.0",
      src: "api",
      meta: { $F7: 1 },
    };
    const uri = "/v1/order/cancel";
    const order_id = 234;
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.ok(typeof nonce === "string");
        assert.deepStrictEqual(rest, { order_id });
        return request === uri;
      })
      .reply(200, response);
    const data = await client.cancelOrder({ order_id });
    assert.deepStrictEqual(data, response);
  });

  test(".cancelOrders()", async () => {
    const response = {
      result: "All (2) submitted for cancellation; waiting for confirmation.",
    };
    const uri = "/v1/order/cancel/multi";
    const order_id1 = 123;
    const order_id2 = 321;
    const order_ids = [order_id1, order_id2];
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.ok(typeof nonce === "string");
        assert.deepStrictEqual(rest, { order_ids });
        return request === uri;
      })
      .reply(200, response);
    const data = await client.cancelOrders({ order_ids });
    assert.deepStrictEqual(data, response);
  });

  test(".cancelAllOrders()", async () => {
    const response = {
      result: "All (1) submitted for cancellation; waiting for confirmation.",
    };
    const uri = "/v1/order/cancel/all";
    nock(apiUri)
      .post(uri, ({ request }) => request === uri)
      .reply(200, response);
    const data = await client.cancelAllOrders();
    assert.deepStrictEqual(data, response);
  });

  test(".replaceOrder()", async () => {
    const response: OrderResponse = {
      id: 1,
      cid: 47212318175544,
      cid_date: "2019-12-28",
      gid: null,
      symbol: "etcusd",
      exchange: "bitfinex",
      price: "101.0",
      avg_execution_price: "0.0",
      side: "sell",
      type: "limit",
      timestamp: "1577538417.01",
      is_live: true,
      is_cancelled: false,
      is_hidden: false,
      oco_order: null,
      was_forced: false,
      original_amount: "3.0",
      remaining_amount: "3.0",
      executed_amount: "0.0",
      src: "api",
      meta: { $F7: 1 },
      order_id: 1,
    };
    const uri = "/v1/order/cancel/replace";
    const amount = "3";
    const price = "101";
    const type = "limit" as const;
    const exchange = "bitfinex" as const;
    const side = "sell" as const;
    const is_postonly = true;
    const symbol = "ETCUSD";
    const order_id = 1;
    const params = {
      order_id,
      amount,
      price,
      type,
      exchange,
      symbol,
      side,
      is_postonly,
    };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { ...params, aff_code });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.replaceOrder(params);
    assert.deepStrictEqual(data, response);
  });

  test(".replaceOrder() (with no `symbol`)", async () => {
    const response: OrderResponse = {
      id: 1,
      cid: 47212318175544,
      cid_date: "2019-12-28",
      gid: null,
      symbol: DefaultSymbol,
      exchange: "bitfinex",
      price: "101.0",
      avg_execution_price: "0.0",
      side: "sell",
      type: "limit",
      timestamp: "1577538417.01",
      is_live: true,
      is_cancelled: false,
      is_hidden: false,
      oco_order: null,
      was_forced: false,
      original_amount: "3.0",
      remaining_amount: "3.0",
      executed_amount: "0.0",
      src: "api",
      meta: { $F7: 1 },
      order_id: 1,
    };
    const uri = "/v1/order/cancel/replace";
    const amount = "3";
    const price = "101";
    const type = "limit" as const;
    const exchange = "bitfinex" as const;
    const side = "sell" as const;
    const is_postonly = true;
    const order_id = 1;
    const params = {
      order_id,
      amount,
      price,
      type,
      exchange,
      side,
      is_postonly,
    };
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, {
          ...params,
          symbol: DefaultSymbol,
          aff_code,
        });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.replaceOrder(params);
    assert.deepStrictEqual(data, response);
  });

  test(".getOrder()", async () => {
    const response: OrderResponse = {
      id: 234,
      cid: 321,
      cid_date: "2019-12-28",
      gid: null,
      symbol: "etcusd",
      exchange: "bitfinex",
      price: "101.0",
      avg_execution_price: "0.0",
      side: "sell",
      type: "limit",
      timestamp: "1577538428.0",
      is_live: true,
      is_cancelled: false,
      is_hidden: false,
      oco_order: null,
      was_forced: false,
      original_amount: "3.0",
      remaining_amount: "3.0",
      executed_amount: "0.0",
      src: "api",
      meta: { $F7: 1 },
    };
    const uri = "/v1/order/status";
    const order_id = 234;
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { order_id });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.getOrder({ order_id });
    assert.deepStrictEqual(data, response);
  });

  test(".getOrders()", async () => {
    const response: OrderResponse[] = [
      {
        id: 234,
        cid: 321,
        cid_date: "2019-12-28",
        gid: null,
        symbol: "etcusd",
        exchange: "bitfinex",
        price: "101.0",
        avg_execution_price: "0.0",
        side: "sell",
        type: "limit",
        timestamp: "1577538428.0",
        is_live: true,
        is_cancelled: false,
        is_hidden: false,
        oco_order: null,
        was_forced: false,
        original_amount: "3.0",
        remaining_amount: "3.0",
        executed_amount: "0.0",
        src: "api",
        meta: { $F7: 1 },
      },
    ];
    const uri = "/v1/orders";
    nock(apiUri)
      .post(uri, ({ request, nonce }) => {
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.getOrders();
    assert.deepStrictEqual(data, response);
  });

  test(".getOrderHistory()", async () => {
    const response: OrderResponse[] = [
      {
        id: 234,
        cid: 321,
        cid_date: "2019-12-28",
        gid: null,
        symbol: "etcusd",
        exchange: "bitfinex",
        price: "101.0",
        avg_execution_price: "0.0",
        side: "sell",
        type: "limit",
        timestamp: "1577538428.0",
        is_live: true,
        is_cancelled: false,
        is_hidden: false,
        oco_order: null,
        was_forced: false,
        original_amount: "3.0",
        remaining_amount: "3.0",
        executed_amount: "0.0",
        src: "api",
        meta: { $F7: 1 },
      },
    ];
    const limit = 25;
    const uri = "/v1/orders/hist";
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { limit });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.getOrderHistory({ limit });
    assert.deepStrictEqual(data, response);
  });

  test(".getPositions()", async () => {
    const response: Position[] = [
      {
        id: 943715,
        symbol: "btcusd",
        status: "ACTIVE",
        base: "246.94",
        amount: "1.0",
        timestamp: "1444141857.0",
        swap: "0.0",
        pl: "-2.22042",
      },
    ];
    const uri = "/v1/positions";
    nock(apiUri)
      .post(uri, ({ request, nonce }) => {
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.getPositions();
    assert.deepStrictEqual(data, response);
  });

  test(".claimPosition()", async () => {
    const response: Position = {
      id: 943715,
      symbol: "btcusd",
      status: "ACTIVE",
      base: "246.94",
      amount: "1.0",
      timestamp: "1444141857.0",
      swap: "0.0",
      pl: "-2.2304",
    };
    const uri = "/v1/position/claim";
    const position_id = 943715;
    const amount = "0.5";
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { position_id, amount });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.claimPosition({ position_id, amount });
    assert.deepStrictEqual(data, response);
  });

  test(".getBalanceHistory()", async () => {
    const response: HistoryBalance[] = [
      {
        currency: "USD",
        amount: "-246.94",
        balance: "515.4476526",
        description: "Position claimed @ 245.2 on wallet trading",
        timestamp: "1444277602.0",
      },
    ];
    const uri = "/v1/history";
    const currency = "USD";
    const since = "1444277602.0";
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { currency, since });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.getBalanceHistory({ currency, since });
    assert.deepStrictEqual(data, response);
  });

  test(".getDepositsWithdrawals()", async () => {
    const response: DepositWithdrawal[] = [
      {
        id: 581183,
        txid: 123456,
        currency: "BTC",
        method: "BITCOIN",
        type: "WITHDRAWAL",
        amount: ".01",
        description: "3QXYWgRGX2BPYBpUDBssGbeWEa5zq6snBZ, offchain transfer ",
        address: "3QXYWgRGX2BPYBpUDBssGbeWEa5zq6snBZ",
        status: "COMPLETED",
        timestamp: "1443833327.0",
        timestamp_created: "1443833327.1",
        fee: 0.1,
      },
    ];
    const uri = "/v1/history/movements";
    const currency = "BTC";
    const since = "1444277602.0";
    const limit = 10;
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { currency, since, limit });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.getDepositsWithdrawals({
      currency,
      since,
      limit,
    });
    assert.deepStrictEqual(data, response);
  });

  test(".getPastTrades()", async () => {
    const response: PastTrade[] = [
      {
        price: "216.94",
        amount: "1.0",
        timestamp: "1444131957.0",
        type: "Buy",
        fee_currency: "USD",
        fee_amount: "-0.53328",
        tid: 11970839,
        order_id: 442913929,
      },
    ];
    const uri = "/v1/mytrades";
    const symbol = "BTCEUR";
    const limit_trades = 1;
    const reverse = 1;
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { symbol, reverse, limit_trades });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.getPastTrades({ symbol, reverse, limit_trades });
    assert.deepStrictEqual(data, response);
  });

  test(".getPastTrades() (with no `symbol`)", async () => {
    const response: PastTrade[] = [
      {
        price: "246.94",
        amount: "1.0",
        timestamp: "1444141857.0",
        type: "Buy",
        fee_currency: "USD",
        fee_amount: "-0.49388",
        tid: 11970839,
        order_id: 446913929,
      },
    ];
    const uri = "/v1/mytrades";
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { symbol: DefaultSymbol });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.getPastTrades();
    assert.deepStrictEqual(data, response);
  });

  test(".newOffer()", async () => {
    const response: Offer = {
      id: 13800585,
      currency: "USD",
      rate: "20.0",
      period: 2,
      direction: "lend",
      timestamp: "1444279698.21175971",
      is_live: true,
      is_cancelled: false,
      original_amount: "50.0",
      remaining_amount: "50.0",
      executed_amount: "0.0",
      offer_id: 13800585,
    };
    const uri = "/v1/offer/new";
    const currency = "USD";
    const amount = "50.0";
    const rate = "20.0";
    const period = 2;
    const direction = "lend";
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, {
          currency,
          amount,
          rate,
          period,
          direction,
        });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.newOffer({
      currency,
      amount,
      rate,
      period,
      direction,
    });
    assert.deepStrictEqual(data, response);
  });

  test(".cancelOffer()", async () => {
    const response: Offer = {
      id: 13800585,
      currency: "USD",
      rate: "20.0",
      period: 2,
      direction: "lend",
      timestamp: "1444279698.0",
      is_live: true,
      is_cancelled: false,
      original_amount: "50.0",
      remaining_amount: "50.0",
      executed_amount: "0.0",
    };
    const uri = "/v1/offer/cancel";
    const offer_id = 13800585;
    nock(apiUri)
      .post(uri, ({ request, nonce, ...rest }) => {
        assert.deepStrictEqual(rest, { offer_id });
        assert.ok(nonce);
        return request === uri;
      })
      .reply(200, response);
    const data = await client.cancelOffer({ offer_id });
    assert.deepStrictEqual(data, response);
  });
});
