/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { createHmac } from "node:crypto";
import { EventEmitter } from "node:events";
import { WebSocket } from "ws";
import { DefaultSymbol } from "./public.js";

export const WebSocketURL = "wss://api.bitfinex.com/ws/1";

export class WSAbort extends Error {
  public constructor(msg: string, cause?: Event) {
    super(msg, { cause });
    this.name = "AbortError";
  }
}

export type IBookPrecision = "P0" | "P1" | "P2" | "P3" | "R0";
export type IBookFrequency = "F0" | "F1";

export type IPublicChannelName = "book" | "ticker" | "trades";

export interface ISignal {
  signal?: AbortSignal | null | undefined;
}

export interface IInfoMessage {
  event: "info";
  version?: number;
  code?: number;
  msg?: string;
}

export interface IPongMessage {
  event: "pong";
}

export interface IPingMessage {
  event: "ping";
}

export interface IErrorMessage {
  event: "error";
  msg: string;
  code: number;
  pair?: string;
  channel?: string;
}

export interface ISubscribedMessage {
  event: "subscribed";
  channel: IPublicChannelName;
  chanId: number;
  pair?: string;
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

export interface IUnauthMessage {
  event: "unauth";
  status: string;
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

/**
 * Ticker:
 * `[CHAN_ID, [BID, BID_SIZE, ASK, ASK_SIZE, DAILY_CHANGE,
 *             DAILY_CHANGE_PERC, LAST_PRICE, VOLUME, HIGH, LOW]]`
 */
export type ITickerPayload = [
  bid: number,
  bid_size: number,
  ask: number,
  ask_size: number,
  daily_change: number,
  daily_change_perc: number,
  last_price: number,
  volume: number,
  high: number,
  low: number,
];

export type ITickerSnapshot = [chanId: number, ticker: ITickerPayload];

export type ITradeRow = [
  id: number,
  timestamp: number,
  price: number,
  amount: number,
];

export type ITradeSnapshot = [chanId: number, trades: ITradeRow[]];

export type ITradeExecuted = [
  chanId: number,
  type: "te" | "tu",
  payload:
    | [seq: string, ts: number, price: number, amount: number]
    | [seq: string, id: number, ts: number, price: number, amount: number],
];

export type IBookPriceLevel = [price: number, count: number, amount: number];
export type IRawBookPriceLevel = [
  order_id: number,
  price: number,
  amount: number,
];

export type IBookSnapshot = [chanId: number, levels: IBookPriceLevel[]];
export type IBookUpdate = [chanId: number, level: IBookPriceLevel];

export type IRawBookSnapshot = [chanId: number, levels: IRawBookPriceLevel[]];
export type IRawBookUpdate = [chanId: number, level: IRawBookPriceLevel];

export type IHeartbeat = [chanId: number, "hb"];

export type IChannelMessage =
  | IBookSnapshot
  | IBookUpdate
  | IHeartbeat
  | IRawBookSnapshot
  | IRawBookUpdate
  | ITickerSnapshot
  | ITradeExecuted
  | ITradeSnapshot;

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
  | "tu"
  | "ws"
  | "wu";

export type IAuthChannelMessage = [
  chanId: 0,
  type: IAuthChannelType,
  payload: unknown,
];

export type IMessage = IChannelMessage | IEventMessage | IAuthChannelMessage;

export interface ISubscribeTickerOptions extends ISignal {
  pair?: string;
}

export interface ISubscribeTradesOptions extends ISignal {
  pair?: string;
}

export interface ISubscribeBookOptions extends ISignal {
  pair?: string;
  prec?: IBookPrecision;
  freq?: IBookFrequency;
  len?: number | string;
}

export interface IUnsubscribeOptions extends ISignal {
  chanId: number;
}

export interface IAuthOptions extends ISignal {
  filter?: string[];
  dms?: 0 | 4;
}

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

