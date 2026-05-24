/* eslint-disable @typescript-eslint/no-floating-promises */
import { deepStrictEqual, ok } from "node:assert";
import { createHmac } from "node:crypto";
import { afterEach, describe, mock, test } from "node:test";
import {
  AffCode,
  AuthenticatedClient,
  type IAccountFees,
  type IAccountInfo,
  type IClosePositionResponse,
  type ICredit,
  type IDepositAddress,
  type IDepositWithdrawal,
  type IFundingTrade,
  type IHistoryBalance,
  type IKeyPermissions,
  type IMarginInformation,
  type INewOrdersResponse,
  type IOffer,
  type IOrderOptions,
  type IOrderResponse,
  type IPastTrade,
  type IPosition,
  type ISummary,
  type ITakenFund,
  type ITotalFund,
  type ITransferResponse,
  type IWalletBalance,
  type IWithdrawResponse,
} from "../index.js";
import { mockFetch } from "./mock.js";

const key = "bitfinex-api-key";
const secret = "bitfinex-api-secret";
const nonce = "1574959951447";

const client = new AuthenticatedClient({
  key,
  secret,
  nonce: (): string => nonce,
});

function decodePayload(payload: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as Record<
    string,
    unknown
  >;
}

function expectAuthHeaders(
  request: string,
  body: Record<string, unknown> = {},
): Record<string, string> {
  const payload = Buffer.from(
    JSON.stringify({ ...body, request, nonce }),
  ).toString("base64");
  const signatureHex = createHmac("sha384", secret)
    .update(payload)
    .digest("hex");
  return {
    "x-bfx-apikey": key,
    "x-bfx-payload": payload,
    "x-bfx-signature": signatureHex,
  };
}

function expectAuthHeadersFn(
  request: string,
  validateBody: (body: Record<string, unknown>) => boolean,
): (headers: Record<string, string | undefined>) => boolean {
  return (headers: Record<string, string | undefined>): boolean => {
    if (
      typeof headers["x-bfx-apikey"] !== "string" ||
      typeof headers["x-bfx-payload"] !== "string" ||
      typeof headers["x-bfx-signature"] !== "string"
    ) {
      return false;
    }
    if (headers["x-bfx-apikey"] !== key) {
      return false;
    }
    const decoded = decodePayload(headers["x-bfx-payload"]);
    if (decoded.request !== request || decoded.nonce !== nonce) {
      return false;
    }
    const expectedSig = createHmac("sha384", secret)
      .update(headers["x-bfx-payload"])
      .digest("hex");
    if (headers["x-bfx-signature"] !== expectedSig) {
      return false;
    }
    return validateBody(decoded);
  };
}

