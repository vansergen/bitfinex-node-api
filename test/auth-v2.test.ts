/* eslint-disable @typescript-eslint/no-floating-promises */
import { deepStrictEqual, ok } from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import {
  ApiUrlV2,
  ApiUrlV2Auth,
  AuthenticatedClientV2,
  createMonotonicNonce,
  type IAlertV2,
  type IAuthTradeV2,
  type IDepositAddressAllEntry,
  type IDerivCollateralLimits,
  type IFundingCreditV2,
  type IFundingLoanV2,
  type IFundingOfferV2,
  type IFundingTradeAuthV2,
  type IKeyPermissionV2,
  type ILedgerEntryV2,
  type IMarginInfoBaseV2,
  type IMarginInfoSymbolV2,
  type IPositionV2,
  type IThalexFreeTransferCountV2,
  type IThalexTransferV2,
  type IWalletV2,
  signatureV2,
} from "../index.js";
import { mockFetch } from "./mock.js";

const key = "test-key";
const secret = "test-secret";
const nonce = "1700000000000000";

const client = new AuthenticatedClientV2({
  key,
  secret,
  nonce: (): string => nonce,
});

function authHeaders(
  path: string,
  body: object,
): (h: Record<string, string | undefined>) => boolean {
  return (headers) => {
    const expected = signatureV2({
      key,
      secret,
      path,
      nonce,
      body: JSON.stringify(body),
    });
    deepStrictEqual(headers["bfx-apikey"], expected["bfx-apikey"]);
    deepStrictEqual(headers["bfx-nonce"], expected["bfx-nonce"]);
    deepStrictEqual(headers["bfx-signature"], expected["bfx-signature"]);
    deepStrictEqual(headers["content-type"], "application/json");
    return true;
  };
}

function expectBody(body: object): (s: string | null) => boolean {
  const expected = JSON.stringify(body);
  return (s) => s === expected;
}

