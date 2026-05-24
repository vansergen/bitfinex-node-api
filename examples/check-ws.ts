/**
 * Live smoke-test for the Bitfinex v1 WebSocket public channels.
 *
 * Usage:
 *   npx tsx examples/check-ws.ts
 *
 * Optional env vars:
 *   BFX_PAIR          Trading pair (default: BTCUSD)
 *   BFX_TIMEOUT_MS    Per-channel wait timeout in ms (default: 30000)
 *   BFX_VERBOSE       Set to "1" to dump every WS frame (default: off)
 */
import {
  type IChannelMessage,
  type IInfoMessage,
  type IMessage,
  type ISubscribedMessage,
  WebSocketClient,
  WSAbort,
} from "../index.js";

const pair = process.env.BFX_PAIR ?? "BTCUSD";
const timeout = Number(process.env.BFX_TIMEOUT_MS ?? 30_000);
const verbose = process.env.BFX_VERBOSE === "1";

interface ICheck {
  name: string;
  ok: boolean;
  detail: string;
}

const results: ICheck[] = [];

function record(name: string, ok: boolean, detail = ""): void {
  results.push({ name, ok, detail });
  const tag = ok ? "✓" : "✗";
  console.log(`  ${tag} ${name}${detail ? ` — ${detail}` : ""}`);
}