describe("AuthenticatedClient", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test("constructor", () => {
    deepStrictEqual(client.nonce(), nonce);
  });

  test("nonce setter", () => {
    const custom = new AuthenticatedClient({ key, secret });
    const fn = (): string => "1";
    custom.nonce = fn;
    deepStrictEqual(custom.nonce, fn);
  });

  test(".getAccountInfo()", async () => {
    const request = "/v1/account_infos";
    const response: IAccountInfo = [
      {
        leo_fee_disc_c2c: "5",
        leo_fee_disc_c2s: "5",
        leo_fee_disc_c2f: 5,
        maker_fees: "0.1",
        taker_fees: "0.2",
        fees: [{ pairs: "BTC", maker_fees: "0.1", taker_fees: "0.2" }],
      },
    ];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request),
      },
      response,
    );

    deepStrictEqual(await client.getAccountInfo(), response);
  });

  test(".getAccountFees()", async () => {
    const request = "/v1/account_fees";
    const response: IAccountFees = { withdraw: { BTC: "0.0004" } };
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getAccountFees(), response);
  });

  test(".getSummary()", async () => {
    const request = "/v1/summary";
    const response: ISummary = {
      time: "2019-06-26T13:53:09.000Z",
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
      deriv_maker_rebate: 0,
      deriv_taker_fee: 0.00075,
    };
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getSummary(), response);
  });

  test(".getDepositAddress()", async () => {
    const request = "/v1/deposit/new";
    const body = {
      method: "bitcoin",
      wallet_name: "trading" as const,
      renew: 1 as const,
    };
    const response: IDepositAddress = {
      result: "success",
      method: "bitcoin",
      currency: "BTC",
      address: "1A2BC",
    };
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.getDepositAddress(body), response);
  });

  test(".getKeyPermissions()", async () => {
    const request = "/v1/key_info";
    const response: IKeyPermissions = {
      account: { read: true, write: false },
      history: { read: true, write: false },
      orders: { read: true, write: true },
      positions: { read: true, write: true },
      funding: { read: true, write: true },
      wallets: { read: true, write: true },
      withdraw: { read: false, write: false },
    };
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getKeyPermissions(), response);
  });

  test(".getMarginInformation()", async () => {
    const request = "/v1/margin_infos";
    const response: IMarginInformation[] = [
      {
        margin_balance: "0.0",
        tradable_balance: "0.0",
        unrealized_pl: "0.0",
        unrealized_swap: "0.0",
        net_value: "0.0",
        required_margin: "0.0",
        leverage: "2.5",
        margin_requirement: "13.0",
        margin_limits: [],
        message: "ok",
      },
    ];
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getMarginInformation(), response);
  });

  test(".getWalletBalances()", async () => {
    const request = "/v1/balances";
    const response: IWalletBalance[] = [
      { type: "deposit", currency: "btc", amount: "0.0", available: "0.0" },
    ];
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getWalletBalances(), response);
  });

  test(".transfer()", async () => {
    const request = "/v1/transfer";
    const input = {
      amount: "1.0",
      currency: "BTC",
      walletfrom: "trading" as const,
      walletto: "exchange" as const,
    };
    const validate = (decoded: Record<string, unknown>): boolean =>
      decoded.currency === "BTC" &&
      decoded.amount === "1.0" &&
      decoded.walletfrom === "trading" &&
      decoded.walletto === "exchange";
    const response: ITransferResponse = [{ status: "success", message: "ok" }];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeadersFn(request, validate),
      },
      response,
    );
    deepStrictEqual(await client.transfer(input), response);
  });

  test(".transfer() (uses default currency)", async () => {
    const request = "/v1/transfer";
    const input = {
      amount: "1.0",
      walletfrom: "trading" as const,
      walletto: "exchange" as const,
    };
    const validate = (decoded: Record<string, unknown>): boolean =>
      decoded.currency === "USD" &&
      decoded.amount === "1.0" &&
      decoded.walletfrom === "trading" &&
      decoded.walletto === "exchange";
    const response: ITransferResponse = [{ status: "success", message: "ok" }];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeadersFn(request, validate),
      },
      response,
    );
    deepStrictEqual(await client.transfer(input), response);
  });

  test(".withdraw()", async () => {
    const request = "/v1/withdraw";
    const body = {
      withdraw_type: "bitcoin",
      walletselected: "exchange" as const,
      amount: "1.0",
      address: "1ABC",
    };
    const response: IWithdrawResponse = [
      { status: "success", message: "ok", withdrawal_id: 1 },
    ];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.withdraw(body), response);
  });

  test(".newOrder() (uses default symbol and aff_code)", async () => {
    const request = "/v1/order/new";
    const body: IOrderOptions = {
      amount: "1",
      price: "3",
      type: "limit",
      side: "buy",
    };
    const validate = (decoded: Record<string, unknown>): boolean =>
      decoded.symbol === "BTCUSD" &&
      decoded.aff_code === AffCode &&
      decoded.amount === "1" &&
      decoded.price === "3" &&
      decoded.type === "limit" &&
      decoded.side === "buy";
    const response: IOrderResponse = {
      id: 1,
      cid: 1,
      cid_date: "",
      gid: null,
      symbol: "BTCUSD",
      exchange: "bitfinex",
      price: "3",
      avg_execution_price: "0",
      side: "buy",
      type: "limit",
      timestamp: "0",
      is_live: true,
      is_cancelled: false,
      is_hidden: false,
      was_forced: false,
      original_amount: "1",
      remaining_amount: "1",
      executed_amount: "0",
    };
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeadersFn(request, validate),
      },
      response,
    );
    deepStrictEqual(await client.newOrder(body), response);
  });

  test(".newOrders() (fills missing symbol from default)", async () => {
    const request = "/v1/order/new/multi";
    const orders: IOrderOptions[] = [
      { amount: "1", price: "3", type: "limit", side: "buy" },
      {
        amount: "2",
        price: "2",
        type: "limit",
        side: "buy",
        symbol: "ETHUSD",
      },
    ];
    const validate = (decoded: Record<string, unknown>): boolean => {
      const list = decoded.orders as { symbol: string }[];
      return list[0]?.symbol === "BTCUSD" && list[1]?.symbol === "ETHUSD";
    };
    const response: INewOrdersResponse = { order_ids: [], status: "ok" };
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeadersFn(request, validate),
      },
      response,
    );
    deepStrictEqual(await client.newOrders({ orders }), response);
  });

  test(".cancelOrder()", async () => {
    const request = "/v1/order/cancel";
    const body = { order_id: 1 };
    const response = { id: 1 } as IOrderResponse;
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.cancelOrder(body), response);
  });

  test(".cancelOrders()", async () => {
    const request = "/v1/order/cancel/multi";
    const body = { order_ids: [1, 2] };
    const response = { result: "ok" };
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.cancelOrders(body), response);
  });

  test(".cancelAllOrders()", async () => {
    const request = "/v1/order/cancel/all";
    const response = { result: "all orders cancelled" };
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.cancelAllOrders(), response);
  });

  test(".replaceOrder() (uses default symbol)", async () => {
    const request = "/v1/order/cancel/replace";
    const body = {
      order_id: 1,
      amount: "1",
      price: "3",
      type: "limit" as const,
      side: "buy" as const,
    };
    const validate = (decoded: Record<string, unknown>): boolean =>
      decoded.symbol === "BTCUSD" &&
      decoded.order_id === 1 &&
      decoded.aff_code === AffCode;
    const response = { id: 1 } as IOrderResponse;
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeadersFn(request, validate),
      },
      response,
    );
    deepStrictEqual(await client.replaceOrder(body), response);
  });

  test(".getOrder()", async () => {
    const request = "/v1/order/status";
    const body = { order_id: 1 };
    const response = { id: 1 } as IOrderResponse;
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.getOrder(body), response);
  });

  test(".getOrders()", async () => {
    const request = "/v1/orders";
    const response: IOrderResponse[] = [];
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getOrders(), response);
  });

  test(".getOrderHistory()", async () => {
    const request = "/v1/orders/hist";
    const body = { limit: 10 };
    const response: IOrderResponse[] = [];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.getOrderHistory(body), response);
  });

  test(".getPositions()", async () => {
    const request = "/v1/positions";
    const response: IPosition[] = [];
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getPositions(), response);
  });

  test(".claimPosition()", async () => {
    const request = "/v1/position/claim";
    const body = { position_id: 943715, amount: "1.0" };
    const response = { id: 943715 } as IPosition;
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.claimPosition(body), response);
  });

  test(".getBalanceHistory()", async () => {
    const request = "/v1/history";
    const body = { currency: "USD" };
    const response: IHistoryBalance[] = [];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.getBalanceHistory(body), response);
  });

  test(".getDepositsWithdrawals()", async () => {
    const request = "/v1/history/movements";
    const body = { currency: "BTC" };
    const response: IDepositWithdrawal[] = [];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.getDepositsWithdrawals(body), response);
  });

  test(".getPastTrades() (uses default symbol)", async () => {
    const request = "/v1/mytrades";
    const validate = (decoded: Record<string, unknown>): boolean =>
      decoded.symbol === "BTCUSD";
    const response: IPastTrade[] = [];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeadersFn(request, validate),
      },
      response,
    );
    deepStrictEqual(await client.getPastTrades(), response);
  });

  test(".newOffer()", async () => {
    const request = "/v1/offer/new";
    const body = {
      currency: "USD",
      amount: "50.0",
      rate: "20.0",
      period: 2,
      direction: "lend" as const,
    };
    const response = { id: 1 } as IOffer;
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.newOffer(body), response);
  });

  test(".cancelOffer()", async () => {
    const request = "/v1/offer/cancel";
    const body = { offer_id: 1 };
    const response = { id: 1 } as IOffer;
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.cancelOffer(body), response);
  });

  test(".offerStatus()", async () => {
    const request = "/v1/offer/status";
    const body = { offer_id: 1 };
    const response = { id: 1 } as IOffer;
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.offerStatus(body), response);
  });

  test(".activeCredits()", async () => {
    const request = "/v1/credits";
    const response: ICredit[] = [];
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.activeCredits(), response);
  });

  test(".getOffers()", async () => {
    const request = "/v1/offers";
    const response: IOffer[] = [];
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getOffers(), response);
  });

  test(".offersHistory()", async () => {
    const request = "/v1/offers/hist";
    const body = { limit: 25 };
    const response: IOffer[] = [];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.offersHistory(body), response);
  });

  test(".getFundingTrades()", async () => {
    const request = "/v1/mytrades_funding";
    const body = { symbol: "USD", limit_trades: 1, until: "1444141858.0" };
    const response: IFundingTrade[] = [];
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.getFundingTrades(body), response);
  });

  test(".getTakenFunds()", async () => {
    const request = "/v1/taken_funds";
    const response: ITakenFund[] = [];
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getTakenFunds(), response);
  });

  test(".getUnusedFunds()", async () => {
    const request = "/v1/unused_taken_funds";
    const response: ITakenFund[] = [];
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getUnusedFunds(), response);
  });

  test(".getTotalFunds()", async () => {
    const request = "/v1/total_taken_funds";
    const response: ITotalFund[] = [];
    mockFetch(
      { path: request, method: "POST", headers: expectAuthHeaders(request) },
      response,
    );
    deepStrictEqual(await client.getTotalFunds(), response);
  });

  test(".closeFunding()", async () => {
    const request = "/v1/funding/close";
    const body = { swap_id: 11576737 };
    const response = { id: 1 } as ITakenFund;
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.closeFunding(body), response);
  });

  test(".closePosition()", async () => {
    const request = "/v1/position/close";
    const body = { position_id: 943715 };
    const response = {
      message: "Position closed",
    } as IClosePositionResponse;
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: expectAuthHeaders(request, body),
      },
      response,
    );
    deepStrictEqual(await client.closePosition(body), response);
  });

  test("sends a payload that decodes to the expected JSON", async () => {
    const request = "/v1/account_infos";
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: (headers): boolean => {
          ok(typeof headers["x-bfx-payload"] === "string");
          const decoded = decodePayload(headers["x-bfx-payload"]);
          deepStrictEqual(decoded, { request, nonce });
          return true;
        },
      },
      [],
    );
    await client.getAccountInfo();
  });

  test("sends the signed JSON as the request body", async () => {
    const request = "/v1/order/new";
    const input: IOrderOptions = {
      amount: "1",
      price: "3",
      type: "limit",
      side: "buy",
    };
    const expectedBody = JSON.stringify({
      symbol: "BTCUSD",
      ...input,
      aff_code: AffCode,
      request,
      nonce,
    });
    mockFetch(
      {
        path: request,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: (body): boolean => body === expectedBody,
      },
      {},
    );
    await client.newOrder(input);
  });
});