describe("AuthenticatedClientV2", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("constructor defaults to the authenticated host", () => {
    const c = new AuthenticatedClientV2({ key, secret });
    deepStrictEqual(c.base_url.toString(), ApiUrlV2Auth);
  });

  test("constructor accepts a custom url override", () => {
    const c = new AuthenticatedClientV2({ key, secret, url: ApiUrlV2 });
    deepStrictEqual(c.base_url.toString(), ApiUrlV2);
  });

  test("nonce setter/getter", () => {
    const c = new AuthenticatedClientV2({ key, secret });
    const fn = (): string => "42";
    c.nonce = fn;
    deepStrictEqual(c.nonce, fn);
  });

  test("default nonce is strictly monotonic, even within the same ms", () => {
    const c = new AuthenticatedClientV2({ key, secret });
    const a = c.nonce();
    const b = c.nonce();
    const d = c.nonce();
    ok(/^\d+$/u.test(a));
    ok(BigInt(b) > BigInt(a), `${b} > ${a}`);
    ok(BigInt(d) > BigInt(b), `${d} > ${b}`);
  });

  test("createMonotonicNonce() returns strictly increasing values", () => {
    const nonceFn = createMonotonicNonce();
    let last = 0n;
    for (let i = 0; i < 1000; i += 1) {
      const next = BigInt(nonceFn());
      ok(next > last, `iteration ${i}: ${next} <= ${last}`);
      last = next;
    }
  });

  /* ----------------------------- Wallets ----------------------------- */

  test(".getWallets()", async () => {
    const expected: IWalletV2[] = [
      {
        type: "exchange",
        currency: "UST",
        balance: 19788.65,
        unsettled_interest: 0,
        available_balance: 19788.65,
        last_change: "trade",
        trade_details: { reason: "TRADE" },
      },
    ];
    mockFetch(
      {
        path: "/v2/auth/r/wallets",
        method: "POST",
        headers: authHeaders("auth/r/wallets", {}),
        body: expectBody({}),
      },
      [
        [
          "exchange",
          "UST",
          19788.65,
          0,
          19788.65,
          "trade",
          { reason: "TRADE" },
        ],
      ],
    );
    const data = await client.getWallets();
    deepStrictEqual(data, expected);
  });

  /* ------------------------------ Orders ----------------------------- */

  test(".getActiveOrders() (no symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/orders",
        method: "POST",
        headers: authHeaders("auth/r/orders", {}),
      },
      [],
    );
    const data = await client.getActiveOrders();
    deepStrictEqual(data, []);
  });

  test(".getActiveOrders() (with symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/orders/tBTCUSD",
        method: "POST",
        headers: authHeaders("auth/r/orders/tBTCUSD", { id: [1] }),
        body: expectBody({ id: [1] }),
      },
      [
        [
          1,
          null,
          100,
          "tBTCUSD",
          1700000000000,
          1700000001000,
          0.5,
          1,
          "LIMIT",
          null,
          null,
          null,
          0,
          "ACTIVE",
          null,
          null,
          50000,
          0,
          0,
          0,
          null,
          null,
          null,
          0,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      ],
    );
    const data = await client.getActiveOrders({ symbol: "tBTCUSD", id: [1] });
    deepStrictEqual(data.length, 1);
    deepStrictEqual(data[0].id, 1);
    deepStrictEqual(data[0].symbol, "tBTCUSD");
    deepStrictEqual(data[0].order_type, "LIMIT");
  });

  test(".submitOrder() decodes notification + order", async () => {
    const body = {
      type: "LIMIT" as const,
      symbol: "tBTCUSD",
      amount: "0.1",
      price: "50000",
    };
    mockFetch(
      {
        path: "/v2/auth/w/order/submit",
        method: "POST",
        headers: authHeaders("auth/w/order/submit", body),
        body: expectBody(body),
      },
      [
        1700000000000,
        "on-req",
        null,
        null,
        [
          [
            1,
            null,
            100,
            "tBTCUSD",
            1700000000000,
            1700000001000,
            0.1,
            0.1,
            "LIMIT",
            null,
            null,
            null,
            0,
            "ACTIVE",
            null,
            null,
            50000,
            0,
            0,
            0,
            null,
            null,
            null,
            0,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ],
        ],
        null,
        "SUCCESS",
        "Order submitted",
      ],
    );
    const result = await client.submitOrder(body);
    deepStrictEqual(result.type, "on-req");
    deepStrictEqual(result.status, "SUCCESS");
    deepStrictEqual(result.text, "Order submitted");
    deepStrictEqual(result.data.length, 1);
    deepStrictEqual(result.data[0].id, 1);
  });

  test(".submitOrder() also accepts the flat (single-order) data shape", async () => {
    const body = {
      type: "LIMIT" as const,
      symbol: "tBTCUSD",
      amount: "0.1",
      price: "50000",
    };
    mockFetch(
      {
        path: "/v2/auth/w/order/submit",
        method: "POST",
        headers: authHeaders("auth/w/order/submit", body),
      },
      [
        1700000000000,
        "on-req",
        null,
        null,
        // Flat: single order row at data[4] (not wrapped in an extra array)
        [
          1,
          null,
          100,
          "tBTCUSD",
          1700000000000,
          1700000001000,
          0.1,
          0.1,
          "LIMIT",
          null,
          null,
          null,
          0,
          "ACTIVE",
          null,
          null,
          50000,
          0,
          0,
          0,
          null,
          null,
          null,
          0,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        null,
        "SUCCESS",
        "Order submitted",
      ],
    );
    const result = await client.submitOrder(body);
    deepStrictEqual(result.data.length, 1);
    deepStrictEqual(result.data[0].id, 1);
    deepStrictEqual(result.data[0].symbol, "tBTCUSD");
  });

  test(".updateOrder()", async () => {
    const body = { id: 1, price: "51000" };
    mockFetch(
      {
        path: "/v2/auth/w/order/update",
        method: "POST",
        headers: authHeaders("auth/w/order/update", body),
        body: expectBody(body),
      },
      [
        1700000000000,
        "ou-req",
        null,
        null,
        [
          1,
          null,
          100,
          "tBTCUSD",
          1700000000000,
          1700000001000,
          0.1,
          0.1,
          "LIMIT",
          null,
          null,
          null,
          0,
          "ACTIVE",
          null,
          null,
          51000,
          0,
          0,
          0,
          null,
          null,
          null,
          0,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        null,
        "SUCCESS",
        "Updated",
      ],
    );
    const result = await client.updateOrder(body);
    deepStrictEqual(result.data.price, 51000);
  });

  test(".cancelOrder()", async () => {
    const body = { id: 1 };
    mockFetch(
      {
        path: "/v2/auth/w/order/cancel",
        method: "POST",
        headers: authHeaders("auth/w/order/cancel", body),
      },
      [
        1700000000000,
        "oc-req",
        null,
        null,
        [
          1,
          null,
          100,
          "tBTCUSD",
          1700000000000,
          1700000001000,
          0.1,
          0.1,
          "LIMIT",
          null,
          null,
          null,
          0,
          "CANCELED",
          null,
          null,
          50000,
          0,
          0,
          0,
          null,
          null,
          null,
          0,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        null,
        "SUCCESS",
        null,
      ],
    );
    const result = await client.cancelOrder(body);
    deepStrictEqual(result.data.status, "CANCELED");
  });

  test(".cancelOrdersMultiple()", async () => {
    mockFetch(
      {
        path: "/v2/auth/w/order/cancel/multi",
        method: "POST",
        headers: authHeaders("auth/w/order/cancel/multi", { all: 1 }),
      },
      [
        1700000000000,
        "oc_multi-req",
        null,
        null,
        [
          [
            1,
            null,
            100,
            "tBTCUSD",
            1700000000000,
            1700000001000,
            0.1,
            0.1,
            "LIMIT",
            null,
            null,
            null,
            0,
            "CANCELED",
            null,
            null,
            50000,
            0,
            0,
            0,
            null,
            null,
            null,
            0,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ],
        ],
        null,
        "SUCCESS",
        null,
      ],
    );
    const result = await client.cancelOrdersMultiple({ all: 1 });
    deepStrictEqual(result.data.length, 1);
  });

  test(".orderMulti() raw passthrough", async () => {
    const ops = [["oc", { id: 1 }] as const];
    mockFetch(
      {
        path: "/v2/auth/w/order/multi",
        method: "POST",
        headers: authHeaders("auth/w/order/multi", { ops }),
      },
      ["raw response"],
    );
    const data = await client.orderMulti({ ops: ops as never });
    deepStrictEqual(data, ["raw response"]);
  });

  test(".getOrdersHistory() (no symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/orders/hist",
        method: "POST",
        headers: authHeaders("auth/r/orders/hist", { limit: 1 }),
      },
      [],
    );
    const data = await client.getOrdersHistory({ limit: 1 });
    deepStrictEqual(data, []);
  });

  test(".getOrdersHistory() (with symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/orders/tBTCUSD/hist",
        method: "POST",
        headers: authHeaders("auth/r/orders/tBTCUSD/hist", {}),
      },
      [],
    );
    const data = await client.getOrdersHistory({ symbol: "tBTCUSD" });
    deepStrictEqual(data, []);
  });

  test(".getOrderTrades()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/order/tETHUSD:123/trades",
        method: "POST",
        headers: authHeaders("auth/r/order/tETHUSD:123/trades", {}),
      },
      [
        [
          1,
          "tETHUSD",
          1700000000000,
          123,
          0.5,
          187.37,
          "MARKET",
          null,
          -1,
          -0.1,
          "USD",
          999,
        ],
      ],
    );
    const data = await client.getOrderTrades({ symbol: "tETHUSD", id: 123 });
    deepStrictEqual(data, [
      {
        id: 1,
        symbol: "tETHUSD",
        mts: 1700000000000,
        order_id: 123,
        exec_amount: 0.5,
        exec_price: 187.37,
        order_type: "MARKET",
        order_price: null,
        maker: -1,
        fee: -0.1,
        fee_currency: "USD",
        cid: 999,
      },
    ] satisfies IAuthTradeV2[]);
  });

  test(".getTradesHistory() (no symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/trades/hist",
        method: "POST",
        headers: authHeaders("auth/r/trades/hist", { limit: 1 }),
      },
      [],
    );
    const data = await client.getTradesHistory({ limit: 1 });
    deepStrictEqual(data, []);
  });

  test(".getTradesHistory() (with symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/trades/tBTCUSD/hist",
        method: "POST",
        headers: authHeaders("auth/r/trades/tBTCUSD/hist", {}),
      },
      [],
    );
    const data = await client.getTradesHistory({ symbol: "tBTCUSD" });
    deepStrictEqual(data, []);
  });

  test(".getOtcOrdersHistory() (default ALL)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/orders/otc/ALL/hist",
        method: "POST",
        headers: authHeaders("auth/r/orders/otc/ALL/hist", {}),
      },
      [
        [
          123,
          "tBTCUSD",
          1669126974000,
          1670596411000,
          null,
          1,
          "john",
          "jane",
          null,
          0.025,
          26325,
          null,
          "REJECTED",
        ],
      ],
    );
    const data = await client.getOtcOrdersHistory();
    deepStrictEqual(data[0].id, 123);
    deepStrictEqual(data[0].status, "REJECTED");
  });

  /* ------------------------------ Ledgers ---------------------------- */

  test(".getLedgers() (no currency)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/ledgers/hist",
        method: "POST",
        headers: authHeaders("auth/r/ledgers/hist", {}),
      },
      [],
    );
    deepStrictEqual(await client.getLedgers(), []);
  });

  test(".getLedgers() (with currency)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/ledgers/USD/hist",
        method: "POST",
        headers: authHeaders("auth/r/ledgers/USD/hist", { limit: 1 }),
      },
      [
        [
          2531822314,
          "USD",
          "margin",
          1573521810000,
          null,
          0.01644,
          0,
          null,
          "Settlement",
        ],
      ],
    );
    const data = await client.getLedgers({ currency: "USD", limit: 1 });
    deepStrictEqual(data, [
      {
        id: 2531822314,
        currency: "USD",
        wallet: "margin",
        mts: 1573521810000,
        amount: 0.01644,
        balance: 0,
        description: "Settlement",
      },
    ] satisfies ILedgerEntryV2[]);
  });

  /* ----------------------------- Positions --------------------------- */

  test(".getMarginInfo() (base)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/info/margin/base",
        method: "POST",
        headers: authHeaders("auth/r/info/margin/base", {}),
      },
      ["base", [-100, 5.6, 299933, 296301, 4975]],
    );
    const data = (await client.getMarginInfo({
      key: "base",
    })) as IMarginInfoBaseV2;
    deepStrictEqual(data, {
      type: "base",
      user_pl: -100,
      user_swaps: 5.6,
      margin_balance: 299933,
      margin_balance_net: 296301,
      margin_min: 4975,
    });
  });

  test(".getMarginInfo() (symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/info/margin/tBTCUSD",
        method: "POST",
        headers: authHeaders("auth/r/info/margin/tBTCUSD", {}),
      },
      ["sym", "tBTCUSD", [854774, 909999, 52, 62]],
    );
    const data = (await client.getMarginInfo({
      key: "tBTCUSD",
    })) as IMarginInfoSymbolV2;
    deepStrictEqual(data.type, "sym");
    deepStrictEqual(data.symbol, "tBTCUSD");
    deepStrictEqual(data.tradable_balance, 854774);
  });

  test(".getMarginInfo() (sym_all)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/info/margin/sym_all",
        method: "POST",
        headers: authHeaders("auth/r/info/margin/sym_all", {}),
      },
      [
        ["sym", "tBTCUSD", [100, 200, 1, 2]],
        ["sym", "tETHUSD", [300, 400, 3, 4]],
      ],
    );
    const data = (await client.getMarginInfo({
      key: "sym_all",
    })) as IMarginInfoSymbolV2[];
    deepStrictEqual(Array.isArray(data), true);
    deepStrictEqual(data.length, 2);
    deepStrictEqual(data[0].symbol, "tBTCUSD");
    deepStrictEqual(data[1].symbol, "tETHUSD");
    deepStrictEqual(data[0].tradable_balance, 100);
    deepStrictEqual(data[1].gross_balance, 400);
  });

  test(".getPositions()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/positions",
        method: "POST",
        headers: authHeaders("auth/r/positions", {}),
      },
      [
        [
          "tBTCUSD",
          "ACTIVE",
          0.0195,
          8565,
          0,
          0,
          -0.33,
          -0.0003,
          7045,
          3.07,
          null,
          142355652,
          1574002216000,
          1574002216000,
          null,
          null,
          null,
          100,
          50,
          { meta: 1 },
        ],
      ],
    );
    const data = await client.getPositions();
    deepStrictEqual(data, [
      {
        symbol: "tBTCUSD",
        status: "ACTIVE",
        amount: 0.0195,
        base_price: 8565,
        margin_funding: 0,
        margin_funding_type: 0,
        pl: -0.33,
        pl_perc: -0.0003,
        price_liq: 7045,
        leverage: 3.07,
        position_id: 142355652,
        mts_create: 1574002216000,
        mts_update: 1574002216000,
        type: null,
        collateral: 100,
        collateral_min: 50,
        meta: { meta: 1 },
      },
    ] satisfies IPositionV2[]);
  });

  test(".claimPosition()", async () => {
    mockFetch(
      {
        path: "/v2/auth/w/position/claim",
        method: "POST",
        headers: authHeaders("auth/w/position/claim", { id: 1 }),
      },
      [
        1700000000000,
        "pm-req",
        null,
        null,
        [
          "tBTCUSD",
          "ACTIVE",
          -0.001,
          10119,
          0,
          0,
          null,
          null,
          null,
          null,
          null,
          142031891,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        null,
        "SUCCESS",
        "Claim",
      ],
    );
    const result = await client.claimPosition({ id: 1 });
    deepStrictEqual(result.data.position_id, 142031891);
  });

  test(".increasePosition()", async () => {
    const body = { symbol: "tBTCUSD", amount: "1" };
    mockFetch(
      {
        path: "/v2/auth/w/position/increase",
        method: "POST",
        headers: authHeaders("auth/w/position/increase", body),
      },
      [
        1700000000000,
        "pmi-req",
        null,
        null,
        [
          "tBTCUSD",
          null,
          1,
          100,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          12345,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        null,
        "SUCCESS",
        null,
      ],
    );
    const result = await client.increasePosition(body);
    deepStrictEqual(result.data.position_id, 12345);
  });

  test(".getIncreasePositionInfo()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/position/increase/info",
        method: "POST",
        headers: authHeaders("auth/r/position/increase/info", {
          symbol: "tBTCUSD",
        }),
      },
      [
        [10, 0.1],
        [1.1, [516734, 518415, 11.5, 11.7]],
      ],
    );
    const data = await client.getIncreasePositionInfo({ symbol: "tBTCUSD" });
    deepStrictEqual(data, {
      max_pos: 10,
      current_pos: 0.1,
      base_currency_balance: 1.1,
      tradable_balance_quote_currency: 516734,
      tradable_balance_quote_total: 518415,
      tradable_balance_base_currency: 11.5,
      tradable_balance_base_total: 11.7,
    });
  });

  test(".getPositionsHistory()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/positions/hist",
        method: "POST",
        headers: authHeaders("auth/r/positions/hist", { limit: 1 }),
      },
      [],
    );
    deepStrictEqual(await client.getPositionsHistory({ limit: 1 }), []);
  });

  test(".getPositionsSnapshot()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/positions/snap",
        method: "POST",
        headers: authHeaders("auth/r/positions/snap", {}),
      },
      [],
    );
    deepStrictEqual(await client.getPositionsSnapshot(), []);
  });

  test(".getPositionsAudit()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/positions/audit",
        method: "POST",
        headers: authHeaders("auth/r/positions/audit", { id: [1, 2] }),
      },
      [],
    );
    deepStrictEqual(await client.getPositionsAudit({ id: [1, 2] }), []);
  });

  test(".updatePositionFundingType()", async () => {
    mockFetch(
      {
        path: "/v2/auth/w/position/update/funding/type",
        method: "POST",
        headers: authHeaders("auth/w/position/update/funding/type", {
          symbol: "tBTCUSD",
          type: 1,
        }),
      },
      [1700000000000, "puft-req", null, null, null, null, "SUCCESS", "Done"],
    );
    const result = await client.updatePositionFundingType({
      symbol: "tBTCUSD",
      type: 1,
    });
    deepStrictEqual(result.status, "SUCCESS");
    deepStrictEqual(result.text, "Done");
  });

  test(".derivPositionCollateralSet()", async () => {
    mockFetch(
      {
        path: "/v2/auth/w/deriv/collateral/set",
        method: "POST",
        headers: authHeaders("auth/w/deriv/collateral/set", {
          symbol: "tBTCF0:USTF0",
          collateral: 100,
        }),
      },
      [[1]],
    );
    deepStrictEqual(
      await client.derivPositionCollateralSet({
        symbol: "tBTCF0:USTF0",
        collateral: 100,
      }),
      { status: 1 },
    );
  });

  test(".derivPositionCollateralLimits()", async () => {
    mockFetch(
      {
        path: "/v2/auth/calc/deriv/collateral/limits",
        method: "POST",
        headers: authHeaders("auth/calc/deriv/collateral/limits", {
          symbol: "tBTCF0:USTF0",
        }),
      },
      [18.289, 896.67],
    );
    deepStrictEqual(
      await client.derivPositionCollateralLimits({ symbol: "tBTCF0:USTF0" }),
      {
        min_collateral: 18.289,
        max_collateral: 896.67,
      } satisfies IDerivCollateralLimits,
    );
  });

  /* ------------------------------ Funding ---------------------------- */

  test(".getFundingOffers() (no symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/offers",
        method: "POST",
        headers: authHeaders("auth/r/funding/offers", {}),
      },
      [],
    );
    deepStrictEqual(await client.getFundingOffers(), []);
  });

  test(".getFundingOffers() (with symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/offers/fUSD",
        method: "POST",
        headers: authHeaders("auth/r/funding/offers/fUSD", {}),
      },
      [
        [
          1,
          "fUSD",
          1700000000000,
          1700000001000,
          100,
          100,
          "LIMIT",
          null,
          null,
          0,
          "ACTIVE",
          null,
          null,
          null,
          0.0002,
          2,
          0,
          0,
          null,
          0,
          null,
        ],
      ],
    );
    const data = await client.getFundingOffers({ symbol: "fUSD" });
    deepStrictEqual(data, [
      {
        id: 1,
        symbol: "fUSD",
        mts_created: 1700000000000,
        mts_updated: 1700000001000,
        amount: 100,
        amount_orig: 100,
        type: "LIMIT",
        flags: 0,
        status: "ACTIVE",
        rate: 0.0002,
        period: 2,
        notify: 0,
        hidden: 0,
        renew: 0,
      },
    ] satisfies IFundingOfferV2[]);
  });

  test(".submitFundingOffer()", async () => {
    const body = {
      type: "LIMIT" as const,
      symbol: "fUSD",
      amount: "50",
      rate: "0.001",
      period: 2,
    };
    mockFetch(
      {
        path: "/v2/auth/w/funding/offer/submit",
        method: "POST",
        headers: authHeaders("auth/w/funding/offer/submit", body),
      },
      [
        1700000000000,
        "fon-req",
        null,
        null,
        [
          1,
          "fUSD",
          1700000000000,
          1700000000000,
          50,
          50,
          "LIMIT",
          null,
          null,
          0,
          "ACTIVE",
          null,
          null,
          null,
          0.001,
          2,
          0,
          0,
          null,
          0,
          null,
        ],
        null,
        "SUCCESS",
        "Submitted",
      ],
    );
    const result = await client.submitFundingOffer(body);
    deepStrictEqual(result.data.rate, 0.001);
  });

  test(".cancelFundingOffer()", async () => {
    mockFetch(
      {
        path: "/v2/auth/w/funding/offer/cancel",
        method: "POST",
        headers: authHeaders("auth/w/funding/offer/cancel", { id: 1 }),
      },
      [
        1700000000000,
        "foc-req",
        null,
        null,
        [
          1,
          "fUSD",
          1700000000000,
          1700000000000,
          50,
          50,
          "LIMIT",
          null,
          null,
          0,
          "CANCELED",
          null,
          null,
          null,
          0.001,
          2,
          0,
          0,
          null,
          0,
          null,
        ],
        null,
        "SUCCESS",
        null,
      ],
    );
    const result = await client.cancelFundingOffer({ id: 1 });
    deepStrictEqual(result.data.status, "CANCELED");
  });

  test(".cancelAllFundingOffers()", async () => {
    mockFetch(
      {
        path: "/v2/auth/w/funding/offer/cancel/all",
        method: "POST",
        headers: authHeaders("auth/w/funding/offer/cancel/all", {
          currency: "USD",
        }),
      },
      [1700000000000, "foc_all-req", null, null, null, null, "SUCCESS", "All"],
    );
    const result = await client.cancelAllFundingOffers({ currency: "USD" });
    deepStrictEqual(result.status, "SUCCESS");
  });

  test(".fundingClose()", async () => {
    mockFetch(
      {
        path: "/v2/auth/w/funding/close",
        method: "POST",
        headers: authHeaders("auth/w/funding/close", { id: 1 }),
      },
      [1700000000000, "fr-req", null, null, null, null, "SUCCESS", null],
    );
    const result = await client.fundingClose({ id: 1 });
    deepStrictEqual(result.status, "SUCCESS");
  });

  test(".fundingAutoRenew() (activated)", async () => {
    const body = { status: 1 as const, currency: "USD", period: 2 };
    mockFetch(
      {
        path: "/v2/auth/w/funding/auto",
        method: "POST",
        headers: authHeaders("auth/w/funding/auto", body),
      },
      [
        1700000000000,
        "fa-req",
        null,
        null,
        ["UST", 2, 0, 350],
        null,
        "SUCCESS",
        "Activated",
      ],
    );
    const result = await client.fundingAutoRenew(body);
    deepStrictEqual(result.data, {
      currency: "UST",
      period: 2,
      rate: 0,
      threshold: 350,
    });
  });

  test(".keepFunding()", async () => {
    mockFetch(
      {
        path: "/v2/auth/w/funding/keep",
        method: "POST",
        headers: authHeaders("auth/w/funding/keep", {
          type: "credit",
          id: [1],
        }),
      },
      [1700000000000, "fk-req", null, null, null, null, "SUCCESS", "Kept"],
    );
    const result = await client.keepFunding({ type: "credit", id: [1] });
    deepStrictEqual(result.status, "SUCCESS");
  });

  test(".getFundingOffersHistory() (with symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/offers/fUSD/hist",
        method: "POST",
        headers: authHeaders("auth/r/funding/offers/fUSD/hist", { limit: 1 }),
      },
      [],
    );
    deepStrictEqual(
      await client.getFundingOffersHistory({ symbol: "fUSD", limit: 1 }),
      [],
    );
  });

  test(".getFundingOffersHistory() (no symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/offers/hist",
        method: "POST",
        headers: authHeaders("auth/r/funding/offers/hist", {}),
      },
      [],
    );
    deepStrictEqual(await client.getFundingOffersHistory(), []);
  });

  test(".getFundingLoans() (no symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/loans",
        method: "POST",
        headers: authHeaders("auth/r/funding/loans", {}),
      },
      [],
    );
    deepStrictEqual(await client.getFundingLoans(), []);
  });

  test(".getFundingLoans() (with symbol)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/loans/fUSD",
        method: "POST",
        headers: authHeaders("auth/r/funding/loans/fUSD", {}),
      },
      [
        [
          1,
          "fUST",
          0,
          1700000000000,
          1700000000000,
          100,
          null,
          "ACTIVE",
          "FIXED",
          null,
          null,
          0.0024,
          2,
          1700000000000,
          1700000000000,
          0,
          0,
          null,
          0,
          null,
          0,
        ],
      ],
    );
    const data = await client.getFundingLoans({ symbol: "fUSD" });
    deepStrictEqual(data, [
      {
        id: 1,
        symbol: "fUST",
        side: 0,
        mts_create: 1700000000000,
        mts_update: 1700000000000,
        amount: 100,
        flags: null,
        status: "ACTIVE",
        rate_type: "FIXED",
        rate: 0.0024,
        period: 2,
        mts_opening: 1700000000000,
        mts_last_payout: 1700000000000,
        notify: 0,
        hidden: 0,
        renew: 0,
        no_close: 0,
      },
    ] satisfies IFundingLoanV2[]);
  });

  test(".getFundingLoansHistory()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/loans/fUSD/hist",
        method: "POST",
        headers: authHeaders("auth/r/funding/loans/fUSD/hist", {}),
      },
      [],
    );
    deepStrictEqual(
      await client.getFundingLoansHistory({ symbol: "fUSD" }),
      [],
    );
  });

  test(".getFundingCredits()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/credits/fUSD",
        method: "POST",
        headers: authHeaders("auth/r/funding/credits/fUSD", {}),
      },
      [
        [
          1,
          "fUST",
          1,
          1700000000000,
          1700000000000,
          350,
          null,
          "ACTIVE",
          "FIXED",
          null,
          null,
          0.0024,
          2,
          1700000000000,
          1700000000000,
          0,
          0,
          null,
          0,
          null,
          0,
          "tBTCUSD",
        ],
      ],
    );
    const data = await client.getFundingCredits({ symbol: "fUSD" });
    deepStrictEqual(data[0].position_pair, "tBTCUSD");
    deepStrictEqual(data[0].amount, 350);
    deepStrictEqual<IFundingCreditV2 | undefined>(data[0], {
      id: 1,
      symbol: "fUST",
      side: 1,
      mts_create: 1700000000000,
      mts_update: 1700000000000,
      amount: 350,
      flags: null,
      status: "ACTIVE",
      rate_type: "FIXED",
      rate: 0.0024,
      period: 2,
      mts_opening: 1700000000000,
      mts_last_payout: 1700000000000,
      notify: 0,
      hidden: 0,
      renew: 0,
      no_close: 0,
      position_pair: "tBTCUSD",
    });
  });

  test(".getFundingCreditsHistory()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/credits/fUSD/hist",
        method: "POST",
        headers: authHeaders("auth/r/funding/credits/fUSD/hist", {}),
      },
      [],
    );
    deepStrictEqual(
      await client.getFundingCreditsHistory({ symbol: "fUSD" }),
      [],
    );
  });

  test(".getFundingTradesHistory()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/funding/trades/fUSD/hist",
        method: "POST",
        headers: authHeaders("auth/r/funding/trades/fUSD/hist", {}),
      },
      [[636040, "fUST", 1574077528000, 41237922, -100, 0.0024, 2, null]],
    );
    const data = await client.getFundingTradesHistory({ symbol: "fUSD" });
    deepStrictEqual(data, [
      {
        id: 636040,
        currency: "fUST",
        mts_create: 1574077528000,
        offer_id: 41237922,
        amount: -100,
        rate: 0.0024,
        period: 2,
      },
    ] satisfies IFundingTradeAuthV2[]);
  });

  test(".getFundingInfo()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/info/funding/fUST",
        method: "POST",
        headers: authHeaders("auth/r/info/funding/fUST", {}),
      },
      ["sym", "fUST", [0.0024, 0.0024, 1.95, 1.48]],
    );
    deepStrictEqual(await client.getFundingInfo({ key: "fUST" }), {
      type: "sym",
      symbol: "fUST",
      yield_loan: 0.0024,
      yield_lend: 0.0024,
      duration_loan: 1.95,
      duration_lend: 1.48,
    });
  });

  /* --------------------------- Account actions ----------------------- */

  test(".getUserInfo()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/info/user",
        method: "POST",
        headers: authHeaders("auth/r/info/user", {}),
      },
      [
        123456,
        "u@u.com",
        "user",
        1613492801000,
        1,
        3,
        null,
        "Lisbon",
        "en",
        "bitfinex",
        1,
        null,
        null,
        null,
        1613492801000,
        79,
        1234,
        0,
        1,
        0,
        null,
        0,
        1,
        0,
        null,
        null,
        null,
        null,
        0,
        0,
        0,
        0,
        null,
        null,
        null,
        null,
        null,
        0,
        0,
        null,
        null,
        null,
        null,
        1700000000000,
        null,
        null,
        null,
        null,
        null,
        null,
        "approved",
        null,
        null,
        null,
        0,
      ],
    );
    const data = await client.getUserInfo();
    deepStrictEqual(data.id, 123456);
    deepStrictEqual(data.email, "u@u.com");
    deepStrictEqual(data.username, "user");
    deepStrictEqual(data.timezone, "Lisbon");
    deepStrictEqual(data.email_verified, 1);
    deepStrictEqual(data.group_id, 79);
    ok(Array.isArray(data.raw));
  });

  test(".getSummary()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/summary",
        method: "POST",
        headers: authHeaders("auth/r/summary", {}),
      },
      [null, null, null, null, { vol: 1 }, { f: 0 }, 0.5, { t: 0 }, 1.5, 0, 0],
    );
    const data = await client.getSummary();
    deepStrictEqual(data.fees_funding_total_30d, 0.5);
    deepStrictEqual(data.fees_trading_total_30d, 1.5);
  });

  test(".getLoginsHistory()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/logins/hist",
        method: "POST",
        headers: authHeaders("auth/r/logins/hist", {}),
      },
      [
        [
          78404724,
          null,
          1579202754000,
          null,
          "1.2.3.4",
          null,
          null,
          '{"os": "Win"}',
        ],
      ],
    );
    const data = await client.getLoginsHistory();
    deepStrictEqual(data, [
      {
        id: 78404724,
        time: 1579202754000,
        ip: "1.2.3.4",
        extra_info: '{"os": "Win"}',
      },
    ]);
  });

  test(".getKeyPermissions()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/permissions",
        method: "POST",
        headers: authHeaders("auth/r/permissions", {}),
      },
      [
        ["account", 1, 1],
        ["orders", 1, 0],
      ],
    );
    deepStrictEqual(await client.getKeyPermissions(), [
      { scope: "account", read: 1, write: 1 },
      { scope: "orders", read: 1, write: 0 },
    ] satisfies IKeyPermissionV2[]);
  });

  test(".generateToken()", async () => {
    const body = { scope: "api", writePermission: true };
    mockFetch(
      {
        path: "/v2/auth/w/token",
        method: "POST",
        headers: authHeaders("auth/w/token", body),
      },
      ["pub:api:665b6328"],
    );
    deepStrictEqual(await client.generateToken(body), "pub:api:665b6328");
  });

  test(".getAuditHistory()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/audit/hist",
        method: "POST",
        headers: authHeaders("auth/r/audit/hist", {}),
      },
      [
        [
          1574332100000,
          null,
          "settings: api key created",
          null,
          null,
          "1.2.3.4",
          "Mozilla/5.0",
        ],
      ],
    );
    deepStrictEqual(await client.getAuditHistory(), [
      {
        mts_create: 1574332100000,
        log: "settings: api key created",
        ip: "1.2.3.4",
        user_agent: "Mozilla/5.0",
      },
    ]);
  });

  test(".transfer()", async () => {
    const body = {
      from: "trading" as const,
      to: "exchange" as const,
      currency: "UST",
      amount: "50",
    };
    mockFetch(
      {
        path: "/v2/auth/w/transfer",
        method: "POST",
        headers: authHeaders("auth/w/transfer", body),
      },
      [
        1700000000000,
        "acc_tf",
        null,
        null,
        [1700000000000, "margin", "exchange", null, "USD", null, null, 50],
        null,
        "SUCCESS",
        "Transferred",
      ],
    );
    const result = await client.transfer(body);
    deepStrictEqual(result.data.wallet_from, "margin");
    deepStrictEqual(result.data.amount, 50);
  });

  test(".getDepositAddress()", async () => {
    const body = {
      wallet: "trading" as const,
      method: "bitcoin",
    };
    mockFetch(
      {
        path: "/v2/auth/w/deposit/address",
        method: "POST",
        headers: authHeaders("auth/w/deposit/address", body),
      },
      [
        1700000000000,
        "acc_dep",
        null,
        null,
        [null, "BITCOIN", "BTC", null, "ADDRESS123", null],
        null,
        "SUCCESS",
        "success",
      ],
    );
    const result = await client.getDepositAddress(body);
    deepStrictEqual(result.data, {
      method: "BITCOIN",
      currency_code: "BTC",
      address: "ADDRESS123",
      pool_address: null,
    });
  });

  test(".getDepositAddressAll()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/deposit/address/all",
        method: "POST",
        headers: authHeaders("auth/r/deposit/address/all", { method: "ETH" }),
      },
      [["0x123", "exchange"]],
    );
    deepStrictEqual(await client.getDepositAddressAll({ method: "ETH" }), [
      { address: "0x123", wallet: "exchange" },
    ] satisfies IDepositAddressAllEntry[]);
  });

  test(".generateDepositInvoice()", async () => {
    const body = {
      wallet: "exchange" as const,
      currency: "LNX",
      amount: "0.01",
    };
    mockFetch(
      {
        path: "/v2/auth/w/deposit/invoice",
        method: "POST",
        headers: authHeaders("auth/w/deposit/invoice", body),
      },
      ["hash123", "lnbc10m1...", null, null, "0.01"],
    );
    deepStrictEqual(await client.generateDepositInvoice(body), {
      invoice_hash: "hash123",
      invoice: "lnbc10m1...",
      amount: "0.01",
    });
  });

  test(".lnxInvoicePayments() raw passthrough", async () => {
    const body = { action: "getInvoicesByUser", query: {} };
    mockFetch(
      {
        path: "/v2/auth/r/ext/invoice/payments",
        method: "POST",
        headers: authHeaders("auth/r/ext/invoice/payments", body),
      },
      { invoices: [] },
    );
    deepStrictEqual(await client.lnxInvoicePayments(body), { invoices: [] });
  });

  test(".withdraw()", async () => {
    const body = {
      wallet: "exchange" as const,
      method: "ethereum",
      amount: "0.01",
      address: "0xabc",
    };
    mockFetch(
      {
        path: "/v2/auth/w/withdraw",
        method: "POST",
        headers: authHeaders("auth/w/withdraw", body),
      },
      [
        1700000000000,
        "acc_wd-req",
        null,
        null,
        [
          13080092,
          null,
          "ethereum",
          null,
          "exchange",
          0.01,
          null,
          null,
          0.00135,
        ],
        null,
        "SUCCESS",
        "Withdrawal accepted",
      ],
    );
    const result = await client.withdraw(body);
    deepStrictEqual(result.data.withdrawal_id, 13080092);
    deepStrictEqual(result.data.amount, 0.01);
  });

  test(".getMovements() (no currency)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/movements/hist",
        method: "POST",
        headers: authHeaders("auth/r/movements/hist", {}),
      },
      [],
    );
    deepStrictEqual(await client.getMovements(), []);
  });

  test(".getMovements() (with currency)", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/movements/ETH/hist",
        method: "POST",
        headers: authHeaders("auth/r/movements/ETH/hist", { limit: 1 }),
      },
      [
        [
          13105603,
          "ETH",
          "ETHEREUM",
          null,
          null,
          1569348774000,
          1569348774000,
          null,
          null,
          "COMPLETED",
          null,
          null,
          0.263,
          -0.00135,
          null,
          null,
          "0xabc",
          "memo",
          null,
          null,
          "tx123",
          "note",
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      ],
    );
    const data = await client.getMovements({ currency: "ETH", limit: 1 });
    deepStrictEqual(data[0].id, 13105603);
    deepStrictEqual(data[0].destination_address, "0xabc");
    deepStrictEqual(data[0].transaction_id, "tx123");
  });

  test(".getMovementInfo()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/movements/info",
        method: "POST",
        headers: authHeaders("auth/r/movements/info", { id: 24 }),
      },
      [
        24,
        "EUR",
        "WIRE",
        null,
        "remark",
        1677086074000,
        1677086210000,
        null,
        null,
        "COMPLETED",
        null,
        null,
        -29.5,
        -0.5,
        null,
        null,
        null,
      ],
    );
    const data = await client.getMovementInfo({ id: 24 });
    deepStrictEqual(data.id, 24);
    deepStrictEqual(data.currency_method, "WIRE");
    deepStrictEqual(data.remark, "remark");
  });

  test(".getAlerts()", async () => {
    mockFetch(
      {
        path: "/v2/auth/r/alerts",
        method: "POST",
        headers: authHeaders("auth/r/alerts", {}),
      },
      [["price:tETHUSD:220", "price", "tETHUSD", 220, 100]],
    );
    deepStrictEqual(await client.getAlerts(), [
      {
        info: "price:tETHUSD:220",
        type: "price",
        symbol: "tETHUSD",
        price: 220,
        countdown: 100,
      },
    ] satisfies IAlertV2[]);
  });

  test(".setAlert()", async () => {
    const body = {
      type: "price" as const,
      symbol: "tETHUSD",
      price: "185",
    };
    mockFetch(
      {
        path: "/v2/auth/w/alert/set",
        method: "POST",
        headers: authHeaders("auth/w/alert/set", body),
      },
      ["price:tETHUSD:185", "price", "tETHUSD", 185, 100],
    );
    deepStrictEqual(await client.setAlert(body), {
      info: "price:tETHUSD:185",
      type: "price",
      symbol: "tETHUSD",
      price: 185,
      countdown: 100,
    });
  });

  test(".deleteAlert()", async () => {
    mockFetch(
      {
        path: "/v2/auth/w/alert/price:tBTCUSD:600/del",
        method: "POST",
        headers: authHeaders("auth/w/alert/price:tBTCUSD:600/del", {}),
      },
      [true],
    );
    deepStrictEqual(
      await client.deleteAlert({ symbol: "tBTCUSD", price: 600 }),
      true,
    );
  });

  test(".getCalcOrderAvailable()", async () => {
    const body = { symbol: "tBTCUSD", type: "EXCHANGE", dir: 1 as const };
    mockFetch(
      {
        path: "/v2/auth/calc/order/avail",
        method: "POST",
        headers: authHeaders("auth/calc/order/avail", body),
      },
      [0.8056309],
    );
    deepStrictEqual(await client.getCalcOrderAvailable(body), 0.8056309);
  });

  test(".getUserSettings()", async () => {
    const body = { keys: ["bit"] };
    mockFetch(
      {
        path: "/v2/auth/r/settings",
        method: "POST",
        headers: authHeaders("auth/r/settings", body),
      },
      [["bit", "finex"]],
    );
    deepStrictEqual(await client.getUserSettings(body), [
      { key: "bit", value: "finex" },
    ]);
  });

  test(".setUserSettings()", async () => {
    const settings: [string, unknown][] = [["bit", "finex"]];
    mockFetch(
      {
        path: "/v2/auth/w/settings/set",
        method: "POST",
        headers: authHeaders("auth/w/settings/set", { settings }),
      },
      [1700000000000, "acc_ss", null, null, [1], null, "SUCCESS", null],
    );
    const result = await client.setUserSettings({ settings });
    deepStrictEqual(result.status, "SUCCESS");
  });

  test(".deleteUserSettings()", async () => {
    const body = { keys: ["bit"] };
    mockFetch(
      {
        path: "/v2/auth/w/settings/del",
        method: "POST",
        headers: authHeaders("auth/w/settings/del", body),
      },
      [1700000000000, "acc_sd", null, null, [1], null, "SUCCESS", null],
    );
    const result = await client.deleteUserSettings(body);
    deepStrictEqual(result.status, "SUCCESS");
  });

  /* ------------------------------ Thalex ----------------------------- */

  test(".thalexDeposit()", async () => {
    const body = {
      provider: "thalex" as const,
      amount: "1000",
      ccy: "USE",
      tfaToken: { method: "u2f" },
    };
    const response: IThalexTransferV2 = {
      type: "deposit",
      addressDest: "0xabc",
      amount: "1000",
      ccy: "USE",
      createdAt: 1732125293487,
      updatedAt: 1732125295060,
      id: "id-1",
      status: "PENDING",
      fee: "0",
    };
    mockFetch(
      {
        path: "/v2/auth/w/ext/wallets/deposits/request",
        method: "POST",
        headers: authHeaders("auth/w/ext/wallets/deposits/request", body),
      },
      response,
    );
    deepStrictEqual(await client.thalexDeposit(body), response);
  });

  test(".thalexWithdrawal()", async () => {
    const body = {
      provider: "thalex" as const,
      amount: "90",
      ccy: "USE",
      tfaToken: { method: "u2f" },
    };
    const response: IThalexTransferV2 = {
      type: "withdraw",
      addressDest: "0xabc",
      amount: "90",
      ccy: "USE",
      createdAt: 1732126385718,
      updatedAt: 1732126385718,
      id: "id-2",
      status: "PENDING",
      fee: "0",
    };
    mockFetch(
      {
        path: "/v2/auth/w/ext/wallets/withdrawals/request",
        method: "POST",
        headers: authHeaders("auth/w/ext/wallets/withdrawals/request", body),
      },
      response,
    );
    deepStrictEqual(await client.thalexWithdrawal(body), response);
  });

  test(".thalexFreeTransferCount() maps provider to capitalized Provider", async () => {
    // Docs specify the body key as `Provider` (capital P) for this endpoint,
    // unlike deposit/withdrawal which use lowercase `provider`.
    const wireBody = { Provider: "thalex" };
    const response: IThalexFreeTransferCountV2 = {
      deposits: { available: 1, resetsAt: 1732147200000 },
      withdrawals: { available: 0, resetsAt: null },
    };
    mockFetch(
      {
        path: "/v2/auth/r/ext/wallets/transfers/free/count",
        method: "POST",
        headers: authHeaders(
          "auth/r/ext/wallets/transfers/free/count",
          wireBody,
        ),
        body: expectBody(wireBody),
      },
      response,
    );
    deepStrictEqual(
      await client.thalexFreeTransferCount({ provider: "thalex" }),
      response,
    );
  });

  /* ----------------------- Error envelope passthrough --------------- */

  test("auth endpoints surface BitfinexError envelope", async () => {
    mockFetch({ path: "/v2/auth/r/wallets", method: "POST" }, [
      "error",
      11010,
      "ratelimit: too many requests",
    ]);
    await client.getWallets().then(
      () => {
        throw new Error("expected rejection");
      },
      (error: unknown) => {
        ok(error instanceof Error);
        ok(error.name === "BitfinexError");
      },
    );
  });
});
