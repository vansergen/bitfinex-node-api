/**
 * Live smoke-test for the Bitfinex v2 WebSocket public channels.
 *
 * Usage:
 *   npx tsx examples/check-ws-v2.ts
 *
 * Optional env vars:
 *   BFX_V2_SYMBOL     Trading symbol (default: tBTCUSD)
 *   BFX_V2_FUNDING    Funding currency symbol (default: fUSD)
 *   BFX_V2_CANDLE_KEY Candles key (default: trade:1m:tBTCUSD)
 *   BFX_V2_DERIV_KEY  Derivatives status key (default: deriv:tBTCF0:USTF0)
 *   BFX_TIMEOUT_MS    Per-channel wait timeout in ms (default: 30000)
 *   BFX_VERBOSE       Set to "1" to dump every WS frame (default: off)
 */
import {
  ConfFlags,
  type IChannelMessageV2,
  type IInfoMessageV2,
  type IMessageV2,
  type ISubscribedMessageV2,
  WebSocketClientV2,
  WSAbort,
} from "../index.js";

const symbol = process.env.BFX_V2_SYMBOL ?? "tBTCUSD";
const funding = process.env.BFX_V2_FUNDING ?? "fUSD";
const candleKey = process.env.BFX_V2_CANDLE_KEY ?? "trade:1m:tBTCUSD";
const derivKey = process.env.BFX_V2_DERIV_KEY ?? "deriv:tBTCF0:USTF0";
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

function note(message: string): void {
  console.log(`  · ${message}`);
}

