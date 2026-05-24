/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { createHmac } from "node:crypto";
import { EventEmitter } from "node:events";
import type { IWalletType } from "./auth.js";
import { DefaultSymbol } from "./public.js";

export const WebSocketURL = "wss://api.bitfinex.com/ws/1";

export class WSAbort extends Error {
  public constructor(msg: string, cause?: Event) {
    super(msg, { cause });
    this.name = "AbortError";
  }
}

export type IAggregatedBookPrecision = "P0" | "P1" | "P2" | "P3";
export type IBookPrecision = IAggregatedBookPrecision | "R0";
export type IBookFrequency = "F0" | "F1";
export type IPublicChannelName = "book" | "ticker" | "trades";

export interface ISignal {
  signal?: AbortSignal | null | undefined;
}

/* -------------------------------------------------------------------------- */
/*  Server events                                                              */
/* -------------------------------------------------------------------------- */

export interface IInfoMessage {
  event: "info";
  version?: number;
  code?: number;
  msg?: string;
  serverId?: string;
  platform?: { status: number };
}

export interface IPongMessage {
  event: "pong";
}

export interface IErrorMessage {
  event: "error";
  msg?: string;
  code: number;
  status?: string;
  chanId?: number;
  pair?: string;
  channel?: string;
}

export interface ISubscribedMessage {
  event: "subscribed";
  channel: IPublicChannelName;
  chanId: number;
  pair?: string;
  currency?: string;
  prec?: IBookPrecision;
  freq?: IBookFrequency;
  len?: string;
}

export interface IUnsubscribedMessage {
  event: "unsubscribed";
  status: "OK";
  chanId: number;
}

export interface IAuthSuccessMessage {
  event: "auth";
  status: "OK";
  chanId: 0;
  userId: number;
}

export interface IAuthFailedMessage {
  event: "auth";
  status: "FAIL";
  chanId: 0;
  code: number;
  msg?: string;
}

export type IAuthMessage = IAuthFailedMessage | IAuthSuccessMessage;

/**
 * Success reply for an `unauth` event.
 *
 * https://docs.bitfinex.com/v1/reference/ws-auth-unauthentication
 */
export interface IUnauthMessage {
  event: "unauth";
  status: "OK";
  chanId: 0;
}

export type IEventMessage =
  | IAuthMessage
  | IErrorMessage
  | IInfoMessage
  | IPongMessage
  | ISubscribedMessage
  | IUnauthMessage
  | IUnsubscribedMessage;

/* -------------------------------------------------------------------------- */
/*  Channel messages (parsed from raw arrays into typed objects)               */
/* -------------------------------------------------------------------------- */

/**
 * Heartbeat keepalive emitted on any channel at most once per second when no
 * data has arrived. Raw frame: `[CHAN_ID, "hb"]`.
 *
 * https://docs.bitfinex.com/v1/docs/ws-general
 */
export interface IHeartbeatMessage {
  channel_id: number;
  type: "heartbeat";
}

/**
 * Ticker update. Both the initial snapshot and subsequent updates have the
 * same shape. Raw frame:
 * `[CHAN_ID, BID, BID_SIZE, ASK, ASK_SIZE, DAILY_CHANGE,
 *  DAILY_CHANGE_PERC, LAST_PRICE, VOLUME, HIGH, LOW, ...]`
 *
 * https://docs.bitfinex.com/v1/reference/ws-public-ticker
 */
export interface ITickerMessage {
  channel_id: number;
  type: "ticker";
  bid: number;
  bid_size: number;
  ask: number;
  ask_size: number;
  daily_change: number;
  daily_change_perc: number;
  last_price: number;
  volume: number;
  high: number;
  low: number;
}

/**
 * Funding ticker update. Bitfinex v1 accepts funding symbols such as `fUSD`
 * on the ticker channel and replies with `currency: "USD"`.
 */
export interface IFundingTickerMessage {
  channel_id: number;
  type: "funding_ticker";
  currency: string;
  frr: number;
  bid: number;
  bid_period: number;
  bid_size: number;
  ask: number;
  ask_period: number;
  ask_size: number;
  daily_change: number;
  daily_change_perc: number;
  last_price: number;
  volume: number;
  high: number;
  low: number;
  frr_amount_available: number;
}

/**
 * A single executed trade row used inside `trades_snapshot`.
 *
 * https://docs.bitfinex.com/v1/reference/ws-public-trades
 */
export interface IWSTrade {
  id: string;
  timestamp: number;
  price: number;
  amount: number;
}

/** A funding trade row used inside `funding_trades_snapshot`. */
export interface IWSFundingTrade {
  id: string;
  timestamp: number;
  amount: number;
  rate: number;
  period: number;
}

/**
 * Initial snapshot for a `trades` subscription.
 * Raw frame: `[CHAN_ID, [[ID, TIMESTAMP, PRICE, AMOUNT], ...]]`.
 */
export interface ITradesSnapshotMessage {
  channel_id: number;
  type: "trades_snapshot";
  trades: IWSTrade[];
}

/**
 * Initial snapshot for a funding `trades` subscription.
 * Raw frame: `[CHAN_ID, [[ID, TIMESTAMP, AMOUNT, RATE, PERIOD], ...]]`.
 */
