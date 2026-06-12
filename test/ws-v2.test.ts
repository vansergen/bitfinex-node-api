/* eslint-disable @typescript-eslint/no-floating-promises */
import { deepStrictEqual, ok, rejects } from "node:assert";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, test } from "node:test";
import { WebSocketServer, type WebSocket as WSConn } from "ws";
import {
  type IAuthSuccessMessageV2,
  type IBalanceUpdateV2Message,
  type IBookSnapshotV2Message,
  type IBookUpdateV2Message,
  type ICandlesSnapshotV2Message,
  type ICandleUpdateV2Message,
  type IChannelMessageV2,
  type IChecksumMessageV2,
  type IDerivativesStatusV2Message,
  type IFundingBookSnapshotV2Message,
  type IFundingOfferSnapshotV2Message,
  type IFundingTickerV2Message,
  type IFundingTradesSnapshotV2Message,
  type IHeartbeatMessageV2,
  type ILiquidationFeedV2Message,
  type IMessageV2,
  type IOrderSnapshotV2Message,
  type IPositionSnapshotV2Message,
  type IRawBookSnapshotV2Message,
  type ISubscribedMessageV2,
  type ITickerV2Message,
  type ITradesSnapshotV2Message,
  type ITradeUpdatedV2Message,
  type IUnsubscribedMessageV2,
  type IWalletSnapshotV2Message,
  type IWalletUpdateV2Message,
  DefaultV2Symbol,
  WebSocketAuthURLV2,
  WebSocketClientV2,
  WebSocketURLV2,
  WSAbort,
} from "../index.js";

const key = "bitfinex-api-key";
const secret = "bitfinex-api-secret";
const nonce = "1574959951447000";

interface IRunningServer {
  server: WebSocketServer;
  url: string;
}

function startServer(): Promise<IRunningServer> {
  return new Promise((resolve, reject) => {
    const server = new WebSocketServer({ port: 0 });
    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address() as AddressInfo;
      ok(address.port);
      resolve({ server, url: `ws://127.0.0.1:${address.port}/ws/2` });
    });
  });
}