  /** Connect to the websocket. */
  public connect(): Promise<void> {
    const ws = this.#ws;

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (ws?.readyState) {
      case WebSocket.CLOSING:
      case WebSocket.CONNECTING:
        return Promise.reject(
          new Error(`Could not connect. State: ${ws.readyState}`),
        );
      case WebSocket.OPEN:
        return Promise.resolve();
      default:
        break;
    }

    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.#ws_url)
        .once("open", resolve)
        .once("error", reject)
        .on("open", () => {
          this.emit("open");
        })
        .once("close", () => {
          this.emit("close");
        })
        .on("message", (data: string) => {
          try {
            const message = JSON.parse(data) as IErrorMessage | IMessage;
            if (
              !Array.isArray(message) &&
              "event" in message &&
              message.event === "error"
            ) {
              this.emit("error", new Error(message.msg, { cause: message }));
              return;
            }
            this.emit("message", message as IMessage);
          } catch (error) {
            this.emit(
              "error",
              new Error("Message could not be parsed by `JSON.parse`", {
                cause: error,
              }),
            );
          }
        })
        .on("error", (error) => {
          if (typeof error !== "undefined") {
            this.emit("error", error);
          }
        });

      this.#ws = socket;
    });
  }

  /** Disconnect from the websocket. */
  public disconnect(): Promise<void> {
    const ws = this.#ws;
    if (!ws) {
      return Promise.resolve();
    }

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (ws.readyState) {
      case WebSocket.CLOSED:
        return Promise.resolve();
      case WebSocket.CLOSING:
      case WebSocket.CONNECTING:
        return Promise.reject(
          new Error(`Could not disconnect. State: ${ws.readyState}`),
        );
      default:
        break;
    }

    return new Promise<void>((resolve, reject) => {
      const listeners = {
        close: (): void => {
          ws.off("error", listeners.error);
          resolve();
        },
        error: (error: unknown): void => {
          ws.off("close", listeners.close);
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
        },
      };

      ws.once("error", listeners.error).once("close", listeners.close).close();
    });
  }

  /** Send a ping message. */
  public ping({ signal }: ISignal = {}): Promise<IPongMessage> {
    const payload = { event: "ping" };
    const predicate = (message: IMessage): message is IPongMessage =>
      !Array.isArray(message) && "event" in message && message.event === "pong";

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

  /** Subscribe to the `book` channel. */
  public subscribeBook({
    pair = this.#symbol,
    prec = "P0",
    freq = "F0",
    len,
    signal,
  }: ISubscribeBookOptions = {}): Promise<ISubscribedMessage> {
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
  }: ISubscribeBookOptions = {}): Promise<ISubscribedMessage> {
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
      !Array.isArray(message) &&
      "event" in message &&
      message.event === "unsubscribed" &&
      message.chanId === chanId;

    return this.#send<IUnsubscribedMessage>(payload, { predicate, signal });
  }

  /** Authenticate the connection. */
  public auth({
    filter,
    dms,
    signal,
  }: IAuthOptions = {}): Promise<IAuthSuccessMessage> {
    if (!this.#auth) {
      return Promise.reject(new Error("Auth credentials are missing"));
    }

    const authNonce = this.#nonce();
    const authPayload = `AUTH${authNonce}`;
    const authSig = createHmac("sha384", this.#auth.secret)
      .update(authPayload)
      .digest("hex");

    const payload: Record<string, unknown> = {
      event: "auth",
      apiKey: this.#auth.key,
      authSig,
      authNonce,
      authPayload,
    };
    if (typeof filter !== "undefined") {
      payload.filter = filter;
    }
    if (typeof dms !== "undefined") {
      payload.dms = dms;
    }

    const predicate = (message: IMessage): message is IAuthMessage =>
      !Array.isArray(message) && "event" in message && message.event === "auth";

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
      !Array.isArray(message) &&
      "event" in message &&
      message.event === "unauth";

    return this.#send<IUnauthMessage>(payload, { predicate, signal });
  }

  /** Send a raw payload to the websocket server. */
  public send(payload: Record<string, unknown>): Promise<void> {
    const ws = this.#ws;
    if (!ws) {
      return Promise.reject(new Error("Websocket is not connected"));
    }

    return new Promise((resolve, reject) => {
      ws.send(JSON.stringify(payload), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  #subscribe(
    params: Record<string, string>,
    { signal }: ISignal,
  ): Promise<ISubscribedMessage> {
    const payload = { event: "subscribe", ...params };
    const { channel, pair } = params;
    const predicate = (message: IMessage): message is ISubscribedMessage =>
      !Array.isArray(message) &&
      "event" in message &&
      message.event === "subscribed" &&
      message.channel === channel &&
      (typeof pair === "undefined" || message.pair === pair);

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
        ws.send(JSON.stringify(payload), (error) => {
          if (error) {
            if (use_abort) {
              signal.removeEventListener("abort", listeners.abort);
            }
            reject(error);
          } else if (!use_abort || !signal.aborted) {
            listeners.add_listeners();
          }
        });
      } else {
        listeners.add_listeners();
      }
    });
  }
}