export interface IFundingTradesSnapshotMessage {
  channel_id: number;
  type: "funding_trades_snapshot";
  currency: string;
  trades: IWSFundingTrade[];
}

/**
 * `te` — a trade has just executed (early notification).
 * Raw frame: `[CHAN_ID, "te", [SEQ, TIMESTAMP, PRICE, AMOUNT]]`.
 */
export interface ITradeExecutedMessage {
  channel_id: number;
  type: "trade_executed";
  seq: string;
  timestamp: number;
  price: number;
  amount: number;
}

/**
 * `tu` — a trade execution has been settled and now carries its final id.
 * Raw frame: `[CHAN_ID, "tu", [SEQ, ID, TIMESTAMP, PRICE, AMOUNT]]`.
 */
export interface ITradeUpdatedMessage {
  channel_id: number;
  type: "trade_updated";
  seq: string;
  id: string;
  timestamp: number;
  price: number;
  amount: number;
}

/** `fte` — a funding trade has just executed. */
export interface IFundingTradeExecutedMessage extends IWSFundingTrade {
  channel_id: number;
  type: "funding_trade_executed";
  currency: string;
}

/** `ftu` — a funding trade execution update. */
export interface IFundingTradeUpdatedMessage extends IWSFundingTrade {
  channel_id: number;
  type: "funding_trade_updated";
  currency: string;
}

/**
 * A single price level inside an aggregated order book.
 * `count > 0` — the level exists (`amount > 0` is a bid, `< 0` is an ask).
 * `count = 0` — remove the level.
 */
export interface IBookLevel {
  price: number;
  count: number;
  amount: number;
}

/**
 * A single rate level inside an aggregated funding book.
 * `amount > 0` means bid, `amount < 0` means ask.
 */
export interface IFundingBookLevel {
  rate: number;
  period: number;
  count: number;
  amount: number;
}

/**
 * Initial snapshot for an aggregated `book` subscription (`prec` ≠ `R0`).
 * Raw frame: `[CHAN_ID, [[PRICE, COUNT, AMOUNT], ...]]`.
 *
 * https://docs.bitfinex.com/v1/reference/ws-public-order-books
 */
export interface IBookSnapshotMessage {
  channel_id: number;
  type: "book_snapshot";
  book: IBookLevel[];
}

/**
 * Initial snapshot for an aggregated funding `book` subscription.
 * Raw frame: `[CHAN_ID, [[RATE, PERIOD, COUNT, AMOUNT], ...]]`.
 */
export interface IFundingBookSnapshotMessage {
  channel_id: number;
  type: "funding_book_snapshot";
  currency: string;
  book: IFundingBookLevel[];
}

/**
 * Live update of a single price level in the aggregated book.
 * Raw frame: `[CHAN_ID, PRICE, COUNT, AMOUNT]`.
 */
export interface IBookUpdateMessage extends IBookLevel {
  channel_id: number;
  type: "book_update";
}

/** Live update of a single rate level in the aggregated funding book. */
export interface IFundingBookUpdateMessage extends IFundingBookLevel {
  channel_id: number;
  type: "funding_book_update";
  currency: string;
}

/**
 * A single order in the raw (`R0`) order book.
 * `price = 0` means "remove the order with `order_id`".
 */
export interface IRawBookLevel {
  order_id: number;
  price: number;
  amount: number;
}

/** A single offer in the raw (`R0`) funding book. */
export interface IRawFundingBookLevel {
  offer_id: number;
  period: number;
  rate: number;
  amount: number;
}

/**
 * Initial snapshot for a raw `book` subscription (`prec = R0`).
 * Raw frame: `[CHAN_ID, [[ORDER_ID, PRICE, AMOUNT], ...]]`.
 *
 * https://docs.bitfinex.com/v1/reference/ws-public-raw-order-books
 */
export interface IRawBookSnapshotMessage {
  channel_id: number;
  type: "raw_book_snapshot";
  book: IRawBookLevel[];
}

/**
 * Initial snapshot for a raw funding `book` subscription (`prec = R0`).
 * Raw frame: `[CHAN_ID, [[OFFER_ID, PERIOD, RATE, AMOUNT], ...]]`.
 */
export interface IRawFundingBookSnapshotMessage {
  channel_id: number;
  type: "raw_funding_book_snapshot";
  currency: string;
  book: IRawFundingBookLevel[];
}

/**
 * Live update of a single order in the raw book.
 * Raw frame: `[CHAN_ID, ORDER_ID, PRICE, AMOUNT]`.
 */
export interface IRawBookUpdateMessage extends IRawBookLevel {
  channel_id: number;
  type: "raw_book_update";
}

/** Live update of a single offer in the raw funding book. */
export interface IRawFundingBookUpdateMessage extends IRawFundingBookLevel {
  channel_id: number;
  type: "raw_funding_book_update";
  currency: string;
}

/* ----------------------------- Authenticated ------------------------------ */

/**
 * A single wallet row.
 *
 * https://docs.bitfinex.com/v1/reference/ws-auth-wallets
 */
export interface IWallet {
  wallet_type: IWalletType;
  currency: string;
  balance: number;
  unsettled_interest: number;
  balance_available: number | null;
}

