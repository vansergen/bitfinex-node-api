/* eslint-disable @typescript-eslint/no-floating-promises */
import { deepStrictEqual, ok, rejects } from "node:assert";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, test } from "node:test";
import { WebSocketServer, type WebSocket as WSConn } from "ws";
import {
  type IAuthSuccessMessage,
  DefaultSymbol,
  type IBookSnapshotMessage,
  type IBookUpdateMessage,
  type IHeartbeatMessage,
  type IMessage,
  type IPongMessage,
  type IRawBookSnapshotMessage,
  type IRawBookUpdateMessage,
  type ISubscribedMessage,
  type ITickerMessage,
  type ITradeExecutedMessage,
  type ITradeUpdatedMessage,
  type ITradesSnapshotMessage,
  type IUnauthMessage,
  type IUnsubscribedMessage,
  type IWalletSnapshotMessage,
  type IWalletUpdateMessage,
  WebSocketClient,
  WebSocketURL,
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
      resolve({ server, url: `ws://127.0.0.1:${address.port}/ws/1` });
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
describe("WebSocketClient", () => {
  let server: WebSocketServer;
  let ws_url: string;
  let client: WebSocketClient;

  beforeEach(async () => {
    ({ server, url: ws_url } = await startServer());
    client = new WebSocketClient({
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

  test("constructor defaults", () => {
    const c = new WebSocketClient();
    deepStrictEqual(c.symbol, DefaultSymbol);
    deepStrictEqual(c.ws, null);
  });

  test("connect resolves on open and updates ws", async () => {
    await client.connect();
    ok(client.ws);
  });

  test("connect is a no-op when already open", async () => {
    await client.connect();
    await client.connect();
    ok(client.ws);
  });

  test("disconnect resolves when no socket", async () => {
    const c = new WebSocketClient({ ws_url });
    await c.disconnect();
  });

  test("ping/pong", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    socket.on("message", (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as { event: string };
      if (msg.event === "ping") {
        socket.send(JSON.stringify({ event: "pong" }));
      }
    });

    const expected: IPongMessage = { event: "pong" };
    deepStrictEqual(await client.ping(), expected);
  });

  test("emits parsed messages on the `message` event", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    const received = new Promise((resolve) => {
      client.once("message", resolve);
    });

    socket.send(JSON.stringify({ event: "info", version: 1 }));
    deepStrictEqual(await received, { event: "info", version: 1 });
  });

  test("converts an `event:error` frame into the `error` listener", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    const received = new Promise<Error>((resolve) => {
      client.once("error", (err) => {
        resolve(err as Error);
      });
    });

    socket.send(JSON.stringify({ event: "error", msg: "oops", code: 10000 }));
    const err = await received;
    deepStrictEqual(err.message, "oops");
  });

  test("emits a parse error when the frame is not JSON", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    const received = new Promise<Error>((resolve) => {
      client.once("error", (err) => {
        resolve(err as Error);
      });
    });

    socket.send("not-json");
    const err = await received;
    deepStrictEqual(err.message, "Message could not be parsed by `JSON.parse`");
  });

  test("subscribeTicker sends the correct payload", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const subPromise = client.subscribeTicker({ pair: "ETHUSD" });
    deepStrictEqual(await messagePromise, {
      event: "subscribe",
      channel: "ticker",
      pair: "ETHUSD",
    });

    const reply: ISubscribedMessage = {
      event: "subscribed",
      channel: "ticker",
      chanId: 1,
      pair: "ETHUSD",
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await subPromise, reply);
  });

  test("subscribeTrades uses the default symbol", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const subPromise = client.subscribeTrades();
    deepStrictEqual(await messagePromise, {
      event: "subscribe",
      channel: "trades",
      pair: DefaultSymbol,
    });

    const reply: ISubscribedMessage = {
      event: "subscribed",
      channel: "trades",
      chanId: 2,
      pair: DefaultSymbol,
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await subPromise, reply);
  });

  test("subscribeBook sends prec/freq/len", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const subPromise = client.subscribeBook({
      pair: "BTCUSD",
      prec: "P1",
      freq: "F1",
      len: 25,
    });
    deepStrictEqual(await messagePromise, {
      event: "subscribe",
      channel: "book",
      pair: "BTCUSD",
      prec: "P1",
      freq: "F1",
      len: "25",
    });

    const reply: ISubscribedMessage = {
      event: "subscribed",
      channel: "book",
      chanId: 3,
      pair: "BTCUSD",
      prec: "P1",
      freq: "F1",
      len: "25",
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await subPromise, reply);
  });

  test("subscribeRawBook forces precision R0", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const subPromise = client.subscribeRawBook({ pair: "BTCUSD", len: 100 });
    deepStrictEqual(await messagePromise, {
      event: "subscribe",
      channel: "book",
      pair: "BTCUSD",
      prec: "R0",
      len: "100",
    });

    const reply: ISubscribedMessage = {
      event: "subscribed",
      channel: "book",
      chanId: 4,
      pair: "BTCUSD",
      prec: "R0",
      len: "100",
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await subPromise, reply);
  });

  test("unsubscribe matches by chanId", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const unsubPromise = client.unsubscribe({ chanId: 7 });
    deepStrictEqual(await messagePromise, { event: "unsubscribe", chanId: 7 });

    const reply: IUnsubscribedMessage = {
      event: "unsubscribed",
      status: "OK",
      chanId: 7,
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await unsubPromise, reply);
  });

  test("auth sends a valid HMAC signature and resolves on OK", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const authPromise = client.auth();
    const received = (await messagePromise) as Record<string, unknown>;

    deepStrictEqual(received.event, "auth");
    deepStrictEqual(received.apiKey, key);
    deepStrictEqual(received.authNonce, nonce);
    deepStrictEqual(received.authPayload, `AUTH${nonce}`);
    // v1 contract has exactly five fields — no `filter`/`dms`/`calc`.
    deepStrictEqual(Object.keys(received).sort(), [
      "apiKey",
      "authNonce",
      "authPayload",
      "authSig",
      "event",
    ]);

    const expectedSig = createHmac("sha384", secret)
      .update(`AUTH${nonce}`)
      .digest("hex");
    deepStrictEqual(received.authSig, expectedSig);

    const reply: IAuthSuccessMessage = {
      event: "auth",
      status: "OK",
      chanId: 0,
      userId: 1234,
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await authPromise, reply);
  });

  test("auth rejects when status is FAIL", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    const authPromise = client.auth();
    await waitForMessage(socket);

    socket.send(
      JSON.stringify({
        event: "auth",
        status: "FAIL",
        chanId: 0,
        code: 10100,
        msg: "apikey: invalid",
      }),
    );

    await rejects(authPromise, /apikey: invalid/u);
  });

  test("auth without credentials rejects", async () => {
    const c = new WebSocketClient({ ws_url });
    await c.connect();
    await rejects(c.auth(), /Auth credentials are missing/u);
    await c.disconnect();
  });

  test("unauth sends an unauth event", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const unauthPromise = client.unauth();
    deepStrictEqual(await messagePromise, { event: "unauth" });

    const reply: IUnauthMessage = {
      event: "unauth",
      status: "OK",
      chanId: 0,
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await unauthPromise, reply);
  });

  test("unauth rejects on `event: error` failure response (code 10201)", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const unauthPromise = client.unauth();
    await waitForMessage(socket);

    socket.send(
      JSON.stringify({
        event: "error",
        status: "FAILED",
        chanId: 0,
        code: 10201,
      }),
    );

    await rejects(unauthPromise, /code 10201/u);
  });

  test("send rejects when websocket is not connected", async () => {
    await rejects(client.send({ event: "ping" }), /not connected/u);
  });

  test("ping rejects when aborted while in-flight", async () => {
    await client.connect();
    const controller = new AbortController();
    const pingPromise = client.ping({ signal: controller.signal });
    controller.abort();
    await rejects(pingPromise, WSAbort);
  });

  test("ping rejects immediately when signal is already aborted", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    let sent = false;
    socket.on("message", () => {
      sent = true;
    });

    const controller = new AbortController();
    controller.abort();
    await rejects(client.ping({ signal: controller.signal }), WSAbort);
    deepStrictEqual(sent, false);
  });

  test("ping rejects on close", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const pingPromise = client.ping();
    socket.terminate();
    await rejects(pingPromise, /closed|connection error/u);
  });

  test("constants are exported", () => {
    deepStrictEqual(WebSocketURL, "wss://api.bitfinex.com/ws/1");
  });

  /* ----------------------- Channel frame parsing ----------------------- */

  /**
   * Connect, then install a server-side handler that auto-replies to the next
   * `subscribe` frame from the client with a synthetic `subscribed` event
   * (using `chanId` and any extra fields). Returns the server-side socket so
   * the test can push synthetic data frames.
   */
  async function autoSubscribe(
    chanId: number,
    extra: Partial<ISubscribedMessage> = {},
  ): Promise<WSConn> {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    socket.on("message", (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as {
        event?: string;
        channel?: string;
        pair?: string;
        prec?: string;
        freq?: string;
        len?: string;
      };
      if (msg.event !== "subscribe") {
        return;
      }
      const reply: ISubscribedMessage = {
        event: "subscribed",
        channel: msg.channel as ISubscribedMessage["channel"],
        chanId,
        ...(typeof msg.pair === "string" ? { pair: msg.pair } : {}),
        ...(typeof msg.prec === "string"
          ? { prec: msg.prec as NonNullable<ISubscribedMessage["prec"]> }
          : {}),
        ...(typeof msg.freq === "string"
          ? { freq: msg.freq as NonNullable<ISubscribedMessage["freq"]> }
          : {}),
        ...(typeof msg.len === "string" ? { len: msg.len } : {}),
        ...extra,
      };
      socket.send(JSON.stringify(reply));
    });
    return socket;
  }

  function nextChannelMessage(chanId: number): Promise<IMessage> {
    return new Promise((resolve) => {
      const handler = (msg: IMessage): void => {
        if ("channel_id" in msg && msg.channel_id === chanId) {
          client.off("message", handler);
          resolve(msg);
        }
      };
      client.on("message", handler);
    });
  }

  test("parses ticker frames into objects", async () => {
    const socket = await autoSubscribe(11);
    const subPromise = client.subscribeTicker({ pair: "BTCUSD" });
    await subPromise;

    const messagePromise = nextChannelMessage(11);
    socket.send(
      JSON.stringify([
        11,
        76892,
        5.80585799,
        76926,
        7.03177505,
        810,
        0.01064893,
        76874,
        1438.81140233,
        76984,
        74027,
        null,
      ]),
    );

    const expected: ITickerMessage = {
      channel_id: 11,
      type: "ticker",
      bid: 76892,
      bid_size: 5.80585799,
      ask: 76926,
      ask_size: 7.03177505,
      daily_change: 810,
      daily_change_perc: 0.01064893,
      last_price: 76874,
      volume: 1438.81140233,
      high: 76984,
      low: 74027,
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses heartbeat frames into objects", async () => {
    const socket = await autoSubscribe(12);
    await client.subscribeTicker({ pair: "BTCUSD" });

    const messagePromise = nextChannelMessage(12);
    socket.send(JSON.stringify([12, "hb"]));

    const expected: IHeartbeatMessage = { channel_id: 12, type: "heartbeat" };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses trades_snapshot frames into typed trade objects", async () => {
    const socket = await autoSubscribe(13);
    await client.subscribeTrades({ pair: "BTCUSD" });

    const messagePromise = nextChannelMessage(13);
    socket.send(
      JSON.stringify([
        13,
        [
          ["1922784960-tBTCUSD", 1779568715, 76723, -0.000347],
          ["1922784959-tBTCUSD", 1779568714, 76723, 0.00088162],
        ],
      ]),
    );

    const expected: ITradesSnapshotMessage = {
      channel_id: 13,
      type: "trades_snapshot",
      trades: [
        {
          id: "1922784960-tBTCUSD",
          timestamp: 1779568715,
          price: 76723,
          amount: -0.000347,
        },
        {
          id: "1922784959-tBTCUSD",
          timestamp: 1779568714,
          price: 76723,
          amount: 0.00088162,
        },
      ],
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses trade_executed (te) frames with nested payload", async () => {
    const socket = await autoSubscribe(14);
    await client.subscribeTrades({ pair: "BTCUSD" });

    const messagePromise = nextChannelMessage(14);
    socket.send(
      JSON.stringify([
        14,
        "te",
        ["1922784999-tBTCUSD", 1779568799, 76800, 0.5],
      ]),
    );

    const expected: ITradeExecutedMessage = {
      channel_id: 14,
      type: "trade_executed",
      seq: "1922784999-tBTCUSD",
      timestamp: 1779568799,
      price: 76800,
      amount: 0.5,
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses trade_executed (te) frames with flat payload", async () => {
    const socket = await autoSubscribe(15);
    await client.subscribeTrades({ pair: "BTCUSD" });

    const messagePromise = nextChannelMessage(15);
    socket.send(JSON.stringify([15, "te", "seq-1", 1779568800, 76801, -0.1]));

    const expected: ITradeExecutedMessage = {
      channel_id: 15,
      type: "trade_executed",
      seq: "seq-1",
      timestamp: 1779568800,
      price: 76801,
      amount: -0.1,
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses trade_updated (tu) frames", async () => {
    const socket = await autoSubscribe(16);
    await client.subscribeTrades({ pair: "BTCUSD" });

    const messagePromise = nextChannelMessage(16);
    socket.send(
      JSON.stringify([
        16,
        "tu",
        ["seq-2", "trade-id-9", 1779568801, 76802, 0.3],
      ]),
    );

    const expected: ITradeUpdatedMessage = {
      channel_id: 16,
      type: "trade_updated",
      seq: "seq-2",
      id: "trade-id-9",
      timestamp: 1779568801,
      price: 76802,
      amount: 0.3,
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses aggregated book snapshot frames", async () => {
    const socket = await autoSubscribe(17, { prec: "P0", freq: "F0" });
    await client.subscribeBook({ pair: "BTCUSD" });

    const messagePromise = nextChannelMessage(17);
    socket.send(
      JSON.stringify([
        17,
        [
          [76644, 1, 0.22],
          [76636, 2, 0.5],
        ],
      ]),
    );

    const expected: IBookSnapshotMessage = {
      channel_id: 17,
      type: "book_snapshot",
      book: [
        { price: 76644, count: 1, amount: 0.22 },
        { price: 76636, count: 2, amount: 0.5 },
      ],
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses aggregated book update frames", async () => {
    const socket = await autoSubscribe(18, { prec: "P0", freq: "F0" });
    await client.subscribeBook({ pair: "BTCUSD" });

    const messagePromise = nextChannelMessage(18);
    socket.send(JSON.stringify([18, 76700, 0, 1]));

    const expected: IBookUpdateMessage = {
      channel_id: 18,
      type: "book_update",
      price: 76700,
      count: 0,
      amount: 1,
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses raw book snapshot frames (prec=R0)", async () => {
    const socket = await autoSubscribe(19, { prec: "R0" });
    await client.subscribeRawBook({ pair: "BTCUSD" });

    const messagePromise = nextChannelMessage(19);
    socket.send(
      JSON.stringify([
        19,
        [
          [237452124987, 76681, 0.34],
          [237452539068, 76680, 0.13],
        ],
      ]),
    );

    const expected: IRawBookSnapshotMessage = {
      channel_id: 19,
      type: "raw_book_snapshot",
      book: [
        { order_id: 237452124987, price: 76681, amount: 0.34 },
        { order_id: 237452539068, price: 76680, amount: 0.13 },
      ],
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses raw book update frames (prec=R0)", async () => {
    const socket = await autoSubscribe(20, { prec: "R0" });
    await client.subscribeRawBook({ pair: "BTCUSD" });

    const messagePromise = nextChannelMessage(20);
    socket.send(JSON.stringify([20, 237452539068, 0, 1]));

    const expected: IRawBookUpdateMessage = {
      channel_id: 20,
      type: "raw_book_update",
      order_id: 237452539068,
      price: 0,
      amount: 1,
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses wallet_snapshot (ws) auth frames", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    const messagePromise = new Promise<IMessage>((resolve) => {
      const handler = (msg: IMessage): void => {
        if ("type" in msg && msg.type === "wallet_snapshot") {
          client.off("message", handler);
          resolve(msg);
        }
      };
      client.on("message", handler);
    });

    socket.send(
      JSON.stringify([
        0,
        "ws",
        [
          ["exchange", "BTC", 1.5, 0, 1.5],
          ["trading", "USD", 1000, 0, 999.5],
        ],
      ]),
    );

    const expected: IWalletSnapshotMessage = {
      channel_id: 0,
      type: "wallet_snapshot",
      wallets: [
        {
          wallet_type: "exchange",
          currency: "BTC",
          balance: 1.5,
          unsettled_interest: 0,
          balance_available: 1.5,
        },
        {
          wallet_type: "trading",
          currency: "USD",
          balance: 1000,
          unsettled_interest: 0,
          balance_available: 999.5,
        },
      ],
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses wallet_update (wu) auth frames", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    const messagePromise = new Promise<IMessage>((resolve) => {
      const handler = (msg: IMessage): void => {
        if ("type" in msg && msg.type === "wallet_update") {
          client.off("message", handler);
          resolve(msg);
        }
      };
      client.on("message", handler);
    });

    socket.send(JSON.stringify([0, "wu", ["exchange", "BTC", 1.6, 0, null]]));

    const expected: IWalletUpdateMessage = {
      channel_id: 0,
      type: "wallet_update",
      wallet_type: "exchange",
      currency: "BTC",
      balance: 1.6,
      unsettled_interest: 0,
      balance_available: null,
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("wraps unknown auth frames in a generic envelope", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    const messagePromise = new Promise<IMessage>((resolve) => {
      const handler = (msg: IMessage): void => {
        if ("channel_id" in msg && msg.channel_id === 0 && msg.type === "n") {
          client.off("message", handler);
          resolve(msg);
        }
      };
      client.on("message", handler);
    });

    socket.send(JSON.stringify([0, "n", [1, "info", "hello", null]]));

    const message = await messagePromise;
    deepStrictEqual(message, {
      channel_id: 0,
      type: "n",
      payload: [1, "info", "hello", null],
    });
  });

  test("heartbeat on chanId 0 is parsed", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    const messagePromise = new Promise<IMessage>((resolve) => {
      const handler = (msg: IMessage): void => {
        if ("type" in msg && msg.type === "heartbeat") {
          client.off("message", handler);
          resolve(msg);
        }
      };
      client.on("message", handler);
    });

    socket.send(JSON.stringify([0, "hb"]));

    const expected: IHeartbeatMessage = { channel_id: 0, type: "heartbeat" };
    deepStrictEqual(await messagePromise, expected);
  });

  test("drops channel frames for an unknown chanId", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    let received = false;
    client.on("message", (msg) => {
      if ("channel_id" in msg) {
        received = true;
      }
    });

    socket.send(JSON.stringify([999, 1, 2, 3, 4]));
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    deepStrictEqual(received, false);
  });

  test("subscriptions map tracks chanIds", async () => {
    await autoSubscribe(21);
    await client.subscribeTicker({ pair: "BTCUSD" });
    const snap = client.subscriptions;
    deepStrictEqual(snap.size, 1);
    deepStrictEqual(snap.get(21)?.channel, "ticker");
    deepStrictEqual(snap.get(21)?.pair, "BTCUSD");
  });

  /* ----------------------- Async iterators ----------------------------- */

  /**
   * Wait for the next subscribe message from the client to arrive at the
   * server-side `socket`. The autoSubscribe helper already replies, but the
   * server-side message event fires *before* the auto-reply is sent — so
   * waiting for it gives us a synchronization point that the generator has
   * finished its subscribe handshake.
   */
  function waitForSubscribe(socket: WSConn): Promise<void> {
    return new Promise((resolve) => {
      const handler = (data: Buffer): void => {
        const msg = JSON.parse(data.toString()) as { event?: string };
        if (msg.event === "subscribe") {
          socket.off("message", handler);
          // Wait a tick so the server's auto-reply has been processed by
          // the client and the generator's #send listeners are attached.
          setTimeout(resolve, 20);
        }
      };
      socket.on("message", handler);
    });
  }

  test("tickers() yields parsed ticker messages", async () => {
    const socket = await autoSubscribe(30);
    const subscribed = waitForSubscribe(socket);
    const iter = client.tickers({ pair: "BTCUSD" });
    const first = iter.next();
    await subscribed;

    socket.send(JSON.stringify([30, 1, 2, 3, 4, 5, 0.06, 6, 100, 7, 0, null]));
    const firstResult = await first;
    deepStrictEqual(firstResult.value, {
      channel_id: 30,
      type: "ticker",
      bid: 1,
      bid_size: 2,
      ask: 3,
      ask_size: 4,
      daily_change: 5,
      daily_change_perc: 0.06,
      last_price: 6,
      volume: 100,
      high: 7,
      low: 0,
    });

    const second = iter.next();
    socket.send(
      JSON.stringify([30, 10, 20, 30, 40, 50, 0.6, 60, 1000, 70, 0, null]),
    );
    const secondResult = (await second).value as ITickerMessage;
    deepStrictEqual(secondResult.bid, 10);
    deepStrictEqual(secondResult.last_price, 60);

    await iter.return();
  });

  test("books() yields snapshot then updates", async () => {
    const socket = await autoSubscribe(31, { prec: "P0", freq: "F0" });
    const subscribed = waitForSubscribe(socket);
    const iter = client.books({ pair: "BTCUSD" });
    const snapP = iter.next();
    await subscribed;

    socket.send(
      JSON.stringify([
        31,
        [
          [100, 1, 0.5],
          [99, 2, 0.8],
        ],
      ]),
    );
    const snap = (await snapP).value as IBookSnapshotMessage;
    deepStrictEqual(snap.type, "book_snapshot");
    deepStrictEqual(snap.book.length, 2);

    const updateP = iter.next();
    socket.send(JSON.stringify([31, 101, 1, -0.1]));
    const update = (await updateP).value as IBookUpdateMessage;
    deepStrictEqual(update.type, "book_update");
    deepStrictEqual(update.price, 101);
    deepStrictEqual(update.amount, -0.1);

    await iter.return();
  });

  test("trades() yields snapshot then live trades", async () => {
    const socket = await autoSubscribe(32);
    const subscribed = waitForSubscribe(socket);
    const iter = client.trades({ pair: "BTCUSD" });
    const snapP = iter.next();
    await subscribed;

    socket.send(JSON.stringify([32, [["id-1", 1000, 76000, 0.5]]]));
    const snap = (await snapP).value as ITradesSnapshotMessage;
    deepStrictEqual(snap.type, "trades_snapshot");

    const liveP = iter.next();
    socket.send(JSON.stringify([32, "te", ["seq-1", 1001, 76001, 0.1]]));
    const live = (await liveP).value as ITradeExecutedMessage;
    deepStrictEqual(live.type, "trade_executed");
    deepStrictEqual(live.seq, "seq-1");
    deepStrictEqual(live.price, 76001);

    await iter.return();
  });

  test("rawBooks() yields raw snapshot and updates", async () => {
    const socket = await autoSubscribe(33, { prec: "R0" });
    const subscribed = waitForSubscribe(socket);
    const iter = client.rawBooks({ pair: "BTCUSD" });
    const snapP = iter.next();
    await subscribed;

    socket.send(
      JSON.stringify([
        33,
        [
          [1001, 76000, 0.1],
          [1002, 75999, 0.2],
        ],
      ]),
    );
    const snap = (await snapP).value as IRawBookSnapshotMessage;
    deepStrictEqual(snap.type, "raw_book_snapshot");

    const updateP = iter.next();
    socket.send(JSON.stringify([33, 1001, 0, 1]));
    const update = (await updateP).value as IRawBookUpdateMessage;
    deepStrictEqual(update.type, "raw_book_update");
    deepStrictEqual(update.order_id, 1001);

    await iter.return();
  });

  test("wallets() yields ws/wu auth frames", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const iter = client.wallets();
    const snapP = iter.next();
    // Wait a tick so wallets() has attached its #send listeners.
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });

    socket.send(JSON.stringify([0, "ws", [["exchange", "BTC", 1.5, 0, 1.5]]]));
    const snap = (await snapP).value as IWalletSnapshotMessage;
    deepStrictEqual(snap.type, "wallet_snapshot");
    deepStrictEqual(snap.wallets[0]?.balance, 1.5);

    const updateP = iter.next();
    socket.send(JSON.stringify([0, "wu", ["exchange", "BTC", 1.6, 0, null]]));
    const update = (await updateP).value as IWalletUpdateMessage;
    deepStrictEqual(update.type, "wallet_update");
    deepStrictEqual(update.balance, 1.6);
    deepStrictEqual(update.balance_available, null);

    await iter.return();
  });

  test("tickers() filters by chanId — other channels do not leak in", async () => {
    const socket = await autoSubscribe(34);
    const subscribed = waitForSubscribe(socket);
    const iter = client.tickers({ pair: "BTCUSD" });
    const nextP = iter.next();
    await subscribed;

    // Frame on an *unrelated* chanId — would be dropped by the parser anyway
    // (not in registry); the generator must keep waiting.
    socket.send(JSON.stringify([999, 1, 2, 3, 4, 5, 0.06, 6, 100, 7, 0]));
    socket.send(
      JSON.stringify([34, 11, 12, 13, 14, 15, 0.16, 16, 110, 17, 1, null]),
    );

    const next = (await nextP).value as ITickerMessage;
    deepStrictEqual(next.channel_id, 34);
    deepStrictEqual(next.bid, 11);

    await iter.return();
  });
});
