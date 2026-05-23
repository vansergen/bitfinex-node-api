/* eslint-disable @typescript-eslint/no-floating-promises */
import { deepStrictEqual, ok, rejects } from "node:assert";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, test } from "node:test";
import { WebSocketServer, type WebSocket as WSConn } from "ws";
import {
  type IAuthSuccessMessage,
  DefaultSymbol,
  type IPongMessage,
  type ISubscribedMessage,
  type IUnauthMessage,
  type IUnsubscribedMessage,
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

    const authPromise = client.auth({ filter: ["wallet"], dms: 4 });
    const received = (await messagePromise) as Record<string, unknown>;

    deepStrictEqual(received.event, "auth");
    deepStrictEqual(received.apiKey, key);
    deepStrictEqual(received.authNonce, nonce);
    deepStrictEqual(received.authPayload, `AUTH${nonce}`);
    deepStrictEqual(received.filter, ["wallet"]);
    deepStrictEqual(received.dms, 4);

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
    await rejects(pingPromise, /closed/u);
  });

  test("constants are exported", () => {
    deepStrictEqual(WebSocketURL, "wss://api.bitfinex.com/ws/1");
  });
});