/** `ws` — wallet snapshot, sent once after authentication. */
export interface IWalletSnapshotMessage {
  channel_id: 0;
  type: "wallet_snapshot";
  wallets: IWallet[];
}

/** `wu` — wallet update. */
export interface IWalletUpdateMessage extends IWallet {
  channel_id: 0;
  type: "wallet_update";
}

/**
 * Bitfinex v1 mnemonic for authenticated channel frames that we deliver as a
 * raw envelope (i.e. not `ws`/`wu`/`hb`, which are decoded into their own
 * typed messages). Using a literal union keeps `IMessage` discriminated so
 * narrowing via `msg.type === "ticker"` actually excludes the envelope.
 */
export type IAuthChannelType =
  | "bu"
  | "fcc"
  | "fcn"
  | "fcs"
  | "fcu"
  | "fiu"
  | "flc"
  | "fln"
  | "fls"
  | "flu"
  | "foc"
  | "fon"
  | "fos"
  | "fou"
  | "fte"
  | "ftu"
  | "miu"
  | "n"
  | "oc"
  | "on"
  | "os"
  | "ou"
  | "pc"
  | "pn"
  | "ps"
  | "pu"
  | "te"
  | "tu";

/**
 * Generic envelope for authenticated channel frames whose payload schema is
 * not decoded by this client. Use the v1 mnemonic carried by `type` to
 * interpret the raw `payload` against the official docs:
 *
 * - Orders: https://docs.bitfinex.com/v1/reference/ws-auth-orders
 * - Positions: https://docs.bitfinex.com/v1/reference/ws-auth-positions
 * - Trades: https://docs.bitfinex.com/v1/reference/ws-auth-trades
 * - Funding offers: https://docs.bitfinex.com/v1/reference/ws-auth-offers
 * - Funding credits: https://docs.bitfinex.com/v1/reference/ws-auth-credits
 * - Funding loans: https://docs.bitfinex.com/v1/reference/ws-auth-loans
 * - Funding trades: https://docs.bitfinex.com/v1/reference/ws-auth-funding-trades
 * - Balance info: https://docs.bitfinex.com/v1/reference/ws-auth-balance-info
 * - Margin info: https://docs.bitfinex.com/v1/reference/ws-auth-margin-info
 * - Funding info: https://docs.bitfinex.com/v1/reference/ws-auth-funding-info
 * - Notifications: https://docs.bitfinex.com/v1/reference/ws-auth-notifications
 */
export interface IAuthChannelEnvelope {
  channel_id: 0;
  type: IAuthChannelType;
  payload: unknown;
}

export type IChannelMessage =
  | IAuthChannelEnvelope
  | IBookSnapshotMessage
  | IBookUpdateMessage
  | IFundingBookSnapshotMessage
  | IFundingBookUpdateMessage
  | IFundingTickerMessage
  | IFundingTradeExecutedMessage
  | IFundingTradesSnapshotMessage
  | IFundingTradeUpdatedMessage
  | IHeartbeatMessage
  | IRawBookSnapshotMessage
  | IRawBookUpdateMessage
  | IRawFundingBookSnapshotMessage
  | IRawFundingBookUpdateMessage
  | ITickerMessage
  | ITradeExecutedMessage
  | ITradeUpdatedMessage
  | ITradesSnapshotMessage
  | IWalletSnapshotMessage
  | IWalletUpdateMessage;

export type IMessage = IChannelMessage | IEventMessage;

/* -------------------------------------------------------------------------- */
/*  Internal subscription registry + parser                                    */
/* -------------------------------------------------------------------------- */

interface ISubscriptionInfo {
  channel: IPublicChannelName;
  currency?: string;
  pair?: string;
  prec?: IBookPrecision;
  freq?: IBookFrequency;
  len?: string;
}

function asWallet(row: unknown[]): IWallet {
  return {
    wallet_type: row[0] as IWalletType,
    currency: row[1] as string,
    balance: row[2] as number,
    unsettled_interest: row[3] as number,
    balance_available: (row[4] as number | null) ?? null,
  };
}

function parseAuthFrame(frame: unknown[]): IChannelMessage {
  const type = frame[1] as string;
  const [, , payload] = frame;

  if (type === "ws" && Array.isArray(payload)) {
    return {
      channel_id: 0,
      type: "wallet_snapshot",
      wallets: (payload as unknown[][]).map(asWallet),
    };
  }

  if (type === "wu" && Array.isArray(payload)) {
    return {
      channel_id: 0,
      type: "wallet_update",
      ...asWallet(payload as unknown[]),
    };
  }

  return { channel_id: 0, type: type as IAuthChannelType, payload };
}

