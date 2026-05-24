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
  type IFundingBookSnapshotMessage,
  type IFundingBookUpdateMessage,
  type IFundingTickerMessage,
  type IFundingTradeExecutedMessage,
  type IFundingTradesSnapshotMessage,
  type IFundingTradeUpdatedMessage,
  type IHeartbeatMessage,
  type IMessage,
  type IPongMessage,
  type IRawBookSnapshotMessage,
  type IRawBookUpdateMessage,
  type IRawFundingBookSnapshotMessage,
  type IRawFundingBookUpdateMessage,
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

  test("disconnect is a no-op when readyState is CLOSED", async () => {
    await client.connect();
    await client.disconnect();
    // Calling disconnect on an already-closed socket should resolve immediately
    // without touching the underlying WebSocket.
    await client.disconnect();
  });

  /**
   * Minimal `globalThis.WebSocket` stand-in that is stuck in CONNECTING
   * until the test explicitly drives a terminal event. Used to make
   * CONNECTING-state assertions deterministic (no race with the real
   * localhost handshake).
   */
  class StuckWebSocket extends EventTarget {
    public static get CONNECTING(): 0 {
      return 0;
    }
    public static get OPEN(): 1 {
      return 1;
    }
    public static get CLOSING(): 2 {
      return 2;
    }
    public static get CLOSED(): 3 {
      return 3;
    }
    public readyState = StuckWebSocket.CONNECTING;
    public readonly url: string;
    public constructor(url: string | URL) {
      super();
      this.url = String(url);
    }
    public close(): void {
      (this.readyState as number) = StuckWebSocket.CLOSED;
      this.dispatchEvent(new Event("close"));
    }
  }

  function withStuckWebSocket(): () => void {
    const original = globalThis.WebSocket;
    Object.defineProperty(globalThis, "WebSocket", {
      value: StuckWebSocket,
      writable: true,
      configurable: true,
    });
    return () => {
      Object.defineProperty(globalThis, "WebSocket", {
        value: original,
        writable: true,
        configurable: true,
      });
    };
  }

  test("disconnect rejects when in CONNECTING state", async () => {
    const restore = withStuckWebSocket();
    // Suppress the synthetic "error" emission we use below to settle the
    // pending connect() — without a listener Node treats `error` as
    // an uncaught exception.
    client.on("error", (): null => null);
    try {
      const connectPromise = client.connect();
      await rejects(client.disconnect(), /Could not disconnect. State: 0/u);
      client.ws?.dispatchEvent(new Event("error"));
      await connectPromise.catch((): null => null);
    } finally {
      restore();
    }
  });

  test("connect rejects when called again while CONNECTING", async () => {
    const restore = withStuckWebSocket();
    client.on("error", (): null => null);
    try {
      const first = client.connect();
      await rejects(client.connect(), /Could not connect. State: 0/u);
      client.ws?.dispatchEvent(new Event("error"));
      await first.catch((): null => null);
    } finally {
      restore();
    }
  });

  test("send rejects when websocket is closed", async () => {
    await client.connect();
    await client.disconnect();
    await rejects(client.send({ event: "ping" }), /not open|not connected/u);
  });

  test("send resolves with valid payload when ws is open", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);
    await client.send({ event: "ping" });
    deepStrictEqual(await messagePromise, { event: "ping" });
  });

  test("send rejects when payload is not JSON-serializable", async () => {
    await client.connect();
    // BigInt makes JSON.stringify throw synchronously inside `send()`.
    await rejects(client.send({ n: 1n }), /BigInt|JSON/u);
  });

  test("ping rejects when websocket is not connected", async () => {
    const c = new WebSocketClient({ ws_url });
    await rejects(c.ping(), /not connected/u);
  });

  test("ping rejects with `connection has been closed` on graceful close", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const pingPromise = client.ping();
    // Graceful close from server: fires only `close` (no `error`) on the
    // client side, which exercises the `#send` close-listener path.
    socket.close();
    await rejects(pingPromise, /WebSocket connection has been closed/u);
  });

  test("subscribe rejects when called after disconnect", async () => {
    await client.connect();
    await client.disconnect();
    // The internal #ws reference is still set but its readyState is CLOSED.
    // The #send guard rejects before attempting to write.
    await rejects(
      client.subscribeTicker({ pair: "BTCUSD" }),
      /WebSocket is not open/u,
    );
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

  test("subscribeTicker accepts funding currency symbols", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const subPromise = client.subscribeTicker({ pair: "USD" });
    deepStrictEqual(await messagePromise, {
      event: "subscribe",
      channel: "ticker",
      pair: "USD",
    });

    const reply: ISubscribedMessage = {
      event: "subscribed",
      channel: "ticker",
      chanId: 57000,
      currency: "USD",
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await subPromise, reply);
  });

  test("subscribeTrades accepts funding currency symbols", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const subPromise = client.subscribeTrades({ pair: "USD" });
    deepStrictEqual(await messagePromise, {
      event: "subscribe",
      channel: "trades",
      pair: "USD",
    });

    const reply: ISubscribedMessage = {
      event: "subscribed",
      channel: "trades",
      chanId: 57001,
      currency: "USD",
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await subPromise, reply);
  });

  test("subscribeBook accepts funding currency symbols", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const subPromise = client.subscribeBook({ pair: "USD", len: 25 });
    deepStrictEqual(await messagePromise, {
      event: "subscribe",
      channel: "book",
      pair: "USD",
      prec: "P0",
      freq: "F0",
      len: "25",
    });

    const reply: ISubscribedMessage = {
      event: "subscribed",
      channel: "book",
      chanId: 57002,
      currency: "USD",
      prec: "P0",
      freq: "F0",
      len: "25",
    };
    socket.send(JSON.stringify(reply));
    deepStrictEqual(await subPromise, reply);
  });

  test("subscribeRawBook accepts funding currency symbols", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const messagePromise = waitForMessage(socket);

    const subPromise = client.subscribeRawBook({ pair: "USD" });
    deepStrictEqual(await messagePromise, {
      event: "subscribe",
      channel: "book",
      pair: "USD",
      prec: "R0",
    });

    const reply: ISubscribedMessage = {
      event: "subscribed",
      channel: "book",
      chanId: 57003,
      currency: "USD",
      prec: "R0",
      len: "25",
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

  test('subscribeBook rejects precision "R0"', async () => {
    await rejects(
      client.subscribeBook({
        pair: "BTCUSD",
        prec: "R0" as never,
      }),
      /subscribeRawBook\(\)|rawBooks\(\)/u,
    );
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

  test("parses funding ticker frames into objects", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;
    const subscribePromise = waitForMessage(socket);

    const subPromise = client.subscribeTicker({ pair: "fUSD" });
    deepStrictEqual(await subscribePromise, {
      event: "subscribe",
      channel: "ticker",
      pair: "fUSD",
    });

    socket.send(
      JSON.stringify({
        event: "subscribed",
        channel: "ticker",
        chanId: 57169,
        currency: "USD",
      }),
    );
    deepStrictEqual(await subPromise, {
      event: "subscribed",
      channel: "ticker",
      chanId: 57169,
      currency: "USD",
    });

    const messagePromise = nextChannelMessage(57169);
    socket.send(
      JSON.stringify([
        57169,
        0.00039778356164383563,
        0.00029,
        2,
        21298086.02518276,
        0.0000872321,
        2,
        123300.84010007,
        -0.000015,
        -0.15,
        0.00007587,
        1000,
        0.0004,
        0.00007,
        null,
        null,
        42,
      ]),
    );

    const expected: IFundingTickerMessage = {
      channel_id: 57169,
      type: "funding_ticker",
      currency: "USD",
      frr: 0.00039778356164383563,
      bid: 0.00029,
      bid_period: 2,
      bid_size: 21298086.02518276,
      ask: 0.0000872321,
      ask_period: 2,
      ask_size: 123300.84010007,
      daily_change: -0.000015,
      daily_change_perc: -0.15,
      last_price: 0.00007587,
      volume: 1000,
      high: 0.0004,
      low: 0.00007,
      frr_amount_available: 42,
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

  test("parses funding_trades_snapshot frames into typed funding trade objects", async () => {
    const socket = await autoSubscribe(131, { currency: "USD" });
    await client.subscribeTrades({ pair: "USD" });

    const messagePromise = nextChannelMessage(131);
    socket.send(
      JSON.stringify([
        131,
        [
          [422924836, 1779639600000, 164.83, 0.00006758, 2],
          [422924830, 1779639237000, -50.2868, 0.00013995, 30],
        ],
      ]),
    );

    const expected: IFundingTradesSnapshotMessage = {
      channel_id: 131,
      type: "funding_trades_snapshot",
      currency: "USD",
      trades: [
        {
          id: "422924836",
          timestamp: 1779639600000,
          amount: 164.83,
          rate: 0.00006758,
          period: 2,
        },
        {
          id: "422924830",
          timestamp: 1779639237000,
          amount: -50.2868,
          rate: 0.00013995,
          period: 30,
        },
      ],
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses funding trade update frames", async () => {
    const socket = await autoSubscribe(132, { currency: "USD" });
    await client.subscribeTrades({ pair: "USD" });

    const messagePromise = nextChannelMessage(132);
    socket.send(
      JSON.stringify([132, "fte", 422924900, 1779639700000, 12.34, 0.00015, 2]),
    );

    const expected: IFundingTradeExecutedMessage = {
      channel_id: 132,
      type: "funding_trade_executed",
      currency: "USD",
      id: "422924900",
      timestamp: 1779639700000,
      amount: 12.34,
      rate: 0.00015,
      period: 2,
    };
    deepStrictEqual(await messagePromise, expected);
  });

  test("parses funding trade update frames with nested payload", async () => {
    const socket = await autoSubscribe(133, { currency: "USD" });
    await client.subscribeTrades({ pair: "USD" });

    const messagePromise = nextChannelMessage(133);
    socket.send(
      JSON.stringify([
        133,
        "ftu",
        [422924901, 1779639701000, -56.78, 0.00016, 30],
      ]),
    );

    const expected: IFundingTradeUpdatedMessage = {
      channel_id: 133,
      type: "funding_trade_updated",
      currency: "USD",
      id: "422924901",
      timestamp: 1779639701000,
      amount: -56.78,
      rate: 0.00016,
      period: 30,
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

  test("parses funding book snapshot frames", async () => {
    const socket = await autoSubscribe(171, {
      currency: "USD",
      prec: "P0",
      freq: "F0",
    });
    await client.subscribeBook({ pair: "USD" });

    const messagePromise = nextChannelMessage(171);
    socket.send(
      JSON.stringify([
        171,
        [
          [0.00029, 2, 1, -10000],
          [0.0002808219178082192, 120, 1, -4668170.01255885],
        ],
      ]),
    );

    const expected: IFundingBookSnapshotMessage = {
      channel_id: 171,
      type: "funding_book_snapshot",
      currency: "USD",
      book: [
        { rate: 0.00029, period: 2, count: 1, amount: -10000 },
        {
          rate: 0.0002808219178082192,
          period: 120,
          count: 1,
          amount: -4668170.01255885,
        },
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

  test("parses funding book update frames", async () => {
    const socket = await autoSubscribe(181, {
      currency: "USD",
      prec: "P0",
      freq: "F0",
    });
    await client.subscribeBook({ pair: "USD" });

    const messagePromise = nextChannelMessage(181);
    socket.send(
      JSON.stringify([181, 0.0001411514384907285, 2, 2, 368.8304494]),
    );

    const expected: IFundingBookUpdateMessage = {
      channel_id: 181,
      type: "funding_book_update",
      currency: "USD",
      rate: 0.0001411514384907285,
      period: 2,
      count: 2,
      amount: 368.8304494,
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

  test("parses raw funding book snapshot frames (prec=R0)", async () => {
    const socket = await autoSubscribe(191, { currency: "USD", prec: "R0" });
    await client.subscribeRawBook({ pair: "USD" });

    const messagePromise = nextChannelMessage(191);
    socket.send(
      JSON.stringify([
        191,
        [
          [4952068641, 2, 0.00029, -10000],
          [4955400735, 120, 0.0002808219178082192, -4668170.01255885],
        ],
      ]),
    );

    const expected: IRawFundingBookSnapshotMessage = {
      channel_id: 191,
      type: "raw_funding_book_snapshot",
      currency: "USD",
      book: [
        { offer_id: 4952068641, period: 2, rate: 0.00029, amount: -10000 },
        {
          offer_id: 4955400735,
          period: 120,
          rate: 0.0002808219178082192,
          amount: -4668170.01255885,
        },
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

  test("parses raw funding book update frames (prec=R0)", async () => {
    const socket = await autoSubscribe(201, { currency: "USD", prec: "R0" });
    await client.subscribeRawBook({ pair: "USD" });

    const messagePromise = nextChannelMessage(201);
    socket.send(JSON.stringify([201, 4958077997, 2, 0.0001355, 709.7032]));

    const expected: IRawFundingBookUpdateMessage = {
      channel_id: 201,
      type: "raw_funding_book_update",
      currency: "USD",
      offer_id: 4958077997,
      period: 2,
      rate: 0.0001355,
      amount: 709.7032,
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

  test("drops frames whose subscribed channel is unknown to the parser", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    let received = false;
    const handler = (msg: IMessage): void => {
      if ("channel_id" in msg && msg.channel_id === 9001) {
        received = true;
      }
    };
    client.on("message", handler);

    // Force a synthetic `subscribed` reply with a channel name the parser
    // doesn't know — the registry will accept it because `channel` is
    // typed as `IPublicChannelName` but the wire is untyped.
    socket.send(
      JSON.stringify({
        event: "subscribed",
        channel: "candles",
        chanId: 9001,
        pair: "BTCUSD",
      }),
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });
    // Data frame on that chanId — should be silently dropped.
    socket.send(JSON.stringify([9001, 1, 2, 3]));
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });
    client.off("message", handler);

    deepStrictEqual(received, false);
  });

  test("ws/wu auth frames with non-array payload fall through to envelope", async () => {
    const socketPromise = waitForSocket(server);
    await client.connect();
    const socket = await socketPromise;

    const collected: IMessage[] = [];
    const handler = (msg: IMessage): void => {
      if ("channel_id" in msg && msg.channel_id === 0) {
        collected.push(msg);
      }
    };
    client.on("message", handler);

    // Malformed ws/wu — payload not an array. The parser should not crash,
    // it should emit a generic envelope with the raw payload preserved.
    socket.send(JSON.stringify([0, "ws", null]));
    socket.send(JSON.stringify([0, "wu", "oops"]));

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    client.off("message", handler);

    deepStrictEqual(collected.length, 2);
    deepStrictEqual(collected[0], {
      channel_id: 0,
      type: "ws",
      payload: null,
    });
    deepStrictEqual(collected[1], {
      channel_id: 0,
      type: "wu",
      payload: "oops",
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

  test("tickers() yields parsed funding ticker messages", async () => {
    const socket = await autoSubscribe(301, { currency: "USD" });
    const subscribed = waitForSubscribe(socket);
    const iter = client.tickers({ pair: "USD" });
    const first = iter.next();
    await subscribed;

    socket.send(
      JSON.stringify([
        301,
        0.000397,
        0.00029,
        2,
        100,
        0.00014,
        30,
        200,
        0.00001,
        0.1,
        0.00015,
        1000,
        0.0002,
        0.0001,
        null,
        null,
        300,
      ]),
    );
    const firstResult = await first;
    deepStrictEqual(firstResult.value, {
      channel_id: 301,
      type: "funding_ticker",
      currency: "USD",
      frr: 0.000397,
      bid: 0.00029,
      bid_period: 2,
      bid_size: 100,
      ask: 0.00014,
      ask_period: 30,
      ask_size: 200,
      daily_change: 0.00001,
      daily_change_perc: 0.1,
      last_price: 0.00015,
      volume: 1000,
      high: 0.0002,
      low: 0.0001,
      frr_amount_available: 300,
    });

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

  test('books() rejects precision "R0"', async () => {
    const iter = client.books({ pair: "BTCUSD", prec: "R0" as never });
    await rejects(iter.next(), /subscribeRawBook\(\)|rawBooks\(\)/u);
  });

  test("books() yields funding book snapshot then updates", async () => {
    const socket = await autoSubscribe(311, {
      currency: "USD",
      prec: "P0",
      freq: "F0",
    });
    const subscribed = waitForSubscribe(socket);
    const iter = client.books({ pair: "USD" });
    const snapP = iter.next();
    await subscribed;

    socket.send(JSON.stringify([311, [[0.00029, 2, 1, -10000]]]));
    const snap = (await snapP).value as IFundingBookSnapshotMessage;
    deepStrictEqual(snap.type, "funding_book_snapshot");
    deepStrictEqual(snap.book[0]?.rate, 0.00029);

    const updateP = iter.next();
    socket.send(JSON.stringify([311, 0.00014, 30, 2, 250]));
    const update = (await updateP).value as IFundingBookUpdateMessage;
    deepStrictEqual(update.type, "funding_book_update");
    deepStrictEqual(update.period, 30);
    deepStrictEqual(update.amount, 250);

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

  test("trades() yields funding snapshot then live funding trades", async () => {
    const socket = await autoSubscribe(321, { currency: "USD" });
    const subscribed = waitForSubscribe(socket);
    const iter = client.trades({ pair: "USD" });
    const snapP = iter.next();
    await subscribed;

    socket.send(
      JSON.stringify([
        321,
        [[422924836, 1779639600000, 164.83, 0.00006758, 2]],
      ]),
    );
    const snap = (await snapP).value as IFundingTradesSnapshotMessage;
    deepStrictEqual(snap.type, "funding_trades_snapshot");
    deepStrictEqual(snap.trades[0]?.rate, 0.00006758);

    const liveP = iter.next();
    socket.send(
      JSON.stringify([
        321,
        "fte",
        [422924900, 1779639700000, 12.34, 0.00015, 30],
      ]),
    );
    const live = (await liveP).value as IFundingTradeExecutedMessage;
    deepStrictEqual(live.type, "funding_trade_executed");
    deepStrictEqual(live.period, 30);
    deepStrictEqual(live.amount, 12.34);

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

  test("rawBooks() yields raw funding snapshot and updates", async () => {
    const socket = await autoSubscribe(331, { currency: "USD", prec: "R0" });
    const subscribed = waitForSubscribe(socket);
    const iter = client.rawBooks({ pair: "USD" });
    const snapP = iter.next();
    await subscribed;

    socket.send(JSON.stringify([331, [[4952068641, 2, 0.00029, -10000]]]));
    const snap = (await snapP).value as IRawFundingBookSnapshotMessage;
    deepStrictEqual(snap.type, "raw_funding_book_snapshot");
    deepStrictEqual(snap.book[0]?.offer_id, 4952068641);

    const updateP = iter.next();
    socket.send(JSON.stringify([331, 4958077997, 30, 0.0001355, 709.7032]));
    const update = (await updateP).value as IRawFundingBookUpdateMessage;
    deepStrictEqual(update.type, "raw_funding_book_update");
    deepStrictEqual(update.period, 30);
    deepStrictEqual(update.rate, 0.0001355);

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