function isNum(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function preview(value: unknown): string {
  return JSON.stringify(value).slice(0, 140);
}

type IPredicate = (message: IChannelMessageV2) => boolean;

/**
 * Capture every channel message coming through `ws`, buffered from this
 * point on. `next(chanId, ms, predicate?)` resolves the next matching
 * non-heartbeat frame for that chanId — draining the buffer first to sidestep
 * the race between `await subscribe*` resolving and the snapshot arriving.
 */
function startCapture(ws: WebSocketClientV2): {
  next(
    chanId: number,
    ms: number,
    predicate?: IPredicate,
  ): Promise<IChannelMessageV2>;
  stop(): void;
} {
  const buffer: IChannelMessageV2[] = [];
  let pending: {
    chanId: number;
    predicate: IPredicate;
    resolve(msg: IChannelMessageV2): void;
    timer: NodeJS.Timeout;
  } | null = null;

  const onMessage = (message: IMessageV2): void => {
    if (!("channel_id" in message) || message.type === "heartbeat") {
      return;
    }
    if (
      pending &&
      pending.chanId === message.channel_id &&
      pending.predicate(message)
    ) {
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
    next: (chanId, ms, predicate = (): boolean => true) =>
      new Promise<IChannelMessageV2>((resolve, reject) => {
        const idx = buffer.findIndex(
          (m) => m.channel_id === chanId && predicate(m),
        );
        if (idx >= 0) {
          const [msg] = buffer.splice(idx, 1) as [IChannelMessageV2];
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
        pending = { chanId, predicate, resolve, timer };
      }),
    stop: () => {
      ws.off("message", onMessage);
    },
  };
}

async function checkUnsubscribe(
  ws: WebSocketClientV2,
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

async function checkPing(ws: WebSocketClientV2): Promise<void> {
  console.log("\n[ping]");
  try {
    const pong = await ws.ping();
    record(
      "ping → pong (cid matched, ts present)",
      pong.event === "pong" && typeof pong.cid === "number" && isNum(pong.ts),
      `ts=${pong.ts}, cid=${pong.cid ?? "?"}`,
    );
  } catch (error) {
    record("ping → pong", false, (error as Error).message);
  }
}

async function checkPreAbortedSignal(ws: WebSocketClientV2): Promise<void> {
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

async function checkTicker(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[ticker ${symbol}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeTicker({ symbol });
    record(
      "subscribe",
      sub.event === "subscribed" &&
        sub.channel === "ticker" &&
        sub.symbol === symbol,
      `chanId=${sub.chanId}, symbol=${sub.symbol ?? "?"}, pair=${sub.pair ?? "?"}`,
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
        msg.symbol === symbol &&
        isNum(msg.bid) &&
        isNum(msg.bid_size) &&
        isNum(msg.ask) &&
        isNum(msg.ask_size) &&
        isNum(msg.daily_change) &&
        isNum(msg.daily_change_relative) &&
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
      record("first ticker", false, `unexpected type: ${msg.type}`);
    }
  } catch (error) {
    record("first ticker", false, (error as Error).message);
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkFundingTicker(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[funding ticker ${funding}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeTicker({ symbol: funding });
    record(
      "subscribe",
      sub.event === "subscribed" &&
        sub.channel === "ticker" &&
        sub.symbol === funding,
      `chanId=${sub.chanId}, symbol=${sub.symbol ?? "?"}, currency=${sub.currency ?? "?"}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "funding_ticker") {
      const ok =
        msg.symbol === funding &&
        isNum(msg.frr) &&
        isNum(msg.bid) &&
        isNum(msg.bid_period) &&
        isNum(msg.bid_size) &&
        isNum(msg.ask) &&
        isNum(msg.ask_period) &&
        isNum(msg.ask_size) &&
        isNum(msg.daily_change) &&
        isNum(msg.daily_change_relative) &&
        isNum(msg.last_price) &&
        isNum(msg.volume) &&
        isNum(msg.high) &&
        isNum(msg.low) &&
        isNum(msg.frr_amount_available);
      record(
        "first funding_ticker (all interface fields)",
        ok,
        ok
          ? `symbol=${msg.symbol}, frr=${msg.frr}, bid=${msg.bid}, ask=${msg.ask}`
          : `got: ${preview(msg)}`,
      );
    } else {
      record("first funding_ticker", false, `unexpected type: ${msg.type}`);
    }
  } catch (error) {
    record("first funding_ticker", false, (error as Error).message);
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkTrades(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[trades ${symbol}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeTrades({ symbol });
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
            isNum(t.id) && isNum(t.mts) && isNum(t.price) && isNum(t.amount),
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
        isNum(msg.id) && isNum(msg.price) && isNum(msg.amount),
        `${msg.type}: id=${msg.id}, price=${msg.price}, amount=${msg.amount}`,
      );
    } else {
      record("first trades frame", false, `unexpected: ${preview(msg)}`);
    }
  } catch (error) {
    record("first trades frame", false, (error as Error).message);
  }

  if (sawSnapshot) {
    try {
      const live = await capture.next(
        sub.chanId,
        Math.min(timeout, 10_000),
        (m) => m.type === "trade_executed" || m.type === "trade_updated",
      );
      const ok =
        (live.type === "trade_executed" || live.type === "trade_updated") &&
        isNum(live.id) &&
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

async function checkFundingTrades(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[funding trades ${funding}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeTrades({ symbol: funding });
    record(
      "subscribe",
      sub.event === "subscribed" && sub.channel === "trades",
      `chanId=${sub.chanId}, currency=${sub.currency ?? "?"}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "funding_trades_snapshot") {
      const ok =
        msg.trades.length > 0 &&
        msg.trades.every(
          (t) =>
            isNum(t.id) &&
            isNum(t.mts) &&
            isNum(t.amount) &&
            isNum(t.rate) &&
            isNum(t.period),
        );
      record(
        "funding_trades_snapshot",
        ok,
        ok
          ? `${msg.trades.length} trades, rate=${msg.trades[0]!.rate}`
          : `bad rows: ${preview(msg)}`,
      );
    } else if (
      msg.type === "funding_trade_executed" ||
      msg.type === "funding_trade_updated"
    ) {
      record(
        "first frame is a funding trade update",
        isNum(msg.amount) && isNum(msg.rate) && isNum(msg.period),
        `${msg.type}: rate=${msg.rate}, amount=${msg.amount}`,
      );
    } else {
      record(
        "first funding trades frame",
        false,
        `unexpected: ${preview(msg)}`,
      );
    }
  } catch (error) {
    record("first funding trades frame", false, (error as Error).message);
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkBook(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[book ${symbol}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeBook({ symbol, prec: "P0", freq: "F0", len: 25 });
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
        msg.symbol === symbol &&
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
      const update = await capture.next(
        sub.chanId,
        Math.min(timeout, 10_000),
        (m) => m.type === "book_update",
      );
      const ok =
        update.type === "book_update" &&
        isNum(update.price) &&
        isNum(update.count) &&
        isNum(update.amount);
      record(
        "follow-up book_update",
        ok,
        ok
          ? `price=${(update as { price: number }).price}`
          : `unexpected: ${preview(update)}`,
      );
    } catch (error) {
      record("follow-up book_update", false, (error as Error).message);
    }
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkRawBook(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[raw book ${symbol}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeRawBook({ symbol, len: 25 });
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

  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "raw_book_snapshot") {
      const ok =
        msg.book.length > 0 &&
        msg.book.every(
          (l) => isNum(l.order_id) && isNum(l.price) && isNum(l.amount),
        );
      record(
        "raw_book_snapshot",
        ok,
        ok ? `${msg.book.length} orders` : "bad rows",
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

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkFundingBook(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[funding book ${funding}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeBook({ symbol: funding, prec: "P0", freq: "F0" });
    record(
      "subscribe",
      sub.event === "subscribed" && sub.channel === "book",
      `chanId=${sub.chanId}, currency=${sub.currency ?? "?"}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "funding_book_snapshot") {
      const ok =
        msg.book.length > 0 &&
        msg.book.every(
          (l) =>
            isNum(l.rate) &&
            isNum(l.period) &&
            isNum(l.count) &&
            isNum(l.amount),
        );
      record(
        "funding_book_snapshot",
        ok,
        ok ? `${msg.book.length} rate levels` : `bad: ${preview(msg)}`,
      );
    } else if (msg.type === "funding_book_update") {
      record(
        "first frame is a funding_book_update",
        isNum(msg.rate) &&
          isNum(msg.period) &&
          isNum(msg.count) &&
          isNum(msg.amount),
        `rate=${msg.rate}, period=${msg.period}, amount=${msg.amount}`,
      );
    } else {
      record("first funding book frame", false, `unexpected: ${preview(msg)}`);
    }
  } catch (error) {
    record("first funding book frame", false, (error as Error).message);
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkRawFundingBook(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[raw funding book ${funding}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeRawBook({ symbol: funding });
    record(
      "subscribe",
      sub.event === "subscribed" && sub.channel === "book" && sub.prec === "R0",
      `chanId=${sub.chanId}, currency=${sub.currency ?? "?"}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "raw_funding_book_snapshot") {
      const ok =
        msg.book.length > 0 &&
        msg.book.every(
          (l) =>
            isNum(l.offer_id) &&
            isNum(l.period) &&
            isNum(l.rate) &&
            isNum(l.amount),
        );
      record(
        "raw_funding_book_snapshot",
        ok,
        ok ? `${msg.book.length} offers` : `bad: ${preview(msg)}`,
      );
    } else if (msg.type === "raw_funding_book_update") {
      record(
        "first frame is a raw_funding_book_update",
        isNum(msg.offer_id) &&
          isNum(msg.period) &&
          isNum(msg.rate) &&
          isNum(msg.amount),
        `offer=${msg.offer_id}, rate=${msg.rate}`,
      );
    } else {
      record(
        "first raw funding book frame",
        false,
        `unexpected: ${preview(msg)}`,
      );
    }
  } catch (error) {
    record("first raw funding book frame", false, (error as Error).message);
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkCandles(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[candles ${candleKey}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeCandles({ key: candleKey });
    record(
      "subscribe",
      sub.event === "subscribed" &&
        sub.channel === "candles" &&
        sub.key === candleKey,
      `chanId=${sub.chanId}, key=${sub.key ?? "?"}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  const validCandle = (c: {
    mts: number;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
  }): boolean =>
    isNum(c.mts) &&
    isNum(c.open) &&
    isNum(c.close) &&
    isNum(c.high) &&
    isNum(c.low) &&
    isNum(c.volume);

  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "candles_snapshot") {
      const ok = msg.candles.length > 0 && msg.candles.every(validCandle);
      record(
        "candles_snapshot",
        ok,
        ok
          ? `${msg.candles.length} candles, last close=${msg.candles[0]!.close}`
          : `bad: ${preview(msg.candles.slice(0, 2))}`,
      );
    } else if (msg.type === "candle_update") {
      record(
        "first frame is a candle_update",
        validCandle(msg),
        `o=${msg.open}, c=${msg.close}, h=${msg.high}, l=${msg.low}`,
      );
    } else {
      record("first candles frame", false, `unexpected: ${preview(msg)}`);
    }
  } catch (error) {
    record("first candles frame", false, (error as Error).message);
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkDerivStatus(ws: WebSocketClientV2): Promise<void> {
  console.log(`\n[status ${derivKey}]`);
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeStatus({ key: derivKey });
    record(
      "subscribe",
      sub.event === "subscribed" &&
        sub.channel === "status" &&
        sub.key === derivKey,
      `chanId=${sub.chanId}, key=${sub.key ?? "?"}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  try {
    const msg = await capture.next(sub.chanId, timeout);
    if (msg.type === "derivatives_status") {
      const ok =
        isNum(msg.mts) &&
        isNum(msg.deriv_price) &&
        isNum(msg.spot_price) &&
        isNum(msg.mark_price);
      record(
        "derivatives_status",
        ok,
        ok
          ? `deriv=${msg.deriv_price}, spot=${msg.spot_price}, mark=${msg.mark_price}`
          : `got: ${preview(msg)}`,
      );
    } else {
      record("first status frame", false, `unexpected: ${preview(msg)}`);
    }
  } catch (error) {
    record("first status frame", false, (error as Error).message);
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkLiquidations(ws: WebSocketClientV2): Promise<void> {
  console.log("\n[status liq:global]");
  const capture = startCapture(ws);
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeStatus({ key: "liq:global" });
    record(
      "subscribe",
      sub.event === "subscribed" &&
        sub.channel === "status" &&
        sub.key === "liq:global",
      `chanId=${sub.chanId}`,
    );
  } catch (error) {
    record("subscribe", false, (error as Error).message);
    capture.stop();
    return;
  }

  // Liquidations are event-driven and may not arrive in our window; only a
  // shape check when one does, otherwise observational.
  try {
    const msg = await capture.next(sub.chanId, Math.min(timeout, 8_000));
    if (msg.type === "liquidation_feed") {
      const ok = msg.liquidations.every(
        (l) =>
          isNum(l.pos_id) &&
          isNum(l.mts) &&
          typeof l.symbol === "string" &&
          isNum(l.amount) &&
          isNum(l.base_price),
      );
      record(
        "liquidation_feed shape",
        ok,
        ok
          ? `${msg.liquidations.length} liquidation(s)`
          : `bad: ${preview(msg)}`,
      );
    } else {
      record("liquidation frame", false, `unexpected: ${preview(msg)}`);
    }
  } catch {
    note("no liquidation in window (event-driven) — skipped");
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
}

async function checkChecksum(ws: WebSocketClientV2): Promise<void> {
  console.log("\n[conf OB_CHECKSUM + book checksum]");
  const capture = startCapture(ws);
  try {
    const conf = await ws.conf({ flags: ConfFlags.OB_CHECKSUM });
    record(
      "conf accepted",
      conf.event === "conf" && conf.status === "OK",
      `status=${conf.status}`,
    );
  } catch (error) {
    record("conf accepted", false, (error as Error).message);
    capture.stop();
    return;
  }

  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeBook({ symbol, prec: "P0", freq: "F0", len: 25 });
  } catch (error) {
    record("subscribe (checksum book)", false, (error as Error).message);
    capture.stop();
    return;
  }

  try {
    const msg = await capture.next(
      sub.chanId,
      Math.min(timeout, 15_000),
      (m) => m.type === "checksum",
    );
    record(
      "checksum frame",
      msg.type === "checksum" && Number.isInteger(msg.checksum),
      msg.type === "checksum" ? `checksum=${msg.checksum}` : preview(msg),
    );
  } catch (error) {
    record("checksum frame", false, (error as Error).message);
  }

  capture.stop();
  await checkUnsubscribe(ws, sub.chanId);
  // Reset flags back to default so later checks behave normally.
  await ws.conf({ flags: 0 }).catch(() => undefined);
}

async function checkConcurrentSubscriptions(
  ws: WebSocketClientV2,
): Promise<void> {
  console.log("\n[concurrent subscriptions]");
  const capture = startCapture(ws);
  let tickerSub: ISubscribedMessageV2 | undefined;
  let bookSub: ISubscribedMessageV2 | undefined;
  try {
    [tickerSub, bookSub] = await Promise.all([
      ws.subscribeTicker({ symbol }),
      ws.subscribeBook({ symbol, prec: "P0", freq: "F0", len: 25 }),
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

async function checkPostUnsubscribeSilence(
  ws: WebSocketClientV2,
): Promise<void> {
  console.log("\n[post-unsubscribe silence]");
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeTicker({ symbol });
  } catch (error) {
    record("subscribe + unsubscribe", false, (error as Error).message);
    return;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
  await ws.unsubscribe({ chanId: sub.chanId }).catch(() => undefined);

  let leakedFrames = 0;
  const handler = (message: IMessageV2): void => {
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

async function checkSubscriptionsRegistry(
  ws: WebSocketClientV2,
): Promise<void> {
  console.log("\n[subscriptions registry]");
  let sub: ISubscribedMessageV2;
  try {
    sub = await ws.subscribeTicker({ symbol });
  } catch (error) {
    record("registry tracks subscribe", false, (error as Error).message);
    return;
  }

  const after = ws.subscriptions.get(sub.chanId);
  record(
    "registry tracks subscribe (by symbol)",
    after?.channel === "ticker" && after.symbol === symbol,
    `chanId=${sub.chanId} → channel=${after?.channel ?? "?"}, symbol=${after?.symbol ?? "?"}`,
  );

  await ws.unsubscribe({ chanId: sub.chanId }).catch(() => undefined);
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  record(
    "registry drops on unsubscribe",
    !ws.subscriptions.has(sub.chanId),
    `chanId=${sub.chanId} removed=${!ws.subscriptions.has(sub.chanId)}`,
  );
}

async function checkReconnect(ws: WebSocketClientV2): Promise<void> {
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

  try {
    const pong = await ws.ping();
    record("ping on reconnected socket", pong.event === "pong");
  } catch (error) {
    record("ping on reconnected socket", false, (error as Error).message);
  }
}

async function main(): Promise<void> {
  const ws = new WebSocketClientV2();

  ws.on("error", (error) => {
    console.error("WS error:", (error as Error).message);
  });

  if (verbose) {
    ws.on("message", (message) => {
      console.log("  ←", preview(message));
    });
  }

  const heartbeats = new Map<number, number>();
  ws.on("message", (message) => {
    if ("channel_id" in message && message.type === "heartbeat") {
      heartbeats.set(
        message.channel_id,
        (heartbeats.get(message.channel_id) ?? 0) + 1,
      );
    }
  });

  const infoPromise = new Promise<IInfoMessageV2>((resolve, reject) => {
    const timer = setTimeout(
      () => {
        reject(new Error("info message timeout"));
      },
      Math.min(timeout, 10_000),
    );
    const handler = (message: IMessageV2): void => {
      if ("event" in message && message.event === "info") {
        clearTimeout(timer);
        ws.off("message", handler);
        resolve(message);
      }
    };
    ws.on("message", handler);
  });

  console.log("Connecting to wss://api-pub.bitfinex.com/ws/2 ...");
  await ws.connect();
  console.log("Connected.");

  try {
    const info = await infoPromise;
    record(
      "info message",
      typeof info.version === "number",
      `version=${String(info.version)}, platform.status=${info.platform?.status ?? "?"}`,
    );
  } catch (error) {
    record("info message", false, (error as Error).message);
  }

  await checkPing(ws);
  await checkPreAbortedSignal(ws);
  await checkTicker(ws);
  await checkFundingTicker(ws);
  await checkTrades(ws);
  await checkFundingTrades(ws);
  await checkBook(ws);
  await checkRawBook(ws);
  await checkFundingBook(ws);
  await checkRawFundingBook(ws);
  await checkCandles(ws);
  await checkDerivStatus(ws);
  await checkLiquidations(ws);
  await checkChecksum(ws);
  await checkConcurrentSubscriptions(ws);
  await checkPostUnsubscribeSilence(ws);
  await checkSubscriptionsRegistry(ws);
  await checkReconnect(ws);

  console.log("\n[heartbeat observer]");
  const totalHb = [...heartbeats.values()].reduce((a, b) => a + b, 0);
  if (totalHb > 0) {
    record(
      "observed at least one heartbeat",
      true,
      `${totalHb} hb across ${heartbeats.size} channel(s)`,
    );
  } else {
    note("no heartbeat seen (channels stayed active) — skipped");
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