function stopServer(server: WebSocketServer): Promise<void> {
  for (const client of server.clients) {
    client.terminate();
  }
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function waitForSocket(server: WebSocketServer): Promise<WSConn> {
  return new Promise((resolve) => {
    server.once("connection", (socket) => {
      resolve(socket);
    });
  });
}

function waitForMessage(socket: WSConn): Promise<unknown> {
  return new Promise((resolve) => {
    socket.once("message", (data: Buffer) => {
      resolve(JSON.parse(data.toString()));
    });
  });
}

/* eslint-disable init-declarations */
describe("WebSocketClientV2", () => {
  let server: WebSocketServer;
  let ws_url: string;
  let client: WebSocketClientV2;

  beforeEach(async () => {
    ({ server, url: ws_url } = await startServer());
    client = new WebSocketClientV2({
      ws_url,
      key,
      secret,
      nonce: (): string => nonce,
    });
  });

  afterEach(async () => {
    if (client.ws) {
      await client.disconnect().catch((): null => null);
    }
    await stopServer(server);
  });

  test("constants are exported", () => {
    deepStrictEqual(WebSocketURLV2, "wss://api-pub.bitfinex.com/ws/2");
    deepStrictEqual(WebSocketAuthURLV2, "wss://api.bitfinex.com/ws/2");
  });

  test("constructor uses public URL without credentials", () => {
    const c = new WebSocketClientV2();
    deepStrictEqual(c.symbol, DefaultV2Symbol);
    deepStrictEqual(c.ws, null);
  });

  /* ----------------------------- lifecycle ----------------------------- */

  test("connect is a no-op when already open", async () => {
    await client.connect();
    await client.connect();
    ok(client.ws);
  });

  test("disconnect resolves when no socket", async () => {
    const c = new WebSocketClientV2({ ws_url });
    await c.disconnect();
  });

  test("disconnect is a no-op when already CLOSED", async () => {
    await client.connect();
    await client.disconnect();
    await client.disconnect();
  });

  test("send rejects when websocket is not connected", async () => {
    const c = new WebSocketClientV2({ ws_url });
    await rejects(c.send({ event: "ping" }), /not connected/u);
  });

  test("send rejects when websocket is closed", async () => {
    await client.connect();
    await client.disconnect();
    await rejects(client.send({ event: "ping" }), /not open|not connected/u);
  });

  test("send resolves and delivers the payload when open", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);
    await client.send({ event: "ping", cid: 99 });
    deepStrictEqual(await messagePromise, { event: "ping", cid: 99 });
  });

  test("send rejects when payload is not JSON-serializable", async () => {
    await client.connect();
    await rejects(client.send({ n: 1n }), /BigInt|JSON/u);
  });

  test("ping rejects when websocket is not connected", async () => {
    const c = new WebSocketClientV2({ ws_url });
    await rejects(c.ping(), /not connected/u);
  });

  test("emits an Error for `event: error` server frames", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const errorPromise = new Promise<Error>((resolve) => {
      client.once("error", (error) => {
        resolve(error as Error);
      });
    });
    socket.send(JSON.stringify({ event: "error", msg: "boom", code: 10000 }));
    const error = await errorPromise;
    ok(error instanceof Error);
    deepStrictEqual(error.message, "boom");
  });

  test("emits an Error on non-JSON frames", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const errorPromise = new Promise<Error>((resolve) => {
      client.once("error", (error) => {
        resolve(error as Error);
      });
    });
    socket.send("not-json");
    const error = await errorPromise;
    ok(error instanceof Error);
    ok(error.message.includes("JSON"));
  });

  test("passes info messages through to listeners", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const infoPromise = new Promise<IMessageV2>((resolve) => {
      const handler = (message: IMessageV2): void => {
        if ("event" in message && message.event === "info") {
          client.off("message", handler);
          resolve(message);
        }
      };
      client.on("message", handler);
    });
    socket.send(
      JSON.stringify({ event: "info", version: 2, platform: { status: 1 } }),
    );
    const info = await infoPromise;
    deepStrictEqual("event" in info && info.event, "info");
  });

  test("subscribeTicker uses symbol (not pair) and parses funding via currency", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const subPromise = client.subscribeTicker({ symbol: "fUSD" });
    deepStrictEqual(await messagePromise, {
      event: "subscribe",
      channel: "ticker",
      symbol: "fUSD",
    });

    const reply: ISubscribedMessageV2 = {
      event: "subscribed",
      channel: "ticker",
      chanId: 7,
      symbol: "fUSD",
      currency: "USD",
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await subPromise, reply);
  });

  /* ----------------------- helpers for frame parsing ------------------- */

  async function autoSubscribe(
    chanId: number,
    extra: Partial<ISubscribedMessageV2> = {},
  ): Promise<WSConn> {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    socket.on("message", (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as Record<string, unknown>;
      if (msg.event !== "subscribe") {
        return;
      }
      const reply: ISubscribedMessageV2 = {
        event: "subscribed",
        channel: msg.channel as ISubscribedMessageV2["channel"],
        chanId,
        ...(typeof msg.symbol === "string" ? { symbol: msg.symbol } : {}),
        ...(typeof msg.prec === "string"
          ? { prec: msg.prec as NonNullable<ISubscribedMessageV2["prec"]> }
          : {}),
        ...(typeof msg.key === "string" ? { key: msg.key } : {}),
        ...extra,
      };
      socket.send(JSON.stringify(reply));
    });
    return socket;
  }

  function nextChannelMessage(chanId: number): Promise<IChannelMessageV2> {
    return new Promise((resolve) => {
      const handler = (msg: IMessageV2): void => {
        if ("channel_id" in msg && msg.channel_id === chanId) {
          client.off("message", handler);
          resolve(msg);
        }
      };
      client.on("message", handler);
    });
  }

  test("parses trading ticker frames (data nested in index [1])", async () => {
    const socket = await autoSubscribe(11);
    await client.subscribeTicker({ symbol: "tBTCUSD" });

    const messagePromise = nextChannelMessage(11);
    socket.send(
      JSON.stringify([
        11,
        [76892, 5.8, 76926, 7.03, 810, 0.0106, 76874, 1438.8, 76984, 74027],
      ]),
    );
    deepStrictEqual(await messagePromise, {
      channel_id: 11,
      type: "ticker",
      symbol: "tBTCUSD",
      bid: 76892,
      bid_size: 5.8,
      ask: 76926,
      ask_size: 7.03,
      daily_change: 810,
      daily_change_relative: 0.0106,
      last_price: 76874,
      volume: 1438.8,
      high: 76984,
      low: 74027,
    } satisfies ITickerV2Message);
  });

  test("parses funding ticker frames", async () => {
    const socket = await autoSubscribe(12, { symbol: "fUSD", currency: "USD" });
    await client.subscribeTicker({ symbol: "fUSD" });

    const messagePromise = nextChannelMessage(12);
    socket.send(
      JSON.stringify([
        12,
        [
          0.00031,
          0.00024,
          30,
          3939629,
          0.00019,
          2,
          307776,
          -0.00005,
          -0.2344,
          0.00019,
          122156333,
          0.00027,
          6.8e-7,
          null,
          null,
          3441851,
        ],
      ]),
    );
    deepStrictEqual(await messagePromise, {
      channel_id: 12,
      type: "funding_ticker",
      symbol: "fUSD",
      frr: 0.00031,
      bid: 0.00024,
      bid_period: 30,
      bid_size: 3939629,
      ask: 0.00019,
      ask_period: 2,
      ask_size: 307776,
      daily_change: -0.00005,
      daily_change_relative: -0.2344,
      last_price: 0.00019,
      volume: 122156333,
      high: 0.00027,
      low: 6.8e-7,
      frr_amount_available: 3441851,
    } satisfies IFundingTickerV2Message);
  });

  test("parses trades snapshot and te/tu (v2 layout [ID, MTS, AMOUNT, PRICE])", async () => {
    const socket = await autoSubscribe(17, { symbol: "tBTCUSD" });
    await client.subscribeTrades({ symbol: "tBTCUSD" });

    const snapPromise = nextChannelMessage(17);
    socket.send(
      JSON.stringify([17, [[401597393, 1574694475039, 0.005, 7244.9]]]),
    );
    deepStrictEqual(await snapPromise, {
      channel_id: 17,
      type: "trades_snapshot",
      symbol: "tBTCUSD",
      trades: [
        { id: 401597393, mts: 1574694475039, amount: 0.005, price: 7244.9 },
      ],
    } satisfies ITradesSnapshotV2Message);

    const tuPromise = nextChannelMessage(17);
    socket.send(
      JSON.stringify([17, "tu", [401597395, 1574694478808, 0.005, 7245.3]]),
    );
    deepStrictEqual(await tuPromise, {
      channel_id: 17,
      type: "trade_updated",
      symbol: "tBTCUSD",
      id: 401597395,
      mts: 1574694478808,
      amount: 0.005,
      price: 7245.3,
    } satisfies ITradeUpdatedV2Message);
  });

  test("parses funding trades snapshot", async () => {
    const socket = await autoSubscribe(339, {
      symbol: "fUSD",
      currency: "USD",
    });
    await client.subscribeTrades({ symbol: "fUSD" });

    const snapPromise = nextChannelMessage(339);
    socket.send(
      JSON.stringify([339, [[133323072, 1574694245478, -258.7, 0.0002587, 2]]]),
    );
    deepStrictEqual(await snapPromise, {
      channel_id: 339,
      type: "funding_trades_snapshot",
      symbol: "fUSD",
      trades: [
        {
          id: 133323072,
          mts: 1574694245478,
          amount: -258.7,
          rate: 0.0002587,
          period: 2,
        },
      ],
    } satisfies IFundingTradesSnapshotV2Message);
  });

  test("parses aggregated book snapshot and update", async () => {
    const socket = await autoSubscribe(170, { symbol: "tBTCUSD", prec: "P0" });
    await client.subscribeBook({ symbol: "tBTCUSD" });

    const snapPromise = nextChannelMessage(170);
    socket.send(
      JSON.stringify([
        170,
        [
          [7254.7, 3, 3.3],
          [7254.5, 0, -1],
        ],
      ]),
    );
    deepStrictEqual(await snapPromise, {
      channel_id: 170,
      type: "book_snapshot",
      symbol: "tBTCUSD",
      book: [
        { price: 7254.7, count: 3, amount: 3.3 },
        { price: 7254.5, count: 0, amount: -1 },
      ],
    } satisfies IBookSnapshotV2Message);

    const updPromise = nextChannelMessage(170);
    socket.send(JSON.stringify([170, [7254.5, 0, 1]]));
    deepStrictEqual(await updPromise, {
      channel_id: 170,
      type: "book_update",
      symbol: "tBTCUSD",
      price: 7254.5,
      count: 0,
      amount: 1,
    } satisfies IBookUpdateV2Message);
  });

  test("parses funding book snapshot", async () => {
    const socket = await autoSubscribe(431, {
      symbol: "fUSD",
      prec: "P0",
      currency: "USD",
    });
    await client.subscribeBook({ symbol: "fUSD" });

    const snapPromise = nextChannelMessage(431);
    socket.send(JSON.stringify([431, [[0.00023, 30, 1, -15190.7]]]));
    deepStrictEqual(await snapPromise, {
      channel_id: 431,
      type: "funding_book_snapshot",
      symbol: "fUSD",
      book: [{ rate: 0.00023, period: 30, count: 1, amount: -15190.7 }],
    } satisfies IFundingBookSnapshotV2Message);
  });

  test("parses raw book snapshot (R0)", async () => {
    const socket = await autoSubscribe(433, { symbol: "tBTCUSD", prec: "R0" });
    await client.subscribeRawBook({ symbol: "tBTCUSD" });

    const snapPromise = nextChannelMessage(433);
    socket.send(JSON.stringify([433, [[34753002978, 7294.7, 1.5434]]]));
    deepStrictEqual(await snapPromise, {
      channel_id: 433,
      type: "raw_book_snapshot",
      symbol: "tBTCUSD",
      book: [{ order_id: 34753002978, price: 7294.7, amount: 1.5434 }],
    } satisfies IRawBookSnapshotV2Message);
  });

  test("subscribeBook rejects precision R0", async () => {
    await client.connect();
    await rejects(
      client.subscribeBook({ symbol: "tBTCUSD", prec: "R0" as "P0" }),
      /R0/u,
    );
  });

  test("parses candles snapshot and update", async () => {
    const socket = await autoSubscribe(343, { key: "trade:1m:tBTCUSD" });
    await client.subscribeCandles({ key: "trade:1m:tBTCUSD" });

    const snapPromise = nextChannelMessage(343);
    socket.send(
      JSON.stringify([
        343,
        [[1574698260000, 7379.7, 7383.8, 7388.3, 7379.7, 1.68]],
      ]),
    );
    deepStrictEqual(await snapPromise, {
      channel_id: 343,
      type: "candles_snapshot",
      key: "trade:1m:tBTCUSD",
      candles: [
        {
          mts: 1574698260000,
          open: 7379.7,
          close: 7383.8,
          high: 7388.3,
          low: 7379.7,
          volume: 1.68,
        },
      ],
    } satisfies ICandlesSnapshotV2Message);

    const updPromise = nextChannelMessage(343);
    socket.send(
      JSON.stringify([
        343,
        [1574698200000, 7399.9, 7379.7, 7399.9, 7371.8, 41.6],
      ]),
    );
    deepStrictEqual(await updPromise, {
      channel_id: 343,
      type: "candle_update",
      key: "trade:1m:tBTCUSD",
      mts: 1574698200000,
      open: 7399.9,
      close: 7379.7,
      high: 7399.9,
      low: 7371.8,
      volume: 41.6,
    } satisfies ICandleUpdateV2Message);
  });

  test("parses derivatives status", async () => {
    const socket = await autoSubscribe(335, { key: "deriv:tBTCF0:USTF0" });
    await client.subscribeStatus({ key: "deriv:tBTCF0:USTF0" });

    const statusPromise = nextChannelMessage(335);
    socket.send(
      JSON.stringify([
        335,
        [
          1596124822000,
          null,
          0.896,
          0.771995,
          null,
          1396531.67,
          null,
          1596153600000,
          0.0001056,
          6,
          null,
          -0.0138,
          null,
          null,
          0.7664,
          null,
          null,
          246502.09,
          null,
          null,
          null,
          null,
          0.3,
        ],
      ]),
    );
    deepStrictEqual(await statusPromise, {
      channel_id: 335,
      type: "derivatives_status",
      key: "deriv:tBTCF0:USTF0",
      mts: 1596124822000,
      deriv_price: 0.896,
      spot_price: 0.771995,
      insurance_fund_balance: 1396531.67,
      next_funding_evt_timestamp_ms: 1596153600000,
      next_funding_accrued: 0.0001056,
      next_funding_step: 6,
      current_funding: -0.0138,
      mark_price: 0.7664,
      open_interest: 246502.09,
      clamp_min: null,
      clamp_max: 0.3,
    } satisfies IDerivativesStatusV2Message);
  });

  test("parses liquidation feed", async () => {
    const socket = await autoSubscribe(916, { key: "liq:global" });
    await client.subscribeStatus({ key: "liq:global" });

    const liqPromise = nextChannelMessage(916);
    socket.send(
      JSON.stringify([
        916,
        [
          [
            "pos",
            142397657,
            1574697680828,
            null,
            "tBSVUSD",
            -2.62932,
            91.5838,
            null,
            1,
            1,
            null,
            112.27,
          ],
        ],
      ]),
    );
    deepStrictEqual(await liqPromise, {
      channel_id: 916,
      type: "liquidation_feed",
      key: "liq:global",
      liquidations: [
        {
          pos_id: 142397657,
          mts: 1574697680828,
          symbol: "tBSVUSD",
          amount: -2.62932,
          base_price: 91.5838,
          is_match: 1,
          is_market_sold: 1,
          liquidation_price: 112.27,
        },
      ],
    } satisfies ILiquidationFeedV2Message);
  });

  test("parses heartbeat and checksum frames", async () => {
    const socket = await autoSubscribe(170, { symbol: "tBTCUSD", prec: "P0" });
    await client.subscribeBook({ symbol: "tBTCUSD" });

    const hbPromise = nextChannelMessage(170);
    socket.send(JSON.stringify([170, "hb"]));
    deepStrictEqual(await hbPromise, {
      channel_id: 170,
      type: "heartbeat",
    } satisfies IHeartbeatMessageV2);

    const csPromise = nextChannelMessage(170);
    socket.send(JSON.stringify([170, "cs", -1407560391]));
    deepStrictEqual(await csPromise, {
      channel_id: 170,
      type: "checksum",
      checksum: -1407560391,
    } satisfies IChecksumMessageV2);
  });

  test("drops channel frames for an unknown chanId", async () => {
    const socket = await autoSubscribe(170, { symbol: "tBTCUSD", prec: "P0" });
    await client.subscribeBook({ symbol: "tBTCUSD" });

    let leaked = false;
    const handler = (msg: IMessageV2): void => {
      if ("channel_id" in msg && msg.channel_id === 999) {
        leaked = true;
      }
    };
    client.on("message", handler);
    socket.send(JSON.stringify([999, [1, 2, 3]]));
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    client.off("message", handler);
    deepStrictEqual(leaked, false);
  });

  /* --------------------------- Auth frames ----------------------------- */

  test("parses wallet snapshot (ws) and update (wu)", async () => {
    await client.connect();
    const wsPromise = nextChannelMessage(0);
    client.ws?.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify([
          0,
          "ws",
          [["exchange", "SAN", 19.76, 0, null, null, null]],
        ]),
      }),
    );
    deepStrictEqual(await wsPromise, {
      channel_id: 0,
      type: "wallet_snapshot",
      wallets: [
        {
          wallet_type: "exchange",
          currency: "SAN",
          balance: 19.76,
          unsettled_interest: 0,
          balance_available: null,
          description: null,
          meta: null,
        },
      ],
    } satisfies IWalletSnapshotV2Message);

    const wuPromise = nextChannelMessage(0);
    client.ws?.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify([
          0,
          "wu",
          ["exchange", "BTC", 1.61, 0, null, "Exchange", { reason: "TRADE" }],
        ]),
      }),
    );
    deepStrictEqual(await wuPromise, {
      channel_id: 0,
      type: "wallet_update",
      wallet_type: "exchange",
      currency: "BTC",
      balance: 1.61,
      unsettled_interest: 0,
      balance_available: null,
      description: "Exchange",
      meta: { reason: "TRADE" },
    } satisfies IWalletUpdateV2Message);
  });

  test("parses position snapshot (ps)", async () => {
    await client.connect();
    const psPromise = nextChannelMessage(0);
    client.ws?.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify([
          0,
          "ps",
          [
            [
              "tETHUST",
              "ACTIVE",
              0.2,
              153.71,
              0,
              0,
              null,
              null,
              null,
              null,
              null,
              142420429,
              null,
              null,
              null,
              0,
              null,
              0,
              null,
              { reason: "TRADE" },
            ],
          ],
        ]),
      }),
    );
    const msg = (await psPromise) as IPositionSnapshotV2Message;
    deepStrictEqual(msg.type, "position_snapshot");
    deepStrictEqual(msg.positions[0]?.symbol, "tETHUST");
    deepStrictEqual(msg.positions[0]?.position_id, 142420429);
    deepStrictEqual(msg.positions[0]?.position_type, 0);
  });

  test("parses order snapshot (os)", async () => {
    await client.connect();
    const osPromise = nextChannelMessage(0);
    client.ws?.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify([
          0,
          "os",
          [
            [
              34930659963,
              null,
              1574955083558,
              "tETHUSD",
              1574955083558,
              1574955083573,
              0.2,
              0.2,
              "EXCHANGE LIMIT",
              null,
              null,
              null,
              0,
              "ACTIVE",
              null,
              null,
              120,
              0,
              0,
              0,
              null,
              null,
              null,
              0,
              0,
              null,
              null,
              null,
              "BFX",
              null,
              null,
              null,
            ],
          ],
        ]),
      }),
    );
    const msg = (await osPromise) as IOrderSnapshotV2Message;
    deepStrictEqual(msg.type, "order_snapshot");
    deepStrictEqual(msg.orders[0]?.id, 34930659963);
    deepStrictEqual(msg.orders[0]?.symbol, "tETHUSD");
    deepStrictEqual(msg.orders[0]?.price, 120);
    deepStrictEqual(msg.orders[0]?.routing, "BFX");
  });

  test("parses balance update (bu)", async () => {
    await client.connect();
    const buPromise = nextChannelMessage(0);
    client.ws?.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify([0, "bu", [4131.85, 4131.85]]),
      }),
    );
    deepStrictEqual(await buPromise, {
      channel_id: 0,
      type: "balance_update",
      aum: 4131.85,
      aum_net: 4131.85,
    } satisfies IBalanceUpdateV2Message);
  });

  test("parses funding offer snapshot (fos)", async () => {
    await client.connect();
    const fosPromise = nextChannelMessage(0);
    client.ws?.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify([
          0,
          "fos",
          [
            [
              41238905,
              "fUST",
              1573239266000,
              1573239266000,
              5000,
              5000,
              "LIMIT",
              null,
              null,
              0,
              "ACTIVE",
              null,
              null,
              null,
              0.0024,
              2,
              0,
              0,
              null,
              0,
              null,
            ],
          ],
        ]),
      }),
    );
    const msg = (await fosPromise) as IFundingOfferSnapshotV2Message;
    deepStrictEqual(msg.type, "funding_offer_snapshot");
    deepStrictEqual(msg.offers[0]?.id, 41238905);
    deepStrictEqual(msg.offers[0]?.rate, 0.0024);
    deepStrictEqual(msg.offers[0]?.period, 2);
  });

  test("parses trade_executed (te)", async () => {
    const socket = await autoSubscribe(17, { symbol: "tBTCUSD" });
    await client.subscribeTrades({ symbol: "tBTCUSD" });

    const tePromise = nextChannelMessage(17);
    socket.send(
      JSON.stringify([17, "te", [401597395, 1574694478808, 0.005, 7245.3]]),
    );
    deepStrictEqual(await tePromise, {
      channel_id: 17,
      type: "trade_executed",
      symbol: "tBTCUSD",
      id: 401597395,
      mts: 1574694478808,
      amount: 0.005,
      price: 7245.3,
    });
  });

  test("parses funding trade executed (fte) and updated (ftu)", async () => {
    const socket = await autoSubscribe(339, {
      symbol: "fUSD",
      currency: "USD",
    });
    await client.subscribeTrades({ symbol: "fUSD" });

    const ftePromise = nextChannelMessage(339);
    socket.send(
      JSON.stringify([339, "fte", [133, 1574694605000, -59.84, 0.00023647, 2]]),
    );
    deepStrictEqual(await ftePromise, {
      channel_id: 339,
      type: "funding_trade_executed",
      symbol: "fUSD",
      id: 133,
      mts: 1574694605000,
      amount: -59.84,
      rate: 0.00023647,
      period: 2,
    });

    const ftuPromise = nextChannelMessage(339);
    socket.send(
      JSON.stringify([339, "ftu", [134, 1574694605001, -59.84, 0.00023647, 2]]),
    );
    deepStrictEqual((await ftuPromise).type, "funding_trade_updated");
  });

  test("parses funding book update (single entry)", async () => {
    const socket = await autoSubscribe(431, {
      symbol: "fUSD",
      prec: "P0",
      currency: "USD",
    });
    await client.subscribeBook({ symbol: "fUSD" });

    const updPromise = nextChannelMessage(431);
    socket.send(JSON.stringify([431, [0.00023157, 2, 1, 66.35]]));
    deepStrictEqual(await updPromise, {
      channel_id: 431,
      type: "funding_book_update",
      symbol: "fUSD",
      rate: 0.00023157,
      period: 2,
      count: 1,
      amount: 66.35,
    });
  });

  test("parses raw book update (single entry, R0)", async () => {
    const socket = await autoSubscribe(433, { symbol: "tBTCUSD", prec: "R0" });
    await client.subscribeRawBook({ symbol: "tBTCUSD" });

    const updPromise = nextChannelMessage(433);
    socket.send(JSON.stringify([433, [34753006045, 0, -1]]));
    deepStrictEqual(await updPromise, {
      channel_id: 433,
      type: "raw_book_update",
      symbol: "tBTCUSD",
      order_id: 34753006045,
      price: 0,
      amount: -1,
    });
  });

  test("parses raw funding book snapshot and update (R0)", async () => {
    const socket = await autoSubscribe(472, {
      symbol: "fUSD",
      prec: "R0",
      currency: "USD",
    });
    await client.subscribeRawBook({ symbol: "fUSD" });

    const snapPromise = nextChannelMessage(472);
    socket.send(JSON.stringify([472, [[658282397, 30, 0.000233, -530]]]));
    deepStrictEqual(await snapPromise, {
      channel_id: 472,
      type: "raw_funding_book_snapshot",
      symbol: "fUSD",
      book: [{ offer_id: 658282397, period: 30, rate: 0.000233, amount: -530 }],
    });

    const updPromise = nextChannelMessage(472);
    socket.send(JSON.stringify([472, [658286906, 2, 0, 1]]));
    deepStrictEqual(await updPromise, {
      channel_id: 472,
      type: "raw_funding_book_update",
      symbol: "fUSD",
      offer_id: 658286906,
      period: 2,
      rate: 0,
      amount: 1,
    });
  });

  /* --------------------------- Auth events ----------------------------- */

  async function pushAuthFrame(frame: unknown): Promise<IChannelMessageV2> {
    if (!client.ws) {
      await client.connect();
    }
    const promise = nextChannelMessage(0);
    client.ws?.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(frame) }),
    );
    return promise;
  }

  const positionRow = [
    "tETHUST",
    "ACTIVE",
    0.2,
    153.71,
    0,
    0,
    null,
    null,
    null,
    null,
    null,
    142420429,
    null,
    null,
    null,
    0,
    null,
    0,
    null,
    null,
  ];
  const orderRow = [
    34930659963,
    null,
    1574955083558,
    "tETHUSD",
    1574955083558,
    1574955083573,
    0.2,
    0.2,
    "EXCHANGE LIMIT",
    null,
    null,
    null,
    0,
    "ACTIVE",
    null,
    null,
    120,
    0,
    0,
    0,
    null,
    null,
    null,
    0,
    0,
    null,
    null,
    null,
    "BFX",
    null,
    null,
    null,
  ];
  const offerRow = [
    41238905,
    "fUST",
    1573239266000,
    1573239266000,
    5000,
    5000,
    "LIMIT",
    null,
    null,
    0,
    "ACTIVE",
    null,
    null,
    null,
    0.0024,
    2,
    0,
    0,
    null,
    0,
    null,
  ];
  const loanRow = [
    2995368,
    "fUST",
    0,
    1574077517000,
    1574077517000,
    100,
    null,
    "ACTIVE",
    "FIXED",
    null,
    null,
    0.0024,
    2,
    1574077517000,
    1574077517000,
    0,
    null,
    null,
    0,
    null,
    0,
  ];
  const creditRow = [...loanRow.slice(0, 21), "tBTCUST"];

  test("parses position events (pn/pu/pc)", async () => {
    for (const [tag, type] of [
      ["pn", "position_new"],
      ["pu", "position_update"],
      ["pc", "position_close"],
    ] as const) {
      const msg = await pushAuthFrame([0, tag, positionRow]);
      deepStrictEqual(msg.type, type);
      deepStrictEqual((msg as { position_id: number }).position_id, 142420429);
    }
  });

  test("parses order events (on/ou/oc)", async () => {
    for (const [tag, type] of [
      ["on", "order_new"],
      ["ou", "order_update"],
      ["oc", "order_cancel"],
    ] as const) {
      const msg = await pushAuthFrame([0, tag, orderRow]);
      deepStrictEqual(msg.type, type);
      deepStrictEqual((msg as { id: number }).id, 34930659963);
    }
  });

  test("parses funding offer events (fon/fou/foc)", async () => {
    for (const [tag, type] of [
      ["fon", "funding_offer_new"],
      ["fou", "funding_offer_update"],
      ["foc", "funding_offer_cancel"],
    ] as const) {
      const msg = await pushAuthFrame([0, tag, offerRow]);
      deepStrictEqual(msg.type, type);
      deepStrictEqual((msg as { rate: number }).rate, 0.0024);
    }
  });

  test("parses funding credit snapshot and events (fcs/fcn/fcu/fcc)", async () => {
    const snap = await pushAuthFrame([0, "fcs", [creditRow]]);
    deepStrictEqual(snap.type, "funding_credit_snapshot");
    deepStrictEqual(
      (snap as { credits: { position_pair: string }[] }).credits[0]
        ?.position_pair,
      "tBTCUST",
    );
    for (const [tag, type] of [
      ["fcn", "funding_credit_new"],
      ["fcu", "funding_credit_update"],
      ["fcc", "funding_credit_close"],
    ] as const) {
      const msg = await pushAuthFrame([0, tag, creditRow]);
      deepStrictEqual(msg.type, type);
      deepStrictEqual(
        (msg as { position_pair: string }).position_pair,
        "tBTCUST",
      );
    }
  });

  test("parses funding loan snapshot and events (fls/fln/flu/flc)", async () => {
    const snap = await pushAuthFrame([0, "fls", [loanRow]]);
    deepStrictEqual(snap.type, "funding_loan_snapshot");
    for (const [tag, type] of [
      ["fln", "funding_loan_new"],
      ["flu", "funding_loan_update"],
      ["flc", "funding_loan_close"],
    ] as const) {
      const msg = await pushAuthFrame([0, tag, loanRow]);
      deepStrictEqual(msg.type, type);
      deepStrictEqual((msg as { id: number }).id, 2995368);
    }
  });

  test("parses notification (n)", async () => {
    const msg = await pushAuthFrame([
      0,
      "n",
      [
        1574955083558,
        "on-req",
        null,
        null,
        orderRow,
        null,
        "SUCCESS",
        "Submitting order",
      ],
    ]);
    deepStrictEqual(msg.type, "notification");
    deepStrictEqual(
      (msg as { notification_type: string }).notification_type,
      "on-req",
    );
    deepStrictEqual((msg as { status: string }).status, "SUCCESS");
    deepStrictEqual((msg as { text: string }).text, "Submitting order");
  });

  test("wraps unknown auth frames in an envelope", async () => {
    await client.connect();
    const envPromise = nextChannelMessage(0);
    client.ws?.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify([0, "miu", ["base", [-3631, 5.6, 299933]]]),
      }),
    );
    deepStrictEqual(await envPromise, {
      channel_id: 0,
      type: "auth_envelope",
      mnemonic: "miu",
      payload: ["base", [-3631, 5.6, 299933]],
    });
  });

  /* ------------------------------- ping/conf --------------------------- */

  test("ping resolves with matching cid pong", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    socket.on("message", (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as {
        event?: string;
        cid?: number;
      };
      if (msg.event === "ping") {
        socket.send(
          JSON.stringify({ event: "pong", ts: 1511545528111, cid: msg.cid }),
        );
      }
    });
    const pong = await client.ping();
    deepStrictEqual(pong.event, "pong");
    deepStrictEqual(typeof pong.cid, "number");
    deepStrictEqual(pong.ts, 1511545528111);
  });

  test("conf sends flags and resolves on conf response", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const confPromise = client.conf({ flags: 131072 });
    deepStrictEqual(await messagePromise, { event: "conf", flags: 131072 });
    socket.send(JSON.stringify({ event: "conf", status: "OK" }));
    deepStrictEqual(await confPromise, { event: "conf", status: "OK" });
  });

  test("unsubscribe matches by chanId", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const unsubPromise = client.unsubscribe({ chanId: 7 });
    deepStrictEqual(await messagePromise, { event: "unsubscribe", chanId: 7 });
    const reply: IUnsubscribedMessageV2 = {
      event: "unsubscribed",
      status: "OK",
      chanId: 7,
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await unsubPromise, reply);
  });

  /* --------------------------------- auth ------------------------------ */

  test("auth sends correct signature and resolves on OK", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const authPromise = client.auth();
    const sent = (await messagePromise) as Record<string, unknown>;
    const expectedSig = createHmac("sha384", secret)
      .update(`AUTH${nonce}`)
      .digest("hex");
    deepStrictEqual(sent.event, "auth");
    deepStrictEqual(sent.apiKey, key);
    deepStrictEqual(sent.authNonce, nonce);
    deepStrictEqual(sent.authPayload, `AUTH${nonce}`);
    deepStrictEqual(sent.authSig, expectedSig);

    const reply: IAuthSuccessMessageV2 = {
      event: "auth",
      status: "OK",
      chanId: 0,
      userId: 42,
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await authPromise, reply);
  });

  test("auth includes dms and filter when provided", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    client
      .auth({ dms: 4, filter: ["trading", "wallet"] })
      .catch((): null => null);
    const sent = (await messagePromise) as Record<string, unknown>;
    deepStrictEqual(sent.dms, 4);
    deepStrictEqual(sent.filter, ["trading", "wallet"]);
  });

  test("auth rejects on FAILED status", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const authPromise = client.auth();
    await messagePromise;
    socket.send(
      JSON.stringify({
        event: "auth",
        status: "FAILED",
        chanId: 0,
        code: 10100,
      }),
    );
    await rejects(authPromise, /10100|failed/iu);
  });

  test("auth rejects when credentials are missing", async () => {
    const c = new WebSocketClientV2({ ws_url });
    await c.connect();
    await rejects(c.auth(), /credentials are missing/u);
    await c.disconnect();
  });

  /* ----------------------------- abort/iterators ----------------------- */

  test("subscribe rejects when aborted before send", async () => {
    await client.connect();
    const controller = new AbortController();
    controller.abort();
    await rejects(
      client.subscribeTicker({ symbol: "tBTCUSD", signal: controller.signal }),
      WSAbort,
    );
  });

  /**
   * Drive an async iterator: start it, let the subscribe round-trip settle,
   * push a synthetic data frame, and return the first yielded value.
   */
  async function firstFromIterator<T>(
    chanId: number,
    extra: Partial<ISubscribedMessageV2>,
    makeIterator: () => AsyncGenerator<T, void, undefined>,
    frame: unknown,
  ): Promise<T> {
    const socket = await autoSubscribe(chanId, extra);
    const iterator = makeIterator();
    const first = iterator.next();
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    socket.send(JSON.stringify(frame));
    const { value } = await first;
    await iterator.return();
    if (typeof value === "undefined") {
      throw new Error("iterator yielded no value");
    }
    return value;
  }

  test("tickers() async iterator yields parsed ticker messages", async () => {
    const value = await firstFromIterator(
      11,
      { symbol: "tBTCUSD" },
      () => client.tickers({ symbol: "tBTCUSD" }),
      [11, [76892, 5.8, 76926, 7.03, 810, 0.0106, 76874, 1438.8, 76984, 74027]],
    );
    deepStrictEqual(value.type, "ticker");
    deepStrictEqual(value.symbol, "tBTCUSD");
  });

  test("trades() async iterator yields snapshot", async () => {
    const value = await firstFromIterator(
      17,
      { symbol: "tBTCUSD" },
      () => client.trades({ symbol: "tBTCUSD" }),
      [17, [[401597393, 1574694475039, 0.005, 7244.9]]],
    );
    deepStrictEqual(value.type, "trades_snapshot");
  });

  test("books() async iterator yields snapshot", async () => {
    const value = await firstFromIterator(
      170,
      { symbol: "tBTCUSD", prec: "P0" },
      () => client.books({ symbol: "tBTCUSD" }),
      [170, [[7254.7, 3, 3.3]]],
    );
    deepStrictEqual(value.type, "book_snapshot");
  });

  test("rawBooks() async iterator yields snapshot", async () => {
    const value = await firstFromIterator(
      433,
      { symbol: "tBTCUSD", prec: "R0" },
      () => client.rawBooks({ symbol: "tBTCUSD" }),
      [433, [[34753002978, 7294.7, 1.5434]]],
    );
    deepStrictEqual(value.type, "raw_book_snapshot");
  });

  test("candles() async iterator yields snapshot", async () => {
    const value = await firstFromIterator(
      343,
      { key: "trade:1m:tBTCUSD" },
      () => client.candles({ key: "trade:1m:tBTCUSD" }),
      [343, [[1574698260000, 7379.7, 7383.8, 7388.3, 7379.7, 1.68]]],
    );
    deepStrictEqual(value.type, "candles_snapshot");
  });

  test("status() async iterator yields derivatives status", async () => {
    const value = await firstFromIterator(
      335,
      { key: "deriv:tBTCF0:USTF0" },
      () => client.status({ key: "deriv:tBTCF0:USTF0" }),
      [
        335,
        [
          1596124822000,
          null,
          0.896,
          0.771995,
          null,
          1396531.67,
          null,
          1596153600000,
          0.0001056,
          6,
          null,
          -0.0138,
          null,
          null,
          0.7664,
          null,
          null,
          246502.09,
          null,
          null,
          null,
          null,
          0.3,
        ],
      ],
    );
    deepStrictEqual(value.type, "derivatives_status");
  });
});
