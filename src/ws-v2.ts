/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { createHmac } from "node:crypto";
import { EventEmitter } from "node:events";
import { createMonotonicNonce } from "./auth-v2.js";
import { DefaultV2Symbol } from "./public-v2.js";
import { type ISignal, WSAbort } from "./ws.js";

export const WebSocketURLV2 = "wss://api-pub.bitfinex.com/ws/2";
export const WebSocketAuthURLV2 = "wss://api.bitfinex.com/ws/2";

/** Conf event flags (bitwise XOR). https://docs.bitfinex.com/docs/flag-values */
export const ConfFlags = {
  TIMESTAMP: 32768,
  SEQ_ALL: 65536,
  OB_CHECKSUM: 131072,
  BULK_UPDATES: 536870912,
} as const;

export type IBookPrecisionV2WS = "P0" | "P1" | "P2" | "P3" | "P4" | "R0";
export type IBookFrequencyV2 = "F0" | "F1";
export type IPublicChannelNameV2 =
  | "book"
  | "candles"
  | "status"
  | "ticker"
  | "trades";

/* -------------------------------------------------------------------------- */
/*  Server events                                                              */
/* -------------------------------------------------------------------------- */

export interface IInfoMessageV2 {
  event: "info";
  version?: number;
  serverId?: string;
  platform?: { status: 0 | 1 };
  code?: number;
  msg?: string;
}

export interface IPongMessageV2 {
  event: "pong";
  ts: number;
  cid?: number;
}

export interface IConfMessageV2 {
  event: "conf";
  status: "FAILED" | "OK";
}

export interface IErrorMessageV2 {
  event: "error";
  msg?: string;
  code: number;
  chanId?: number;
  symbol?: string;
  channel?: string;
}

export interface ISubscribedMessageV2 {
  event: "subscribed";
  channel: IPublicChannelNameV2;
  chanId: number;
  symbol?: string;
  pair?: string;
  currency?: string;
  prec?: IBookPrecisionV2WS;
  freq?: IBookFrequencyV2;
  len?: string;
  key?: string;
  subId?: string;
}

export interface IUnsubscribedMessageV2 {
  event: "unsubscribed";
  status: "OK";
  chanId: number;
}

export interface IAuthSuccessMessageV2 {
  event: "auth";
  status: "OK";
  chanId: 0;
  userId: number;
  auth_id?: string;
  caps?: unknown;
}

export interface IAuthFailedMessageV2 {
  event: "auth";
  status: "FAILED";
  chanId: 0;
  code: number;
  msg?: string;
}

export type IAuthMessageV2 = IAuthFailedMessageV2 | IAuthSuccessMessageV2;

export interface IUnauthMessageV2 {
  event: "unauth";
  status: "OK";
  chanId: 0;
}

export type IEventMessageV2 =
  | IAuthMessageV2
  | IConfMessageV2
  | IErrorMessageV2
  | IInfoMessageV2
  | IPongMessageV2
  | ISubscribedMessageV2
  | IUnauthMessageV2
  | IUnsubscribedMessageV2;

/* -------------------------------------------------------------------------- */
/*  Channel messages                                                           */
/* -------------------------------------------------------------------------- */

export interface IHeartbeatMessageV2 {
  channel_id: number;
  type: "heartbeat";
}

/**
 * Order-book checksum frame `[CHAN_ID, "cs", CHECKSUM]`, emitted when the
 * `OB_CHECKSUM` conf flag (131072) is enabled.
 *
 * https://docs.bitfinex.com/docs/ws-websocket-checksum
 */
export interface IChecksumMessageV2 {
  channel_id: number;
  type: "checksum";
  checksum: number;
}

export interface ITickerV2Message {
  channel_id: number;
  type: "ticker";
  symbol: string;
  bid: number;
  bid_size: number;
  ask: number;
  ask_size: number;
  daily_change: number;
  daily_change_relative: number;
  last_price: number;
  volume: number;
  high: number;
  low: number;
}

export interface IFundingTickerV2Message {
  channel_id: number;
  type: "funding_ticker";
  symbol: string;
  frr: number;
  bid: number;
  bid_period: number;
  bid_size: number;
  ask: number;
  ask_period: number;
  ask_size: number;
  daily_change: number;
  daily_change_relative: number;
  last_price: number;
  volume: number;
  high: number;
  low: number;
  frr_amount_available: number;
}

export interface IWSTradeV2 {
  id: number;
  mts: number;
  amount: number;
  price: number;
}

export interface IWSFundingTradeV2 {
  id: number;
  mts: number;
  amount: number;
  rate: number;
  period: number;
}

export interface ITradesSnapshotV2Message {
  channel_id: number;
  type: "trades_snapshot";
  symbol: string;
  trades: IWSTradeV2[];
}

export interface IFundingTradesSnapshotV2Message {
  channel_id: number;
  type: "funding_trades_snapshot";
  symbol: string;
  trades: IWSFundingTradeV2[];
}

export interface ITradeExecutedV2Message extends IWSTradeV2 {
  channel_id: number;
  type: "trade_executed";
  symbol: string;
}

export interface ITradeUpdatedV2Message extends IWSTradeV2 {
  channel_id: number;
  type: "trade_updated";
  symbol: string;
}

export interface IFundingTradeExecutedV2Message extends IWSFundingTradeV2 {
  channel_id: number;
  type: "funding_trade_executed";
  symbol: string;
}

export interface IFundingTradeUpdatedV2Message extends IWSFundingTradeV2 {
  channel_id: number;
  type: "funding_trade_updated";
  symbol: string;
}

export interface IBookLevelV2 {
  price: number;
  count: number;
  amount: number;
}

export interface IFundingBookLevelV2 {
  rate: number;
  period: number;
  count: number;
  amount: number;
}

export interface IRawBookLevelV2 {
  order_id: number;
  price: number;
  amount: number;
}

export interface IRawFundingBookLevelV2 {
  offer_id: number;
  period: number;
  rate: number;
  amount: number;
}

export interface IBookSnapshotV2Message {
  channel_id: number;
  type: "book_snapshot";
  symbol: string;
  book: IBookLevelV2[];
}