function isNum(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function preview(value: unknown): string {
  return JSON.stringify(value).slice(0, 120);
}

/**
 * Capture every channel message coming through `ws`, buffered from this
 * point on. `next(chanId, ms)` resolves the next non-heartbeat frame for
 * that chanId — draining the buffer first to sidestep the race between
 * `await subscribe*` resolving and the snapshot arriving.
 */
function startCapture(ws: WebSocketClient): {
  next(chanId: number, ms: number): Promise<IChannelMessage>;
  stop(): void;
} {
  const buffer: IChannelMessage[] = [];
  let pending: {
    chanId: number;
    resolve(msg: IChannelMessage): void;
    timer: NodeJS.Timeout;
  } | null = null;

  const onMessage = (message: IMessage): void => {
    if (!("channel_id" in message) || message.type === "heartbeat") return;
    if (pending && pending.chanId === message.channel_id) {
      clearTimeout(pending.timer);
      const { resolve } = pending;
      pending = null;
      resolve(message);
      return;
    }
    buffer.push(message);
  };

  ws.on("message", onMessage);

  return {
    next: (chanId, ms) =>
      new Promise<IChannelMessage>((resolve, reject) => {
        const idx = buffer.findIndex((m) => m.channel_id === chanId);
        if (idx >= 0) {
          const [msg] = buffer.splice(idx, 1) as [IChannelMessage];
          resolve(msg);
          return;
        }
        const timer = setTimeout(() => {
          if (pending && pending.chanId === chanId) {
            pending = null;
          }
          reject(
            new Error(`Timed out after ${ms}ms waiting on chanId=${chanId}`),
          );
        }, ms);
        pending = { chanId, resolve, timer };
      }),
    stop: () => {
      ws.off("message", onMessage);
    },
  };
}

async function checkUnsubscribe(
  ws: WebSocketClient,
  chanId: number,
): Promise<void> {
  try {
    const reply = await ws.unsubscribe({ chanId });
    record(
      "unsubscribe",
      reply.event === "unsubscribed" &&
        reply.status === "OK" &&
        reply.chanId === chanId,
      `chanId=${chanId}, status=${reply.status}`,
    );
  } catch (error) {
    record("unsubscribe", false, (error as Error).message);
  }
}

async function checkPing(ws: WebSocketClient): Promise<void> {
  console.log("\n[ping]");
  try {
    const pong = await ws.ping();
    record("ping → pong", pong.event === "pong");
  } catch (error) {
    record("ping → pong", false, (error as Error).message);
  }
}

async function checkTicker(ws: WebSocketClient): Promise<void> {
  console.log(`\n[ticker ${pair}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessage;
  try {
    sub = await ws.subscribeTicker({ pair });
    record(
      "subscribe",
      sub.event === "subscribed" && sub.channel === "ticker",
      `chanId=${sub.chanId}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "ticker") {
      const ok =
        isNum(msg.bid) &&
        isNum(msg.bid_size) &&
        isNum(msg.ask) &&
        isNum(msg.ask_size) &&
        isNum(msg.daily_change) &&
        isNum(msg.daily_change_perc) &&
        isNum(msg.last_price) &&
        isNum(msg.volume) &&
        isNum(msg.high) &&
        isNum(msg.low);
      record(
        "first ticker (all numeric fields)",
        ok,
        ok
          ? `bid=${msg.bid}, ask=${msg.ask}, last=${msg.last_price}, vol=${msg.volume}`
          : `got: ${preview(msg)}`,
      );
    } else {
      record(
        "first ticker (all numeric fields)",
        false,
        `unexpected type: ${msg.type}`,
      );
    }
  } catch (error) {
    record(
      "first ticker (all numeric fields)",
      false,
      (error as Error).message,
    );
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkTrades(ws: WebSocketClient): Promise<void> {
  console.log(`\n[trades ${pair}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessage;
  try {
    sub = await ws.subscribeTrades({ pair });
    record(
      "subscribe",
      sub.event === "subscribed" && sub.channel === "trades",
      `chanId=${sub.chanId}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  let sawSnapshot = false;
  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "trades_snapshot") {
      sawSnapshot = true;
      const ok =
        msg.trades.length > 0 &&
        msg.trades.every(
          (t) =>
            typeof t.id === "string" &&
            isNum(t.timestamp) &&
            isNum(t.price) &&
            isNum(t.amount),
        );
      record(
        "trades_snapshot",
        ok,
        ok
          ? `${msg.trades.length} trades, last price=${msg.trades[0]!.price}`
          : `bad rows: ${preview(msg.trades.slice(0, 2))}`,
      );
    } else if (msg.type === "trade_executed" || msg.type === "trade_updated") {
      record(
        "first frame is a live trade",
        true,
        `${msg.type}: seq=${msg.seq}, price=${msg.price}, amount=${msg.amount}`,
      );
    } else {
      record("first trades frame", false, `unexpected: ${preview(msg)}`);
    }
  } catch (error) {
    record("first trades frame", false, (error as Error).message);
  }

  if (sawSnapshot) {
    // After a snapshot, give the server up to 10s to push at least one
    // live `te`/`tu`. BTCUSD is liquid, so this should reliably arrive.
    try {
      const live = await capture.next(sub.chanId, Math.min(timeout, 10_000));
      const ok =
        (live.type === "trade_executed" || live.type === "trade_updated") &&
        isNum(live.price) &&
        isNum(live.amount);
      record(
        "follow-up live trade (te/tu)",
        ok,
        ok
          ? `${live.type}: price=${(live as { price: number }).price}`
          : `unexpected: ${preview(live)}`,
      );
    } catch (error) {
      record("follow-up live trade (te/tu)", false, (error as Error).message);
    }
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkBook(ws: WebSocketClient): Promise<void> {
  console.log(`\n[book ${pair}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessage;
  try {
    sub = await ws.subscribeBook({ pair, prec: "P0", freq: "F0", len: 25 });
    record(
      "subscribe",
      sub.event === "subscribed" &&
        sub.channel === "book" &&
        sub.prec === "P0" &&
        sub.freq === "F0",
      `chanId=${sub.chanId}, len=${sub.len ?? "?"}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  let sawSnapshot = false;
  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "book_snapshot") {
      sawSnapshot = true;
      const ok =
        msg.book.length > 0 &&
        msg.book.every(
          (l) => isNum(l.price) && isNum(l.count) && isNum(l.amount),
        );
      record(
        "book_snapshot",
        ok,
        ok
          ? `${msg.book.length} price levels`
          : `bad: ${preview(msg.book.slice(0, 2))}`,
      );
    } else if (msg.type === "book_update") {
      record(
        "first frame is a book_update",
        isNum(msg.price) && isNum(msg.count) && isNum(msg.amount),
        `price=${msg.price}, count=${msg.count}, amount=${msg.amount}`,
      );
    } else {
      record("first book frame", false, `unexpected: ${preview(msg)}`);
    }
  } catch (error) {
    record("first book frame", false, (error as Error).message);
  }

  if (sawSnapshot) {
    try {
      const update = await capture.next(sub.chanId, Math.min(timeout, 10_000));
      const ok =
        update.type === "book_update" &&
        isNum(update.price) &&
        isNum(update.count) &&
        isNum(update.amount);
      record(
        "follow-up book_update",
        ok,
        ok
          ? `price=${(update as { price: number }).price}, count=${(update as { count: number }).count}`
          : `unexpected: ${preview(update)}`,
      );
    } catch (error) {
      record("follow-up book_update", false, (error as Error).message);
    }
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkRawBook(ws: WebSocketClient): Promise<void> {
  console.log(`\n[raw book ${pair}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessage;
  try {
    sub = await ws.subscribeRawBook({ pair, len: 25 });
    record(
      "subscribe",
      sub.event === "subscribed" && sub.channel === "book" && sub.prec === "R0",
      `chanId=${sub.chanId}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  let sawSnapshot = false;
  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "raw_book_snapshot") {
      sawSnapshot = true;
      const ok =
        msg.book.length > 0 &&
        msg.book.every(
          (l) => isNum(l.order_id) && isNum(l.price) && isNum(l.amount),
        );
      record(
        "raw_book_snapshot",
        ok,
        ok ? `${msg.book.length} orders` : `bad rows`,
      );
    } else if (msg.type === "raw_book_update") {
      record(
        "first frame is a raw_book_update",
        isNum(msg.order_id) && isNum(msg.price) && isNum(msg.amount),
        `order=${msg.order_id}, price=${msg.price}, amount=${msg.amount}`,
      );
    } else {
      record("first raw book frame", false, `unexpected: ${preview(msg)}`);
    }
  } catch (error) {
    record("first raw book frame", false, (error as Error).message);
  }

  if (sawSnapshot) {
    try {
      const update = await capture.next(sub.chanId, Math.min(timeout, 10_000));
      const ok =
        update.type === "raw_book_update" &&
        isNum(update.order_id) &&
        isNum(update.price) &&
        isNum(update.amount);
      record(
        "follow-up raw_book_update",
        ok,
        ok
          ? `order=${(update as { order_id: number }).order_id}`
          : `unexpected: ${preview(update)}`,
      );
    } catch (error) {
      record("follow-up raw_book_update", false, (error as Error).message);
    }
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

/** Subscribe to ticker + book simultaneously and verify both deliver data. */
async function checkConcurrentSubscriptions(
  ws: WebSocketClient,
): Promise<void> {
  console.log("\n[concurrent subscriptions]");
  const capture = startCapture(ws);
  let tickerSub: ISubscribedMessage | undefined;
  let bookSub: ISubscribedMessage | undefined;
  try {
    [tickerSub, bookSub] = await Promise.all([
      ws.subscribeTicker({ pair }),
      ws.subscribeBook({ pair, prec: "P0", freq: "F0", len: 25 }),
    ]);
    record(
      "both subscribe responses received",
      tickerSub.chanId !== bookSub.chanId &&
        tickerSub.channel === "ticker" &&
        bookSub.channel === "book",
      `ticker=${tickerSub.chanId}, book=${bookSub.chanId}`,
    );
  } catch (error) {
    record("concurrent subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  try {
    const [tickerMsg, bookMsg] = await Promise.all([
      capture.next(tickerSub.chanId, timeout),
      capture.next(bookSub.chanId, timeout),
    ]);
    record(
      "both channels deliver data",
      tickerMsg.type === "ticker" &&
        (bookMsg.type === "book_snapshot" || bookMsg.type === "book_update"),
      `ticker.type=${tickerMsg.type}, book.type=${bookMsg.type}`,
    );
  } catch (error) {
    record("both channels deliver data", false, (error as Error).message);
  }

  capture.stop();
  await ws.unsubscribe({ chanId: tickerSub.chanId }).catch(() => undefined);
  await ws.unsubscribe({ chanId: bookSub.chanId }).catch(() => undefined);
}

/** Verify that after unsubscribe, no more frames arrive for that chanId. */
async function checkPostUnsubscribeSilence(ws: WebSocketClient): Promise<void> {
  console.log("\n[post-unsubscribe silence]");
  let sub: ISubscribedMessage;
  try {
    sub = await ws.subscribeTicker({ pair });
  } catch (error) {
    record("subscribe + unsubscribe", false, (error as Error).message);
    return;
  }

  // Wait briefly so the server has a chance to push at least one update.
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
  await ws.unsubscribe({ chanId: sub.chanId }).catch(() => undefined);

  // From now on, count frames for that chanId for 2 seconds.
  let leakedFrames = 0;
  const handler = (message: IMessage): void => {
    if (
      "channel_id" in message &&
      message.channel_id === sub.chanId &&
      message.type !== "heartbeat"
    ) {
      leakedFrames += 1;
    }
  };
  ws.on("message", handler);
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });
  ws.off("message", handler);

  record(
    "no frames after unsubscribe",
    leakedFrames === 0,
    leakedFrames === 0
      ? `silent for 2s on chanId=${sub.chanId}`
      : `${leakedFrames} late frames`,
  );
}

async function checkSubscriptionsRegistry(ws: WebSocketClient): Promise<void> {
  console.log("\n[subscriptions registry]");
  let sub: ISubscribedMessage;
  try {
    sub = await ws.subscribeTicker({ pair });
  } catch (error) {
    record("registry tracks subscribe", false, (error as Error).message);
    return;
  }

  const after = ws.subscriptions.get(sub.chanId);
  record(
    "registry tracks subscribe",
    after?.channel === "ticker" && after.pair === pair,
    `chanId=${sub.chanId} → channel=${after?.channel ?? "?"}, pair=${after?.pair ?? "?"}`,
  );

  await ws.unsubscribe({ chanId: sub.chanId }).catch(() => undefined);
  // The unsubscribed event handler updates the map; wait a tick.
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  record(
    "registry drops on unsubscribe",
    !ws.subscriptions.has(sub.chanId),
    `chanId=${sub.chanId} removed=${!ws.subscriptions.has(sub.chanId)}`,
  );
}

async function checkPreAbortedSignal(ws: WebSocketClient): Promise<void> {
  console.log("\n[abort signal]");
  const controller = new AbortController();
  controller.abort();
  try {
    await ws.ping({ signal: controller.signal });
    record("pre-aborted signal rejects", false, "ping resolved unexpectedly");
  } catch (error) {
    record(
      "pre-aborted signal rejects",
      error instanceof WSAbort,
      (error as Error).message,
    );
  }
}

async function checkReconnect(ws: WebSocketClient): Promise<void> {
  console.log("\n[reconnect]");
  try {
    await ws.disconnect();
    record(
      "disconnect",
      ws.ws?.readyState === 3,
      `readyState=${ws.ws?.readyState ?? "?"}`,
    );
  } catch (error) {
    record("disconnect", false, (error as Error).message);
    return;
  }
  try {
    await ws.connect();
    record(
      "reconnect",
      ws.ws?.readyState === 1,
      `readyState=${ws.ws?.readyState ?? "?"}`,
    );
  } catch (error) {
    record("reconnect", false, (error as Error).message);
    return;
  }
  record(
    "subscriptions cleared on disconnect",
    ws.subscriptions.size === 0,
    `size=${ws.subscriptions.size}`,
  );

  // Sanity ping on the new socket.
  try {
    const pong = await ws.ping();
    record("ping on reconnected socket", pong.event === "pong");
  } catch (error) {
    record("ping on reconnected socket", false, (error as Error).message);
  }
}

async function main(): Promise<void> {
  const ws = new WebSocketClient();

  ws.on("error", (error) => {
    console.error("WS error:", (error as Error).message);
  });

  if (verbose) {
    ws.on("message", (message) => {
      console.log("  ←", preview(message));
    });
  }

  // Passive heartbeat observer across the whole session.
  const heartbeats = new Map<number, number>();
  ws.on("message", (message) => {
    if ("channel_id" in message && message.type === "heartbeat") {
      heartbeats.set(
        message.channel_id,
        (heartbeats.get(message.channel_id) ?? 0) + 1,
      );
    }
  });

  const infoPromise = new Promise<IInfoMessage>((resolve, reject) => {
    const timer = setTimeout(
      () => {
        reject(new Error("info message timeout"));
      },
      Math.min(timeout, 10_000),
    );
    const handler = (message: IMessage): void => {
      if ("event" in message && message.event === "info") {
        clearTimeout(timer);
        ws.off("message", handler);
        resolve(message);
      }
    };
    ws.on("message", handler);
  });

  console.log("Connecting to wss://api.bitfinex.com/ws/1 ...");
  await ws.connect();
  console.log("Connected.");

  try {
    const info = await infoPromise;
    record(
      "info message",
      typeof info.version === "number",
      `version=${String(info.version)}`,
    );
  } catch (error) {
    record("info message", false, (error as Error).message);
  }

  await checkPing(ws);
  await checkPreAbortedSignal(ws);
  await checkTicker(ws);
  await checkTrades(ws);
  await checkBook(ws);
  await checkRawBook(ws);
  await checkConcurrentSubscriptions(ws);
  await checkPostUnsubscribeSilence(ws);
  await checkSubscriptionsRegistry(ws);
  await checkReconnect(ws);

  // Observational only — busy BTCUSD channels often don't go quiet enough
  // for the server to emit a heartbeat in our window. Don't fail on absence.
  console.log("\n[heartbeat observer]");
  const totalHb = [...heartbeats.values()].reduce((a, b) => a + b, 0);
  if (totalHb > 0) {
    record(
      "observed at least one heartbeat",
      true,
      `${totalHb} hb across ${heartbeats.size} channel(s): ${[...heartbeats.entries()].map(([id, n]) => `${id}=${n}`).join(", ")}`,
    );
  } else {
    console.log("  · no heartbeat seen (channels stayed active) — skipped");
  }

  await ws.disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n=== ${results.length - failed.length}/${results.length} checks passed ===`,
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error("Fatal:", (error as Error).message);
  process.exit(1);
});