function parseChannelFrame(
  frame: unknown[],
  subscriptions: Map<number, ISubscriptionInfo>,
): IChannelMessage | null {
  const channel_id = frame[0] as number;

  if (frame[1] === "hb") {
    return { channel_id, type: "heartbeat" };
  }

  if (channel_id === 0) {
    return parseAuthFrame(frame);
  }

  const sub = subscriptions.get(channel_id);
  if (!sub) {
    return null;
  }

  switch (sub.channel) {
    case "ticker":
      if (typeof sub.currency !== "undefined") {
        return {
          channel_id,
          type: "funding_ticker",
          currency: sub.currency,
          frr: frame[1] as number,
          bid: frame[2] as number,
          bid_period: frame[3] as number,
          bid_size: frame[4] as number,
          ask: frame[5] as number,
          ask_period: frame[6] as number,
          ask_size: frame[7] as number,
          daily_change: frame[8] as number,
          daily_change_perc: frame[9] as number,
          last_price: frame[10] as number,
          volume: frame[11] as number,
          high: frame[12] as number,
          low: frame[13] as number,
          frr_amount_available: frame[16] as number,
        };
      }
      return {
        channel_id,
        type: "ticker",
        bid: frame[1] as number,
        bid_size: frame[2] as number,
        ask: frame[3] as number,
        ask_size: frame[4] as number,
        daily_change: frame[5] as number,
        daily_change_perc: frame[6] as number,
        last_price: frame[7] as number,
        volume: frame[8] as number,
        high: frame[9] as number,
        low: frame[10] as number,
      };

    case "trades": {
      if (Array.isArray(frame[1])) {
        if (typeof sub.currency !== "undefined") {
          return {
            channel_id,
            type: "funding_trades_snapshot",
            currency: sub.currency,
            trades: (frame[1] as unknown[][]).map((row) => ({
              id: String(row[0]),
              timestamp: row[1] as number,
              amount: row[2] as number,
              rate: row[3] as number,
              period: row[4] as number,
            })),
          };
        }
        return {
          channel_id,
          type: "trades_snapshot",
          trades: (frame[1] as unknown[][]).map((row) => ({
            id: String(row[0]),
            timestamp: row[1] as number,
            price: row[2] as number,
            amount: row[3] as number,
          })),
        };
      }
      if (typeof sub.currency !== "undefined") {
        const tag = frame[1] as "fte" | "ftu";
        const payload = Array.isArray(frame[2])
          ? (frame[2] as unknown[])
          : frame.slice(2);
        return {
          channel_id,
          type:
            tag === "fte" ? "funding_trade_executed" : "funding_trade_updated",
          currency: sub.currency,
          id: String(payload[0]),
          timestamp: payload[1] as number,
          amount: payload[2] as number,
          rate: payload[3] as number,
          period: payload[4] as number,
        };
      }
      const tag = frame[1] as "te" | "tu";
      // Accept both nested `[seq, ...]` and flat `seq, ...` payload layouts.
      const payload = Array.isArray(frame[2])
        ? (frame[2] as unknown[])
        : frame.slice(2);
      if (tag === "te") {
        return {
          channel_id,
          type: "trade_executed",
          seq: String(payload[0]),
          timestamp: payload[1] as number,
          price: payload[2] as number,
          amount: payload[3] as number,
        };
      }
      return {
        channel_id,
        type: "trade_updated",
        seq: String(payload[0]),
        id: String(payload[1]),
        timestamp: payload[2] as number,
        price: payload[3] as number,
        amount: payload[4] as number,
      };
    }

    case "book": {
      if (sub.prec === "R0") {
        if (Array.isArray(frame[1])) {
          if (typeof sub.currency !== "undefined") {
            return {
              channel_id,
              type: "raw_funding_book_snapshot",
              currency: sub.currency,
              book: (frame[1] as unknown[][]).map((row) => ({
                offer_id: row[0] as number,
                period: row[1] as number,
                rate: row[2] as number,
                amount: row[3] as number,
              })),
            };
          }
          return {
            channel_id,
            type: "raw_book_snapshot",
            book: (frame[1] as unknown[][]).map((row) => ({
              order_id: row[0] as number,
              price: row[1] as number,
              amount: row[2] as number,
            })),
          };
        }
        if (typeof sub.currency !== "undefined") {
          return {
            channel_id,
            type: "raw_funding_book_update",
            currency: sub.currency,
            offer_id: frame[1] as number,
            period: frame[2] as number,
            rate: frame[3] as number,
            amount: frame[4] as number,
          };
        }
        return {
          channel_id,
          type: "raw_book_update",
          order_id: frame[1] as number,
          price: frame[2] as number,
          amount: frame[3] as number,
        };
      }
      if (Array.isArray(frame[1])) {
        if (typeof sub.currency !== "undefined") {
          return {
            channel_id,
            type: "funding_book_snapshot",
            currency: sub.currency,
            book: (frame[1] as unknown[][]).map((row) => ({
              rate: row[0] as number,
              period: row[1] as number,
              count: row[2] as number,
              amount: row[3] as number,
            })),
          };
        }
        return {
          channel_id,
          type: "book_snapshot",
          book: (frame[1] as unknown[][]).map((row) => ({
            price: row[0] as number,
            count: row[1] as number,
            amount: row[2] as number,
          })),
        };
      }
      if (typeof sub.currency !== "undefined") {
        return {
          channel_id,
          type: "funding_book_update",
          currency: sub.currency,
          rate: frame[1] as number,
          period: frame[2] as number,
          count: frame[3] as number,
          amount: frame[4] as number,
        };
      }
      return {
        channel_id,
        type: "book_update",
        price: frame[1] as number,
        count: frame[2] as number,
        amount: frame[3] as number,
      };
    }

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  WebSocketClient                                                            */
/* -------------------------------------------------------------------------- */

export interface ISubscribeTickerOptions extends ISignal {
  pair?: string;
}

export interface ISubscribeTradesOptions extends ISignal {
  pair?: string;
}

export interface ISubscribeBookOptions extends ISignal {
  pair?: string;
  prec?: IAggregatedBookPrecision;
  freq?: IBookFrequency;
  len?: number | string;
}

export interface ISubscribeRawBookOptions extends ISignal {
  pair?: string;
  len?: number | string;
}

export interface IUnsubscribeOptions extends ISignal {
  chanId: number;
}

export type IAuthOptions = ISignal;

type IListenerPredicate<T extends IMessage = IMessage> = (
  message: IMessage,
) => message is T;

interface IListenersOptions<T extends IMessage = IMessage> extends ISignal {
  predicate: IListenerPredicate<T>;
}

export interface IWebSocketClientOptions {
  ws_url?: URL | string | undefined;
  symbol?: string | undefined;
  key?: string | undefined;
  secret?: string | undefined;
  nonce?: (() => string) | undefined;
}

export interface WebSocketClient {
  addListener(event: "close" | "open", eventListener: () => void): this;
  addListener(event: "error", eventListener: (error: unknown) => void): this;
  addListener(
    event: "message",
    eventListener: (message: IMessage) => void,
  ): this;

  emit(event: "close" | "open"): boolean;
  emit(event: "error", error: unknown): boolean;
  emit(event: "message", message: IMessage): boolean;

  on(event: "close" | "open", eventListener: () => void): this;
  on(event: "error", eventListener: (error: unknown) => void): this;
  on(event: "message", eventListener: (message: IMessage) => void): this;

  once(event: "close" | "open", eventListener: () => void): this;
  once(event: "error", eventListener: (error: unknown) => void): this;
  once(event: "message", eventListener: (message: IMessage) => void): this;

  prependListener(event: "close" | "open", eventListener: () => void): this;
  prependListener(
    event: "error",
    eventListener: (error: unknown) => void,
  ): this;
  prependListener(
    event: "message",
    eventListener: (message: IMessage) => void,
  ): this;

  prependOnceListener(event: "close" | "open", eventListener: () => void): this;
  prependOnceListener(
    event: "error",
    eventListener: (error: unknown) => void,
  ): this;
  prependOnceListener(
    event: "message",
    eventListener: (message: IMessage) => void,
  ): this;
}

export class WebSocketClient extends EventEmitter {
  readonly #ws_url: URL;
  readonly #symbol: string;
  readonly #auth: { key: string; secret: string } | null;
  readonly #nonce: () => string;
  readonly #subscriptions = new Map<number, ISubscriptionInfo>();
  #ws: WebSocket | null;

  /** Create WebSocketClient. */
  public constructor({
    ws_url = WebSocketURL,
    symbol = DefaultSymbol,
    nonce = (): string => `${Date.now() * 1000}`,
    key,
    secret,
  }: IWebSocketClientOptions = {}) {
    super();
    this.#ws_url = new URL(ws_url);
    this.#symbol = symbol;
    this.#nonce = nonce;
    this.#ws = null;
    if (typeof key === "string" && typeof secret === "string") {
      this.#auth = { key, secret };
    } else {
      this.#auth = null;
    }
  }

  public get symbol(): string {
    return this.#symbol;
  }

  public get ws(): WebSocket | null {
    return this.#ws;
  }

  /** Snapshot of active subscriptions keyed by `chanId`. */
  public get subscriptions(): Map<number, ISubscriptionInfo> {
    return new Map(this.#subscriptions);
  }

  /** Connect to the websocket. */
  public connect(): Promise<void> {
    const NativeWebSocket = globalThis.WebSocket;
    if (typeof NativeWebSocket === "undefined") {
      return Promise.reject(
        new Error(
          "Global `WebSocket` is not available. Node.js >= 22 is required.",
        ),
      );
    }

    const ws = this.#ws;
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (ws?.readyState) {
      case NativeWebSocket.CLOSING:
      case NativeWebSocket.CONNECTING:
        return Promise.reject(
          new Error(`Could not connect. State: ${ws.readyState}`),
        );
      case NativeWebSocket.OPEN:
        return Promise.resolve();
      default:
        break;
    }

    return new Promise<void>((resolve, reject) => {
      const socket = new NativeWebSocket(this.#ws_url.toString());

      const on_open = (): void => {
        resolve();
        this.emit("open");
      };
      const on_close = (): void => {
        this.#subscriptions.clear();
        this.emit("close");
      };
      const on_error = (event: Event): void => {
        const error = new Error("WebSocket connection error", {
          cause: event,
        });
        reject(error);
        this.emit("error", error);
      };
      const on_message = (event: MessageEvent): void => {
        const data = event.data as unknown;
        if (typeof data === "string") {
          this.#handleRawMessage(data);
        }
      };

      socket.addEventListener("open", on_open, { once: true });
      socket.addEventListener("close", on_close, { once: true });
      socket.addEventListener("error", on_error);
      socket.addEventListener("message", on_message);

      this.#ws = socket;
    });
  }

  /** Disconnect from the websocket. */
  public disconnect(): Promise<void> {
    const ws = this.#ws;
    if (!ws) {
      return Promise.resolve();
    }

    const NativeWebSocket = globalThis.WebSocket;
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (ws.readyState) {
      case NativeWebSocket.CLOSED:
        return Promise.resolve();
      case NativeWebSocket.CLOSING:
      case NativeWebSocket.CONNECTING:
        return Promise.reject(
          new Error(`Could not disconnect. State: ${ws.readyState}`),
        );
      default:
        break;
    }

    return new Promise<void>((resolve, reject) => {
      const listeners = {
        close: (): void => {
          ws.removeEventListener("error", listeners.error);
          resolve();
        },
        error: (event: Event): void => {
          ws.removeEventListener("close", listeners.close);
          reject(new Error("WebSocket close error", { cause: event }));
        },
      };

      ws.addEventListener("close", listeners.close, { once: true });
      ws.addEventListener("error", listeners.error, { once: true });
      ws.close();
    });
  }

  /** Send a ping message. */
  public ping({ signal }: ISignal = {}): Promise<IPongMessage> {
    const payload = { event: "ping" };
    const predicate = (message: IMessage): message is IPongMessage =>
      "event" in message && message.event === "pong";

    return this.#send<IPongMessage>(payload, { predicate, signal });
  }

  /** Subscribe to the `ticker` channel. */
  public subscribeTicker({
    pair = this.#symbol,
    signal,
  }: ISubscribeTickerOptions = {}): Promise<ISubscribedMessage> {
    return this.#subscribe({ channel: "ticker", pair }, { signal });
  }

  /** Subscribe to the `trades` channel. */
  public subscribeTrades({
    pair = this.#symbol,
    signal,
  }: ISubscribeTradesOptions = {}): Promise<ISubscribedMessage> {
    return this.#subscribe({ channel: "trades", pair }, { signal });
  }

  /** Subscribe to the aggregated `book` channel. */
  public subscribeBook({
    pair = this.#symbol,
    prec = "P0",
    freq = "F0",
    len,
    signal,
  }: ISubscribeBookOptions = {}): Promise<ISubscribedMessage> {
    if (prec === ("R0" as IAggregatedBookPrecision)) {
      return Promise.reject(
        new Error('Use rawBooks() or subscribeRawBook() for precision "R0"'),
      );
    }
    const payload: Record<string, string> = {
      channel: "book",
      pair,
      prec,
      freq,
    };
    if (typeof len !== "undefined") {
      payload.len = `${len}`;
    }
    return this.#subscribe(payload, { signal });
  }

  /** Subscribe to the raw `book` channel (precision `R0`). */
  public subscribeRawBook({
    pair = this.#symbol,
    len,
    signal,
  }: ISubscribeRawBookOptions = {}): Promise<ISubscribedMessage> {
    const payload: Record<string, string> = {
      channel: "book",
      pair,
      prec: "R0",
    };
    if (typeof len !== "undefined") {
      payload.len = `${len}`;
    }
    return this.#subscribe(payload, { signal });
  }

  /** Unsubscribe from a channel by `chanId`. */
  public unsubscribe({
    chanId,
    signal,
  }: IUnsubscribeOptions): Promise<IUnsubscribedMessage> {
    const payload = { event: "unsubscribe", chanId };
    const predicate = (message: IMessage): message is IUnsubscribedMessage =>
      "event" in message &&
      message.event === "unsubscribed" &&
      message.chanId === chanId;

    return this.#send<IUnsubscribedMessage>(payload, { predicate, signal });
  }

  /**
   * Authenticate the connection. Bitfinex v1 only accepts the five
   * `apiKey`/`authSig`/`authNonce`/`authPayload`/`event` fields — the v2
   * extensions (`filter`, `dms`, `calc`) are not part of the v1 contract.
   *
   * https://docs.bitfinex.com/v1/reference/ws-auth-authentication
   */
  public auth({ signal }: IAuthOptions = {}): Promise<IAuthSuccessMessage> {
    if (!this.#auth) {
      return Promise.reject(new Error("Auth credentials are missing"));
    }

    const authNonce = this.#nonce();
    const authPayload = `AUTH${authNonce}`;
    const authSig = createHmac("sha384", this.#auth.secret)
      .update(authPayload)
      .digest("hex");

    const payload = {
      event: "auth",
      apiKey: this.#auth.key,
      authSig,
      authNonce,
      authPayload,
    };

    const predicate = (message: IMessage): message is IAuthMessage =>
      "event" in message && message.event === "auth";

    return this.#send<IAuthMessage>(payload, { predicate, signal }).then(
      (response) => {
        if (response.status !== "OK") {
          throw new Error(
            response.msg ?? `Authentication failed (code: ${response.code})`,
            { cause: response },
          );
        }
        return response;
      },
    );
  }

  /** Unauthenticate the connection. */
  public unauth({ signal }: ISignal = {}): Promise<IUnauthMessage> {
    const payload = { event: "unauth" };
    const predicate = (message: IMessage): message is IUnauthMessage =>
      "event" in message && message.event === "unauth";

    return this.#send<IUnauthMessage>(payload, { predicate, signal });
  }

  /* ----------------------------- Async iterators ------------------------- */

  /** Subscribe to `ticker` and yield every ticker update for the pair. */
  public async *tickers({
    pair = this.#symbol,
    signal,
  }: ISubscribeTickerOptions = {}): AsyncGenerator<
    IFundingTickerMessage | ITickerMessage,
    void,
    undefined
  > {
    type T = IFundingTickerMessage | ITickerMessage;
    const sub = await this.subscribeTicker({ pair, signal });
    const predicate = (message: IMessage): message is T =>
      "channel_id" in message &&
      message.channel_id === sub.chanId &&
      (message.type === "funding_ticker" || message.type === "ticker");

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      yield await this.#send<T>(null, { predicate, signal });
    }
  }

  /**
   * Subscribe to `trades` and yield the initial `trades_snapshot` followed
   * by every `trade_executed`/`trade_updated` live event for the pair.
   */
  public async *trades({
    pair = this.#symbol,
    signal,
  }: ISubscribeTradesOptions = {}): AsyncGenerator<
    | IFundingTradeExecutedMessage
    | IFundingTradesSnapshotMessage
    | IFundingTradeUpdatedMessage
    | ITradeExecutedMessage
    | ITradesSnapshotMessage
    | ITradeUpdatedMessage,
    void,
    undefined
  > {
    type T =
      | IFundingTradeExecutedMessage
      | IFundingTradesSnapshotMessage
      | IFundingTradeUpdatedMessage
      | ITradeExecutedMessage
      | ITradesSnapshotMessage
      | ITradeUpdatedMessage;
    const sub = await this.subscribeTrades({ pair, signal });
    const predicate = (message: IMessage): message is T =>
      "channel_id" in message &&
      message.channel_id === sub.chanId &&
      (message.type === "trades_snapshot" ||
        message.type === "funding_trades_snapshot" ||
        message.type === "trade_executed" ||
        message.type === "trade_updated" ||
        message.type === "funding_trade_executed" ||
        message.type === "funding_trade_updated");

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      yield await this.#send<T>(null, { predicate, signal });
    }
  }

  /**
   * Subscribe to the aggregated `book` channel and yield the initial
   * `book_snapshot` followed by every `book_update`.
   */
  public async *books({
    pair = this.#symbol,
    prec = "P0",
    freq = "F0",
    len,
    signal,
  }: ISubscribeBookOptions = {}): AsyncGenerator<
    | IBookSnapshotMessage
    | IBookUpdateMessage
    | IFundingBookSnapshotMessage
    | IFundingBookUpdateMessage,
    void,
    undefined
  > {
    type B =
      | IBookSnapshotMessage
      | IBookUpdateMessage
      | IFundingBookSnapshotMessage
      | IFundingBookUpdateMessage;
    const sub = await this.subscribeBook({
      pair,
      prec,
      freq,
      signal,
      ...(typeof len === "undefined" ? {} : { len }),
    });
    const predicate = (message: IMessage): message is B =>
      "channel_id" in message &&
      message.channel_id === sub.chanId &&
      (message.type === "book_snapshot" ||
        message.type === "book_update" ||
        message.type === "funding_book_snapshot" ||
        message.type === "funding_book_update");

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      yield await this.#send<B>(null, { predicate, signal });
    }
  }

  /**
   * Subscribe to the raw (`R0`) book and yield `raw_book_snapshot` followed
   * by `raw_book_update` events.
   */
  public async *rawBooks({
    pair = this.#symbol,
    len,
    signal,
  }: ISubscribeRawBookOptions = {}): AsyncGenerator<
    | IRawBookSnapshotMessage
    | IRawBookUpdateMessage
    | IRawFundingBookSnapshotMessage
    | IRawFundingBookUpdateMessage,
    void,
    undefined
  > {
    type R =
      | IRawBookSnapshotMessage
      | IRawBookUpdateMessage
      | IRawFundingBookSnapshotMessage
      | IRawFundingBookUpdateMessage;
    const sub = await this.subscribeRawBook({
      pair,
      signal,
      ...(typeof len === "undefined" ? {} : { len }),
    });
    const predicate = (message: IMessage): message is R =>
      "channel_id" in message &&
      message.channel_id === sub.chanId &&
      (message.type === "raw_book_snapshot" ||
        message.type === "raw_book_update" ||
        message.type === "raw_funding_book_snapshot" ||
        message.type === "raw_funding_book_update");

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      yield await this.#send<R>(null, { predicate, signal });
    }
  }

  /**
   * Yield every wallet snapshot/update arriving on the authenticated
   * channel. The caller is expected to have called `auth()` first.
   */
  public async *wallets({ signal }: ISignal = {}): AsyncGenerator<
    IWalletSnapshotMessage | IWalletUpdateMessage,
    void,
    undefined
  > {
    type W = IWalletSnapshotMessage | IWalletUpdateMessage;
    const predicate = (message: IMessage): message is W =>
      "channel_id" in message &&
      message.channel_id === 0 &&
      (message.type === "wallet_snapshot" || message.type === "wallet_update");

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      yield await this.#send<W>(null, { predicate, signal });
    }
  }

  /** Send a raw payload to the websocket server. */
  public send(payload: Record<string, unknown>): Promise<void> {
    const ws = this.#ws;
    if (!ws) {
      return Promise.reject(new Error("Websocket is not connected"));
    }
    if (ws.readyState !== globalThis.WebSocket.OPEN) {
      return Promise.reject(
        new Error(`WebSocket is not open: readyState ${ws.readyState}`),
      );
    }

    try {
      ws.send(JSON.stringify(payload));
      return Promise.resolve();
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      return Promise.reject(error);
    }
  }

  #handleRawMessage(data: string): void {
    // eslint-disable-next-line init-declarations
    let parsed: unknown;
    try {
      parsed = JSON.parse(data) as unknown;
    } catch (error) {
      this.emit(
        "error",
        new Error("Message could not be parsed by `JSON.parse`", {
          cause: error,
        }),
      );
      return;
    }

    if (Array.isArray(parsed)) {
      const transformed = parseChannelFrame(parsed, this.#subscriptions);
      if (transformed !== null) {
        this.emit("message", transformed);
      }
      return;
    }

    if (parsed !== null && typeof parsed === "object") {
      const { event } = parsed as { event?: string };
      if (event === "error") {
        const err = parsed as IErrorMessage;
        this.emit(
          "error",
          new Error(err.msg ?? `Bitfinex error (code ${err.code})`, {
            cause: parsed,
          }),
        );
        return;
      }
      if (event === "subscribed") {
        const sub = parsed as ISubscribedMessage;
        const info: ISubscriptionInfo = { channel: sub.channel };
        if (typeof sub.pair !== "undefined") {
          info.pair = sub.pair;
        }
        if (typeof sub.currency !== "undefined") {
          info.currency = sub.currency;
        }
        if (typeof sub.prec !== "undefined") {
          info.prec = sub.prec;
        }
        if (typeof sub.freq !== "undefined") {
          info.freq = sub.freq;
        }
        if (typeof sub.len !== "undefined") {
          info.len = sub.len;
        }
        this.#subscriptions.set(sub.chanId, info);
      } else if (event === "unsubscribed") {
        const unsub = parsed as IUnsubscribedMessage;
        this.#subscriptions.delete(unsub.chanId);
      }
      this.emit("message", parsed as IMessage);
    }
  }

  #subscribe(
    params: Record<string, string>,
    { signal }: ISignal,
  ): Promise<ISubscribedMessage> {
    const payload = { event: "subscribe", ...params };
    const { channel, pair } = params;
    const funding_currency =
      typeof pair === "string" && pair.startsWith("f") ? pair.slice(1) : null;
    const currency = funding_currency ?? pair;
    const predicate = (message: IMessage): message is ISubscribedMessage =>
      "event" in message &&
      message.event === "subscribed" &&
      message.channel === channel &&
      (typeof pair === "undefined" ||
        message.pair === pair ||
        message.currency === currency);

    return this.#send<ISubscribedMessage>(payload, { predicate, signal });
  }

  #send<T extends IMessage = IMessage>(
    payload: Record<string, unknown> | null,
    { predicate, signal }: IListenersOptions<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject): void => {
      const ws = this.#ws;
      if (!ws) {
        reject(new Error("Websocket is not connected"));
        return;
      }

      const aborted = signal?.aborted ?? false;
      if (aborted) {
        reject(new WSAbort("The request has been aborted"));
        return;
      }
      const use_abort = signal instanceof AbortSignal;

      const listeners = {
        message: (message: IMessage): void => {
          if (predicate(message)) {
            listeners.remove_listeners();
            resolve(message);
          }
        },

        close: (): void => {
          listeners.remove_listeners();
          reject(new Error("WebSocket connection has been closed"));
        },

        error: (error: unknown): void => {
          listeners.remove_listeners();
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
        },

        abort: (event: Event): void => {
          listeners.remove_listeners();
          reject(new WSAbort("The request has been aborted", event));
        },

        add_listeners: (): void => {
          this.on("error", listeners.error)
            .on("close", listeners.close)
            .on("message", listeners.message);
        },

        remove_listeners: (): void => {
          this.off("message", listeners.message)
            .off("error", listeners.error)
            .off("close", listeners.close);
          if (use_abort) {
            signal.removeEventListener("abort", listeners.abort);
          }
        },
      };

      if (use_abort) {
        signal.addEventListener("abort", listeners.abort, { once: true });
      }

      if (payload) {
        if (ws.readyState !== globalThis.WebSocket.OPEN) {
          if (use_abort) {
            signal.removeEventListener("abort", listeners.abort);
          }
          reject(
            new Error(`WebSocket is not open: readyState ${ws.readyState}`),
          );
          return;
        }
        try {
          ws.send(JSON.stringify(payload));
          if (!use_abort || !signal.aborted) {
            listeners.add_listeners();
          }
        } catch (error) {
          if (use_abort) {
            signal.removeEventListener("abort", listeners.abort);
          }
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
        }
      } else {
        listeners.add_listeners();
      }
    });
  }
}