export interface IBookUpdateV2Message extends IBookLevelV2 {
  channel_id: number;
  type: "book_update";
  symbol: string;
}

export interface IFundingBookSnapshotV2Message {
  channel_id: number;
  type: "funding_book_snapshot";
  symbol: string;
  book: IFundingBookLevelV2[];
}

export interface IFundingBookUpdateV2Message extends IFundingBookLevelV2 {
  channel_id: number;
  type: "funding_book_update";
  symbol: string;
}

export interface IRawBookSnapshotV2Message {
  channel_id: number;
  type: "raw_book_snapshot";
  symbol: string;
  book: IRawBookLevelV2[];
}

export interface IRawBookUpdateV2Message extends IRawBookLevelV2 {
  channel_id: number;
  type: "raw_book_update";
  symbol: string;
}

export interface IRawFundingBookSnapshotV2Message {
  channel_id: number;
  type: "raw_funding_book_snapshot";
  symbol: string;
  book: IRawFundingBookLevelV2[];
}

export interface IRawFundingBookUpdateV2Message extends IRawFundingBookLevelV2 {
  channel_id: number;
  type: "raw_funding_book_update";
  symbol: string;
}

export interface IWSCandleV2 {
  mts: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface ICandlesSnapshotV2Message {
  channel_id: number;
  type: "candles_snapshot";
  key: string;
  candles: IWSCandleV2[];
}

export interface ICandleUpdateV2Message extends IWSCandleV2 {
  channel_id: number;
  type: "candle_update";
  key: string;
}

export interface IDerivativesStatusV2Message {
  channel_id: number;
  type: "derivatives_status";
  key: string;
  mts: number;
  deriv_price: number;
  spot_price: number;
  insurance_fund_balance: number;
  next_funding_evt_timestamp_ms: number | null;
  next_funding_accrued: number | null;
  next_funding_step: number | null;
  current_funding: number | null;
  mark_price: number;
  open_interest: number | null;
  clamp_min: number | null;
  clamp_max: number | null;
}

export interface ILiquidationV2 {
  pos_id: number;
  mts: number;
  symbol: string;
  amount: number;
  base_price: number;
  is_match: 0 | 1;
  is_market_sold: 0 | 1;
  liquidation_price: number | null;
}

export interface ILiquidationFeedV2Message {
  channel_id: number;
  type: "liquidation_feed";
  key: string;
  liquidations: ILiquidationV2[];
}

/* ----------------------------- Authenticated ------------------------------ */

export type IWalletTypeWS = "exchange" | "funding" | "margin";

export interface IWSWalletV2 {
  wallet_type: IWalletTypeWS;
  currency: string;
  balance: number;
  unsettled_interest: number;
  balance_available: number | null;
  description: string | null;
  meta: unknown;
}

export interface IWalletSnapshotV2Message {
  channel_id: 0;
  type: "wallet_snapshot";
  wallets: IWSWalletV2[];
}

export interface IWalletUpdateV2Message extends IWSWalletV2 {
  channel_id: 0;
  type: "wallet_update";
}

export interface IWSPositionV2 {
  symbol: string;
  status: string;
  amount: number;
  base_price: number;
  margin_funding: number;
  margin_funding_type: number;
  pl: number | null;
  pl_perc: number | null;
  price_liq: number | null;
  leverage: number | null;
  position_id: number;
  mts_create: number | null;
  mts_update: number | null;
  position_type: number | null;
  collateral: number | null;
  collateral_min: number | null;
  meta: unknown;
}

export interface IPositionSnapshotV2Message {
  channel_id: 0;
  type: "position_snapshot";
  positions: IWSPositionV2[];
}

export type IPositionEventV2Type =
  | "position_close"
  | "position_new"
  | "position_update";

export interface IPositionEventV2Message extends IWSPositionV2 {
  channel_id: 0;
  type: IPositionEventV2Type;
}

export interface IWSOrderV2 {
  id: number;
  gid: number | null;
  cid: number;
  symbol: string;
  mts_create: number;
  mts_update: number;
  amount: number;
  amount_orig: number;
  order_type: string;
  type_prev: string | null;
  mts_tif: number | null;
  flags: number;
  status: string;
  price: number;
  price_avg: number;
  price_trailing: number;
  price_aux_limit: number;
  notify: 0 | 1;
  hidden: 0 | 1;
  placed_id: number | null;
  routing: string | null;
  meta: unknown;
}

export interface IOrderSnapshotV2Message {
  channel_id: 0;
  type: "order_snapshot";
  orders: IWSOrderV2[];
}

export type IOrderEventV2Type = "order_cancel" | "order_new" | "order_update";

export interface IOrderEventV2Message extends IWSOrderV2 {
  channel_id: 0;
  type: IOrderEventV2Type;
}

export interface IBalanceUpdateV2Message {
  channel_id: 0;
  type: "balance_update";
  aum: number;
  aum_net: number;
}

export interface IWSFundingOfferV2 {
  id: number;
  symbol: string;
  mts_created: number;
  mts_updated: number;
  amount: number;
  amount_orig: number;
  offer_type: string;
  flags: number | null;
  status: string;
  rate: number;
  period: number;
  notify: 0 | 1;
  hidden: 0 | 1;
  renew: 0 | 1;
}

export interface IFundingOfferSnapshotV2Message {
  channel_id: 0;
  type: "funding_offer_snapshot";
  offers: IWSFundingOfferV2[];
}

export type IFundingOfferEventV2Type =
  | "funding_offer_cancel"
  | "funding_offer_new"
  | "funding_offer_update";

export interface IFundingOfferEventV2Message extends IWSFundingOfferV2 {
  channel_id: 0;
  type: IFundingOfferEventV2Type;
}

export interface IWSFundingLoanV2 {
  id: number;
  symbol: string;
  side: number;
  mts_create: number;
  mts_update: number;
  amount: number;
  flags: number | null;
  status: string;
  rate: number;
  period: number;
  mts_opening: number;
  mts_last_payout: number | null;
  notify: 0 | 1;
  hidden: 0 | 1;
  renew: 0 | 1;
  no_close: 0 | 1;
}

export interface IWSFundingCreditV2 extends IWSFundingLoanV2 {
  position_pair: string | null;
}

export interface IFundingCreditSnapshotV2Message {
  channel_id: 0;
  type: "funding_credit_snapshot";
  credits: IWSFundingCreditV2[];
}

export type IFundingCreditEventV2Type =
  | "funding_credit_close"
  | "funding_credit_new"
  | "funding_credit_update";

export interface IFundingCreditEventV2Message extends IWSFundingCreditV2 {
  channel_id: 0;
  type: IFundingCreditEventV2Type;
}

export interface IFundingLoanSnapshotV2Message {
  channel_id: 0;
  type: "funding_loan_snapshot";
  loans: IWSFundingLoanV2[];
}

export type IFundingLoanEventV2Type =
  | "funding_loan_close"
  | "funding_loan_new"
  | "funding_loan_update";

export interface IFundingLoanEventV2Message extends IWSFundingLoanV2 {
  channel_id: 0;
  type: IFundingLoanEventV2Type;
}

export interface INotificationV2Message {
  channel_id: 0;
  type: "notification";
  mts: number;
  notification_type: string;
  message_id: number | null;
  notify_info: unknown;
  code: number | null;
  status: string | null;
  text: string | null;
}

/**
 * Generic envelope for authenticated frames whose payload schema is not
 * decoded into a typed message (e.g. `te`/`tu` account trades, `mis`/`miu`
 * margin info, `fiu` funding info, historical snapshots `hos`/`hfos`/…,
 * `uac` price-alert events). The v2 mnemonic is carried in `mnemonic`.
 *
 * https://docs.bitfinex.com/docs/abbreviations-glossary
 */
export interface IAuthEnvelopeV2Message {
  channel_id: 0;
  type: "auth_envelope";
  mnemonic: string;
  payload: unknown;
}

export type IChannelMessageV2 =
  | IAuthEnvelopeV2Message
  | IBalanceUpdateV2Message
  | IBookSnapshotV2Message
  | IBookUpdateV2Message
  | ICandleUpdateV2Message
  | ICandlesSnapshotV2Message
  | IChecksumMessageV2
  | IDerivativesStatusV2Message
  | IFundingBookSnapshotV2Message
  | IFundingBookUpdateV2Message
  | IFundingCreditEventV2Message
  | IFundingCreditSnapshotV2Message
  | IFundingLoanEventV2Message
  | IFundingLoanSnapshotV2Message
  | IFundingOfferEventV2Message
  | IFundingOfferSnapshotV2Message
  | IFundingTickerV2Message
  | IFundingTradeExecutedV2Message
  | IFundingTradeUpdatedV2Message
  | IFundingTradesSnapshotV2Message
  | IHeartbeatMessageV2
  | ILiquidationFeedV2Message
  | INotificationV2Message
  | IOrderEventV2Message
  | IOrderSnapshotV2Message
  | IPositionEventV2Message
  | IPositionSnapshotV2Message
  | IRawBookSnapshotV2Message
  | IRawBookUpdateV2Message
  | IRawFundingBookSnapshotV2Message
  | IRawFundingBookUpdateV2Message
  | ITickerV2Message
  | ITradeExecutedV2Message
  | ITradeUpdatedV2Message
  | ITradesSnapshotV2Message
  | IWalletSnapshotV2Message
  | IWalletUpdateV2Message;

export type IMessageV2 = IChannelMessageV2 | IEventMessageV2;

/* -------------------------------------------------------------------------- */
/*  Decoder helpers                                                            */
/* -------------------------------------------------------------------------- */

function num(value: unknown): number {
  return value as number;
}

function nNum(value: unknown): number | null {
  return value === null || typeof value === "undefined"
    ? null
    : (value as number);
}

function nStr(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function flag(value: unknown): 0 | 1 {
  return value === 1 ? 1 : 0;
}

function isFunding(symbol: string): boolean {
  return symbol.startsWith("f");
}

function decodeWalletV2(row: unknown[]): IWSWalletV2 {
  return {
    wallet_type: row[0] as IWalletTypeWS,
    currency: row[1] as string,
    balance: num(row[2]),
    unsettled_interest: num(row[3]),
    balance_available: nNum(row[4]),
    description: nStr(row[5]),
    meta: typeof row[6] === "undefined" ? null : row[6],
  };
}

function decodePositionV2(row: unknown[]): IWSPositionV2 {
  return {
    symbol: row[0] as string,
    status: row[1] as string,
    amount: num(row[2]),
    base_price: num(row[3]),
    margin_funding: num(row[4]),
    margin_funding_type: num(row[5]),
    pl: nNum(row[6]),
    pl_perc: nNum(row[7]),
    price_liq: nNum(row[8]),
    leverage: nNum(row[9]),
    position_id: num(row[11]),
    mts_create: nNum(row[12]),
    mts_update: nNum(row[13]),
    position_type: nNum(row[15]),
    collateral: nNum(row[17]),
    collateral_min: nNum(row[18]),
    meta: typeof row[19] === "undefined" ? null : row[19],
  };
}

function decodeOrderV2(row: unknown[]): IWSOrderV2 {
  return {
    id: num(row[0]),
    gid: nNum(row[1]),
    cid: num(row[2]),
    symbol: row[3] as string,
    mts_create: num(row[4]),
    mts_update: num(row[5]),
    amount: num(row[6]),
    amount_orig: num(row[7]),
    order_type: row[8] as string,
    type_prev: nStr(row[9]),
    mts_tif: nNum(row[10]),
    flags: num(row[12]),
    status: row[13] as string,
    price: num(row[16]),
    price_avg: num(row[17]),
    price_trailing: num(row[18]),
    price_aux_limit: num(row[19]),
    notify: flag(row[23]),
    hidden: flag(row[24]),
    placed_id: nNum(row[25]),
    routing: nStr(row[28]),
    meta: typeof row[31] === "undefined" ? null : row[31],
  };
}

function decodeFundingOfferV2(row: unknown[]): IWSFundingOfferV2 {
  return {
    id: num(row[0]),
    symbol: row[1] as string,
    mts_created: num(row[2]),
    mts_updated: num(row[3]),
    amount: num(row[4]),
    amount_orig: num(row[5]),
    offer_type: row[6] as string,
    flags: nNum(row[9]),
    status: row[10] as string,
    rate: num(row[14]),
    period: num(row[15]),
    notify: flag(row[16]),
    hidden: flag(row[17]),
    renew: flag(row[19]),
  };
}

function decodeFundingLoanV2(row: unknown[]): IWSFundingLoanV2 {
  return {
    id: num(row[0]),
    symbol: row[1] as string,
    side: num(row[2]),
    mts_create: num(row[3]),
    mts_update: num(row[4]),
    amount: num(row[5]),
    flags: nNum(row[6]),
    status: row[7] as string,
    rate: num(row[11]),
    period: num(row[12]),
    mts_opening: num(row[13]),
    mts_last_payout: nNum(row[14]),
    notify: flag(row[15]),
    hidden: flag(row[16]),
    renew: flag(row[18]),
    no_close: flag(row[20]),
  };
}

function decodeFundingCreditV2(row: unknown[]): IWSFundingCreditV2 {
  return { ...decodeFundingLoanV2(row), position_pair: nStr(row[21]) };
}

function decodeNotificationV2(
  payload: unknown[],
): Omit<INotificationV2Message, "channel_id" | "type"> {
  return {
    mts: num(payload[0]),
    notification_type: payload[1] as string,
    message_id: nNum(payload[2]),
    notify_info: typeof payload[4] === "undefined" ? null : payload[4],
    code: nNum(payload[5]),
    status: nStr(payload[6]),
    text: nStr(payload[7]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Auth frame parser                                                          */
/* -------------------------------------------------------------------------- */

const POSITION_EVENT: Record<string, IPositionEventV2Type> = {
  pn: "position_new",
  pu: "position_update",
  pc: "position_close",
};
const ORDER_EVENT: Record<string, IOrderEventV2Type> = {
  on: "order_new",
  ou: "order_update",
  oc: "order_cancel",
};
const FUNDING_OFFER_EVENT: Record<string, IFundingOfferEventV2Type> = {
  fon: "funding_offer_new",
  fou: "funding_offer_update",
  foc: "funding_offer_cancel",
};
const FUNDING_CREDIT_EVENT: Record<string, IFundingCreditEventV2Type> = {
  fcn: "funding_credit_new",
  fcu: "funding_credit_update",
  fcc: "funding_credit_close",
};
const FUNDING_LOAN_EVENT: Record<string, IFundingLoanEventV2Type> = {
  fln: "funding_loan_new",
  flu: "funding_loan_update",
  flc: "funding_loan_close",
};

function parseAuthFrameV2(frame: unknown[]): IChannelMessageV2 {
  const mnemonic = frame[1] as string;
  const [, , payload] = frame;
  const rows = Array.isArray(payload) ? (payload as unknown[]) : [];

  switch (mnemonic) {
    case "ws":
      return {
        channel_id: 0,
        type: "wallet_snapshot",
        wallets: (rows as unknown[][]).map(decodeWalletV2),
      };
    case "wu":
      return {
        channel_id: 0,
        type: "wallet_update",
        ...decodeWalletV2(rows),
      };
    case "ps":
      return {
        channel_id: 0,
        type: "position_snapshot",
        positions: (rows as unknown[][]).map(decodePositionV2),
      };
    case "os":
      return {
        channel_id: 0,
        type: "order_snapshot",
        orders: (rows as unknown[][]).map(decodeOrderV2),
      };
    case "fos":
      return {
        channel_id: 0,
        type: "funding_offer_snapshot",
        offers: (rows as unknown[][]).map(decodeFundingOfferV2),
      };
    case "fcs":
      return {
        channel_id: 0,
        type: "funding_credit_snapshot",
        credits: (rows as unknown[][]).map(decodeFundingCreditV2),
      };
    case "fls":
      return {
        channel_id: 0,
        type: "funding_loan_snapshot",
        loans: (rows as unknown[][]).map(decodeFundingLoanV2),
      };
    case "bu":
      return {
        channel_id: 0,
        type: "balance_update",
        aum: num(rows[0]),
        aum_net: num(rows[1]),
      };
    case "n":
      return {
        channel_id: 0,
        type: "notification",
        ...decodeNotificationV2(rows),
      };
    default:
      break;
  }

  const positionEvent = POSITION_EVENT[mnemonic];
  if (typeof positionEvent !== "undefined") {
    return { channel_id: 0, type: positionEvent, ...decodePositionV2(rows) };
  }
  const orderEvent = ORDER_EVENT[mnemonic];
  if (typeof orderEvent !== "undefined") {
    return { channel_id: 0, type: orderEvent, ...decodeOrderV2(rows) };
  }
  const offerEvent = FUNDING_OFFER_EVENT[mnemonic];
  if (typeof offerEvent !== "undefined") {
    return { channel_id: 0, type: offerEvent, ...decodeFundingOfferV2(rows) };
  }
  const creditEvent = FUNDING_CREDIT_EVENT[mnemonic];
  if (typeof creditEvent !== "undefined") {
    return { channel_id: 0, type: creditEvent, ...decodeFundingCreditV2(rows) };
  }
  const loanEvent = FUNDING_LOAN_EVENT[mnemonic];
  if (typeof loanEvent !== "undefined") {
    return { channel_id: 0, type: loanEvent, ...decodeFundingLoanV2(rows) };
  }

  return { channel_id: 0, type: "auth_envelope", mnemonic, payload };
}

/* -------------------------------------------------------------------------- */
/*  Public channel parser                                                      */
/* -------------------------------------------------------------------------- */

interface ISubscriptionInfoV2 {
  channel: IPublicChannelNameV2;
  symbol?: string;
  pair?: string;
  currency?: string;
  prec?: IBookPrecisionV2WS;
  freq?: IBookFrequencyV2;
  len?: string;
  key?: string;
}

function decodeTickerFrame(
  channel_id: number,
  symbol: string,
  data: unknown[],
): IFundingTickerV2Message | ITickerV2Message {
  if (isFunding(symbol)) {
    return {
      channel_id,
      type: "funding_ticker",
      symbol,
      frr: num(data[0]),
      bid: num(data[1]),
      bid_period: num(data[2]),
      bid_size: num(data[3]),
      ask: num(data[4]),
      ask_period: num(data[5]),
      ask_size: num(data[6]),
      daily_change: num(data[7]),
      daily_change_relative: num(data[8]),
      last_price: num(data[9]),
      volume: num(data[10]),
      high: num(data[11]),
      low: num(data[12]),
      frr_amount_available: num(data[15]),
    };
  }
  return {
    channel_id,
    type: "ticker",
    symbol,
    bid: num(data[0]),
    bid_size: num(data[1]),
    ask: num(data[2]),
    ask_size: num(data[3]),
    daily_change: num(data[4]),
    daily_change_relative: num(data[5]),
    last_price: num(data[6]),
    volume: num(data[7]),
    high: num(data[8]),
    low: num(data[9]),
  };
}

function decodeTradingTrade(row: unknown[]): IWSTradeV2 {
  return {
    id: num(row[0]),
    mts: num(row[1]),
    amount: num(row[2]),
    price: num(row[3]),
  };
}

function decodeFundingTrade(row: unknown[]): IWSFundingTradeV2 {
  return {
    id: num(row[0]),
    mts: num(row[1]),
    amount: num(row[2]),
    rate: num(row[3]),
    period: num(row[4]),
  };
}

function decodeTradesFrame(
  channel_id: number,
  symbol: string,
  frame: unknown[],
): IChannelMessageV2 {
  const funding = isFunding(symbol);
  if (Array.isArray(frame[1])) {
    const rows = frame[1] as unknown[][];
    if (funding) {
      return {
        channel_id,
        type: "funding_trades_snapshot",
        symbol,
        trades: rows.map(decodeFundingTrade),
      };
    }
    return {
      channel_id,
      type: "trades_snapshot",
      symbol,
      trades: rows.map(decodeTradingTrade),
    };
  }
  const tag = frame[1] as string;
  const row = frame[2] as unknown[];
  if (funding) {
    return {
      channel_id,
      type: tag === "fte" ? "funding_trade_executed" : "funding_trade_updated",
      symbol,
      ...decodeFundingTrade(row),
    };
  }
  return {
    channel_id,
    type: tag === "te" ? "trade_executed" : "trade_updated",
    symbol,
    ...decodeTradingTrade(row),
  };
}

function decodeBookFrame(
  channel_id: number,
  sub: ISubscriptionInfoV2,
  frame: unknown[],
): IChannelMessageV2 {
  const symbol = sub.symbol ?? "";
  const funding = isFunding(symbol);
  const raw = sub.prec === "R0";
  const isSnapshot = Array.isArray(frame[1]) && Array.isArray(frame[1][0]);

  if (raw && funding) {
    const decode = (row: unknown[]): IRawFundingBookLevelV2 => ({
      offer_id: num(row[0]),
      period: num(row[1]),
      rate: num(row[2]),
      amount: num(row[3]),
    });
    if (isSnapshot) {
      return {
        channel_id,
        type: "raw_funding_book_snapshot",
        symbol,
        book: (frame[1] as unknown[][]).map(decode),
      };
    }
    return {
      channel_id,
      type: "raw_funding_book_update",
      symbol,
      ...decode(frame[1] as unknown[]),
    };
  }
  if (raw) {
    const decode = (row: unknown[]): IRawBookLevelV2 => ({
      order_id: num(row[0]),
      price: num(row[1]),
      amount: num(row[2]),
    });
    if (isSnapshot) {
      return {
        channel_id,
        type: "raw_book_snapshot",
        symbol,
        book: (frame[1] as unknown[][]).map(decode),
      };
    }
    return {
      channel_id,
      type: "raw_book_update",
      symbol,
      ...decode(frame[1] as unknown[]),
    };
  }
  if (funding) {
    const decode = (row: unknown[]): IFundingBookLevelV2 => ({
      rate: num(row[0]),
      period: num(row[1]),
      count: num(row[2]),
      amount: num(row[3]),
    });
    if (isSnapshot) {
      return {
        channel_id,
        type: "funding_book_snapshot",
        symbol,
        book: (frame[1] as unknown[][]).map(decode),
      };
    }
    return {
      channel_id,
      type: "funding_book_update",
      symbol,
      ...decode(frame[1] as unknown[]),
    };
  }
  const decode = (row: unknown[]): IBookLevelV2 => ({
    price: num(row[0]),
    count: num(row[1]),
    amount: num(row[2]),
  });
  if (isSnapshot) {
    return {
      channel_id,
      type: "book_snapshot",
      symbol,
      book: (frame[1] as unknown[][]).map(decode),
    };
  }
  return {
    channel_id,
    type: "book_update",
    symbol,
    ...decode(frame[1] as unknown[]),
  };
}

function decodeCandle(row: unknown[]): IWSCandleV2 {
  return {
    mts: num(row[0]),
    open: num(row[1]),
    close: num(row[2]),
    high: num(row[3]),
    low: num(row[4]),
    volume: num(row[5]),
  };
}

function decodeCandlesFrame(
  channel_id: number,
  key: string,
  frame: unknown[],
): IChannelMessageV2 {
  if (Array.isArray(frame[1]) && Array.isArray(frame[1][0])) {
    return {
      channel_id,
      type: "candles_snapshot",
      key,
      candles: (frame[1] as unknown[][]).map(decodeCandle),
    };
  }
  return {
    channel_id,
    type: "candle_update",
    key,
    ...decodeCandle(frame[1] as unknown[]),
  };
}

function decodeDerivativesStatus(
  channel_id: number,
  key: string,
  data: unknown[],
): IDerivativesStatusV2Message {
  return {
    channel_id,
    type: "derivatives_status",
    key,
    mts: num(data[0]),
    deriv_price: num(data[2]),
    spot_price: num(data[3]),
    insurance_fund_balance: num(data[5]),
    next_funding_evt_timestamp_ms: nNum(data[7]),
    next_funding_accrued: nNum(data[8]),
    next_funding_step: nNum(data[9]),
    current_funding: nNum(data[11]),
    mark_price: num(data[14]),
    open_interest: nNum(data[17]),
    clamp_min: nNum(data[21]),
    clamp_max: nNum(data[22]),
  };
}

function decodeLiquidation(row: unknown[]): ILiquidationV2 {
  return {
    pos_id: num(row[1]),
    mts: num(row[2]),
    symbol: row[4] as string,
    amount: num(row[5]),
    base_price: num(row[6]),
    is_match: flag(row[8]),
    is_market_sold: flag(row[9]),
    liquidation_price: nNum(row[11]),
  };
}

function decodeStatusFrame(
  channel_id: number,
  key: string,
  frame: unknown[],
): IChannelMessageV2 {
  if (key.startsWith("liq:")) {
    return {
      channel_id,
      type: "liquidation_feed",
      key,
      liquidations: (frame[1] as unknown[][]).map(decodeLiquidation),
    };
  }
  return decodeDerivativesStatus(channel_id, key, frame[1] as unknown[]);
}

function parseChannelFrameV2(
  frame: unknown[],
  subscriptions: Map<number, ISubscriptionInfoV2>,
): IChannelMessageV2 | null {
  const channel_id = frame[0] as number;

  if (frame[1] === "hb") {
    return { channel_id, type: "heartbeat" };
  }
  if (frame[1] === "cs") {
    return { channel_id, type: "checksum", checksum: num(frame[2]) };
  }
  if (channel_id === 0) {
    return parseAuthFrameV2(frame);
  }

  const sub = subscriptions.get(channel_id);
  if (!sub) {
    return null;
  }

  switch (sub.channel) {
    case "ticker":
      return decodeTickerFrame(
        channel_id,
        sub.symbol ?? "",
        frame[1] as unknown[],
      );
    case "trades":
      return decodeTradesFrame(channel_id, sub.symbol ?? "", frame);
    case "book":
      return decodeBookFrame(channel_id, sub, frame);
    case "candles":
      return decodeCandlesFrame(channel_id, sub.key ?? "", frame);
    case "status":
      return decodeStatusFrame(channel_id, sub.key ?? "", frame);
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  WebSocketClientV2                                                          */
/* -------------------------------------------------------------------------- */

export interface ISubscribeTickerV2Options extends ISignal {
  symbol?: string;
}

export interface ISubscribeTradesV2Options extends ISignal {
  symbol?: string;
}

export interface ISubscribeBookV2Options extends ISignal {
  symbol?: string;
  prec?: Exclude<IBookPrecisionV2WS, "R0">;
  freq?: IBookFrequencyV2;
  len?: number | string;
  subId?: string;
}

export interface ISubscribeRawBookV2Options extends ISignal {
  symbol?: string;
  len?: number | string;
  subId?: string;
}

export interface ISubscribeCandlesV2Options extends ISignal {
  key: string;
}

export interface ISubscribeStatusV2Options extends ISignal {
  key: string;
}

export interface IUnsubscribeV2Options extends ISignal {
  chanId: number;
}

export interface IConfV2Options extends ISignal {
  flags: number;
}

export interface IAuthV2Options extends ISignal {
  dms?: 4;
  filter?: string[];
}

type IListenerPredicateV2<T extends IMessageV2 = IMessageV2> = (
  message: IMessageV2,
) => message is T;

interface IListenersOptionsV2<
  T extends IMessageV2 = IMessageV2,
> extends ISignal {
  predicate: IListenerPredicateV2<T>;
}

export interface IWebSocketClientV2Options {
  ws_url?: URL | string | undefined;
  symbol?: string | undefined;
  key?: string | undefined;
  secret?: string | undefined;
  nonce?: (() => string) | undefined;
}

export interface WebSocketClientV2 {
  addListener(event: "close" | "open", eventListener: () => void): this;
  addListener(event: "error", eventListener: (error: unknown) => void): this;
  addListener(
    event: "message",
    eventListener: (message: IMessageV2) => void,
  ): this;

  emit(event: "close" | "open"): boolean;
  emit(event: "error", error: unknown): boolean;
  emit(event: "message", message: IMessageV2): boolean;

  on(event: "close" | "open", eventListener: () => void): this;
  on(event: "error", eventListener: (error: unknown) => void): this;
  on(event: "message", eventListener: (message: IMessageV2) => void): this;

  once(event: "close" | "open", eventListener: () => void): this;
  once(event: "error", eventListener: (error: unknown) => void): this;
  once(event: "message", eventListener: (message: IMessageV2) => void): this;

  prependListener(event: "close" | "open", eventListener: () => void): this;
  prependListener(
    event: "error",
    eventListener: (error: unknown) => void,
  ): this;
  prependListener(
    event: "message",
    eventListener: (message: IMessageV2) => void,
  ): this;

  prependOnceListener(event: "close" | "open", eventListener: () => void): this;
  prependOnceListener(
    event: "error",
    eventListener: (error: unknown) => void,
  ): this;
  prependOnceListener(
    event: "message",
    eventListener: (message: IMessageV2) => void,
  ): this;
}

export class WebSocketClientV2 extends EventEmitter {
  readonly #ws_url: URL;
  readonly #symbol: string;
  readonly #auth: { key: string; secret: string } | null;
  readonly #nonce: () => string;
  readonly #subscriptions = new Map<number, ISubscriptionInfoV2>();
  #ws: WebSocket | null;
  #cid = 0;

  public constructor({
    ws_url,
    symbol = DefaultV2Symbol,
    nonce = createMonotonicNonce(),
    key,
    secret,
  }: IWebSocketClientV2Options = {}) {
    super();
    const hasAuth = typeof key === "string" && typeof secret === "string";
    this.#ws_url = new URL(
      ws_url ?? (hasAuth ? WebSocketAuthURLV2 : WebSocketURLV2),
    );
    this.#symbol = symbol;
    this.#nonce = nonce;
    this.#ws = null;
    this.#auth = hasAuth ? { key, secret } : null;
  }

  public get symbol(): string {
    return this.#symbol;
  }

  public get ws(): WebSocket | null {
    return this.#ws;
  }

  /** Snapshot of active subscriptions keyed by `chanId`. */
  public get subscriptions(): Map<number, ISubscriptionInfoV2> {
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
        const error = new Error("WebSocket connection error", { cause: event });
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

  /** Send a ping message and resolve with the matching pong. */
  public ping({ signal }: ISignal = {}): Promise<IPongMessageV2> {
    this.#cid += 1;
    const cid = this.#cid;
    const payload = { event: "ping", cid };
    const predicate = (message: IMessageV2): message is IPongMessageV2 =>
      "event" in message && message.event === "pong" && message.cid === cid;

    return this.#send<IPongMessageV2>(payload, { predicate, signal });
  }

  /** Send a `conf` event to change connection settings (bitwise flags). */
  public conf({ flags, signal }: IConfV2Options): Promise<IConfMessageV2> {
    const payload = { event: "conf", flags };
    const predicate = (message: IMessageV2): message is IConfMessageV2 =>
      "event" in message && message.event === "conf";

    return this.#send<IConfMessageV2>(payload, { predicate, signal });
  }

  /** Subscribe to the `ticker` channel. */
  public subscribeTicker({
    symbol = this.#symbol,
    signal,
  }: ISubscribeTickerV2Options = {}): Promise<ISubscribedMessageV2> {
    return this.#subscribe({ channel: "ticker", symbol }, { signal });
  }

  /** Subscribe to the `trades` channel. */
  public subscribeTrades({
    symbol = this.#symbol,
    signal,
  }: ISubscribeTradesV2Options = {}): Promise<ISubscribedMessageV2> {
    return this.#subscribe({ channel: "trades", symbol }, { signal });
  }

  /** Subscribe to the aggregated `book` channel. */
  public subscribeBook({
    symbol = this.#symbol,
    prec = "P0",
    freq = "F0",
    len,
    subId,
    signal,
  }: ISubscribeBookV2Options = {}): Promise<ISubscribedMessageV2> {
    if (prec === ("R0" as typeof prec)) {
      return Promise.reject(
        new Error('Use rawBooks() or subscribeRawBook() for precision "R0"'),
      );
    }
    const payload: Record<string, string> = {
      channel: "book",
      symbol,
      prec,
      freq,
    };
    if (typeof len !== "undefined") {
      payload.len = `${len}`;
    }
    if (typeof subId !== "undefined") {
      payload.subId = subId;
    }
    return this.#subscribe(payload, { signal });
  }

  /** Subscribe to the raw `book` channel (precision `R0`). */
  public subscribeRawBook({
    symbol = this.#symbol,
    len,
    subId,
    signal,
  }: ISubscribeRawBookV2Options = {}): Promise<ISubscribedMessageV2> {
    const payload: Record<string, string> = {
      channel: "book",
      symbol,
      prec: "R0",
    };
    if (typeof len !== "undefined") {
      payload.len = `${len}`;
    }
    if (typeof subId !== "undefined") {
      payload.subId = subId;
    }
    return this.#subscribe(payload, { signal });
  }

  /** Subscribe to the `candles` channel (e.g. `key: "trade:1m:tBTCUSD"`). */
  public subscribeCandles({
    key,
    signal,
  }: ISubscribeCandlesV2Options): Promise<ISubscribedMessageV2> {
    return this.#subscribe({ channel: "candles", key }, { signal });
  }

  /** Subscribe to the `status` channel (`deriv:SYMBOL` or `liq:global`). */
  public subscribeStatus({
    key,
    signal,
  }: ISubscribeStatusV2Options): Promise<ISubscribedMessageV2> {
    return this.#subscribe({ channel: "status", key }, { signal });
  }

  /** Unsubscribe from a channel by `chanId`. */
  public unsubscribe({
    chanId,
    signal,
  }: IUnsubscribeV2Options): Promise<IUnsubscribedMessageV2> {
    const payload = { event: "unsubscribe", chanId };
    const predicate = (
      message: IMessageV2,
    ): message is IUnsubscribedMessageV2 =>
      "event" in message &&
      message.event === "unsubscribed" &&
      message.chanId === chanId;

    return this.#send<IUnsubscribedMessageV2>(payload, { predicate, signal });
  }

  /**
   * Authenticate the connection. `dms: 4` enables the Dead-Man-Switch
   * (cancel all account orders on disconnect); `filter` narrows the account
   * events delivered.
   *
   * https://docs.bitfinex.com/docs/ws-auth
   */
  public auth({
    dms,
    filter,
    signal,
  }: IAuthV2Options = {}): Promise<IAuthSuccessMessageV2> {
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
    if (typeof dms !== "undefined") {
      payload.dms = dms;
    }
    if (typeof filter !== "undefined") {
      payload.filter = filter;
    }

    const predicate = (message: IMessageV2): message is IAuthMessageV2 =>
      "event" in message && message.event === "auth";

    return this.#send<IAuthMessageV2>(payload, { predicate, signal }).then(
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
  public unauth({ signal }: ISignal = {}): Promise<IUnauthMessageV2> {
    const payload = { event: "unauth" };
    const predicate = (message: IMessageV2): message is IUnauthMessageV2 =>
      "event" in message && message.event === "unauth";

    return this.#send<IUnauthMessageV2>(payload, { predicate, signal });
  }

  /* ----------------------------- Async iterators ------------------------- */

  /** Subscribe to `ticker` and yield every ticker update for the symbol. */
  public async *tickers({
    symbol = this.#symbol,
    signal,
  }: ISubscribeTickerV2Options = {}): AsyncGenerator<
    IFundingTickerV2Message | ITickerV2Message,
    void,
    undefined
  > {
    type T = IFundingTickerV2Message | ITickerV2Message;
    const sub = await this.subscribeTicker({ symbol, signal });
    const predicate = (message: IMessageV2): message is T =>
      "channel_id" in message &&
      message.channel_id === sub.chanId &&
      (message.type === "funding_ticker" || message.type === "ticker");

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      yield await this.#send<T>(null, { predicate, signal });
    }
  }

  /** Subscribe to `trades` and yield snapshot + live trade events. */
  public async *trades({
    symbol = this.#symbol,
    signal,
  }: ISubscribeTradesV2Options = {}): AsyncGenerator<
    | IFundingTradeExecutedV2Message
    | IFundingTradesSnapshotV2Message
    | IFundingTradeUpdatedV2Message
    | ITradeExecutedV2Message
    | ITradesSnapshotV2Message
    | ITradeUpdatedV2Message,
    void,
    undefined
  > {
    type T =
      | IFundingTradeExecutedV2Message
      | IFundingTradesSnapshotV2Message
      | IFundingTradeUpdatedV2Message
      | ITradeExecutedV2Message
      | ITradesSnapshotV2Message
      | ITradeUpdatedV2Message;
    const sub = await this.subscribeTrades({ symbol, signal });
    const predicate = (message: IMessageV2): message is T =>
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

  /** Subscribe to the aggregated `book` and yield snapshot + updates. */
  public async *books({
    symbol = this.#symbol,
    prec = "P0",
    freq = "F0",
    len,
    subId,
    signal,
  }: ISubscribeBookV2Options = {}): AsyncGenerator<
    | IBookSnapshotV2Message
    | IBookUpdateV2Message
    | IFundingBookSnapshotV2Message
    | IFundingBookUpdateV2Message,
    void,
    undefined
  > {
    type B =
      | IBookSnapshotV2Message
      | IBookUpdateV2Message
      | IFundingBookSnapshotV2Message
      | IFundingBookUpdateV2Message;
    const sub = await this.subscribeBook({
      symbol,
      prec,
      freq,
      signal,
      ...(typeof len === "undefined" ? {} : { len }),
      ...(typeof subId === "undefined" ? {} : { subId }),
    });
    const predicate = (message: IMessageV2): message is B =>
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

  /** Subscribe to the raw (`R0`) book and yield snapshot + updates. */
  public async *rawBooks({
    symbol = this.#symbol,
    len,
    subId,
    signal,
  }: ISubscribeRawBookV2Options = {}): AsyncGenerator<
    | IRawBookSnapshotV2Message
    | IRawBookUpdateV2Message
    | IRawFundingBookSnapshotV2Message
    | IRawFundingBookUpdateV2Message,
    void,
    undefined
  > {
    type R =
      | IRawBookSnapshotV2Message
      | IRawBookUpdateV2Message
      | IRawFundingBookSnapshotV2Message
      | IRawFundingBookUpdateV2Message;
    const sub = await this.subscribeRawBook({
      symbol,
      signal,
      ...(typeof len === "undefined" ? {} : { len }),
      ...(typeof subId === "undefined" ? {} : { subId }),
    });
    const predicate = (message: IMessageV2): message is R =>
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

  /** Subscribe to `candles` and yield snapshot + updates. */
  public async *candles({
    key,
    signal,
  }: ISubscribeCandlesV2Options): AsyncGenerator<
    ICandlesSnapshotV2Message | ICandleUpdateV2Message,
    void,
    undefined
  > {
    type C = ICandlesSnapshotV2Message | ICandleUpdateV2Message;
    const sub = await this.subscribeCandles({ key, signal });
    const predicate = (message: IMessageV2): message is C =>
      "channel_id" in message &&
      message.channel_id === sub.chanId &&
      (message.type === "candles_snapshot" || message.type === "candle_update");

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      yield await this.#send<C>(null, { predicate, signal });
    }
  }

  /** Subscribe to `status` and yield derivative status / liquidation events. */
  public async *status({
    key,
    signal,
  }: ISubscribeStatusV2Options): AsyncGenerator<
    IDerivativesStatusV2Message | ILiquidationFeedV2Message,
    void,
    undefined
  > {
    type S = IDerivativesStatusV2Message | ILiquidationFeedV2Message;
    const sub = await this.subscribeStatus({ key, signal });
    const predicate = (message: IMessageV2): message is S =>
      "channel_id" in message &&
      message.channel_id === sub.chanId &&
      (message.type === "derivatives_status" ||
        message.type === "liquidation_feed");

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      yield await this.#send<S>(null, { predicate, signal });
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
      const transformed = parseChannelFrameV2(parsed, this.#subscriptions);
      if (transformed !== null) {
        this.emit("message", transformed);
      }
      return;
    }

    if (parsed !== null && typeof parsed === "object") {
      const { event } = parsed as { event?: string };
      if (event === "error") {
        const err = parsed as IErrorMessageV2;
        this.emit(
          "error",
          new Error(err.msg ?? `Bitfinex error (code ${err.code})`, {
            cause: parsed,
          }),
        );
        return;
      }
      if (event === "subscribed") {
        const sub = parsed as ISubscribedMessageV2;
        const info: ISubscriptionInfoV2 = { channel: sub.channel };
        if (typeof sub.symbol !== "undefined") {
          info.symbol = sub.symbol;
        }
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
        if (typeof sub.key !== "undefined") {
          info.key = sub.key;
        }
        this.#subscriptions.set(sub.chanId, info);
      } else if (event === "unsubscribed") {
        const unsub = parsed as IUnsubscribedMessageV2;
        this.#subscriptions.delete(unsub.chanId);
      }
      this.emit("message", parsed as IMessageV2);
    }
  }

  #subscribe(
    params: Record<string, string>,
    { signal }: ISignal,
  ): Promise<ISubscribedMessageV2> {
    const payload = { event: "subscribe", ...params };
    const { channel, symbol, key } = params;
    const funding_currency =
      typeof symbol === "string" && symbol.startsWith("f")
        ? symbol.slice(1)
        : null;
    const currency = funding_currency ?? symbol;
    const predicate = (message: IMessageV2): message is ISubscribedMessageV2 =>
      "event" in message &&
      message.event === "subscribed" &&
      message.channel === channel &&
      (typeof key === "undefined"
        ? typeof symbol === "undefined" ||
          message.symbol === symbol ||
          message.currency === currency
        : message.key === key);

    return this.#send<ISubscribedMessageV2>(payload, { predicate, signal });
  }

  #send<T extends IMessageV2 = IMessageV2>(
    payload: Record<string, unknown> | null,
    { predicate, signal }: IListenersOptionsV2<T>,
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
        message: (message: IMessageV2): void => {
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
