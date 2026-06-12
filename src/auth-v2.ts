import { type IFetchOptions } from "rpc-request";
import { type IPublicClientV2Options, PublicClientV2 } from "./public-v2.js";
import { signatureV2 } from "./signature-v2.js";

/**
 * Default base URL for authenticated v2 endpoints. Bitfinex serves the public
 * endpoints from `https://api-pub.bitfinex.com/v2/`, but authenticated REST is
 * served from `https://api.bitfinex.com/v2/` — sending signed requests to the
 * public host will fail.
 */
export const ApiUrlV2Auth = "https://api.bitfinex.com/v2/";

/* -------------------------------------------------------------------------- */
/*  Common helpers                                                             */
/* -------------------------------------------------------------------------- */

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function toNullableNumber(value: unknown): number | null {
  return value === null || typeof value === "undefined"
    ? null
    : toNumber(value);
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : String(value);
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toRow(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function toRows(value: unknown): readonly (readonly unknown[])[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((r): r is readonly unknown[] => Array.isArray(r));
}

/* -------------------------------------------------------------------------- */
/*  Generic option types                                                       */
/* -------------------------------------------------------------------------- */

export interface IPaginationOptions {
  start?: number;
  end?: number;
  limit?: number;
}

export interface IAuthenticatedClientV2Options extends IPublicClientV2Options {
  key: string;
  secret: string;
  nonce?: (() => string) | undefined;
}

/* -------------------------------------------------------------------------- */
/*  Domain enums                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Wallet identifier accepted by Bitfinex v2.
 *
 * Some write endpoints (`withdraw`, `deposit/address`, `transfer`) accept the
 * legacy wallet aliases:
 *   - `"trading"` for `"margin"`
 *   - `"deposit"` for `"funding"`
 *
 * Read endpoints (such as `/v2/auth/r/wallets`) return only the canonical
 * `"exchange" | "margin" | "funding"` set.
 */
export type IWalletTypeV2 =
  | "deposit"
  | "exchange"
  | "funding"
  | "margin"
  | "trading";

export type IOrderTypeV2 =
  | "EXCHANGE FOK"
  | "EXCHANGE IOC"
  | "EXCHANGE LIMIT"
  | "EXCHANGE MARKET"
  | "EXCHANGE STOP"
  | "EXCHANGE STOP LIMIT"
  | "EXCHANGE TRAILING STOP"
  | "FOK"
  | "IOC"
  | "LIMIT"
  | "MARKET"
  | "STOP"
  | "STOP LIMIT"
  | "TRAILING STOP";

export type IFundingOfferTypeV2 = "FRRDELTAFIX" | "FRRDELTAVAR" | "LIMIT";

export type IOrderSideFlag = -1 | 1;

/* -------------------------------------------------------------------------- */
/*  Notification envelope                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Bitfinex v2 notification envelope returned by most write endpoints:
 * `[MTS, TYPE, MESSAGE_ID, _, DATA, CODE, STATUS, TEXT]`.
 */
export interface INotificationV2<T> {
  mts: number;
  type: string;
  message_id: number | null;
  data: T;
  code: number | null;
  status: string;
  text: string | null;
}

function decodeNotification<T>(
  raw: unknown,
  decodeData: (data: unknown) => T,
): INotificationV2<T> {
  const row = toRow(raw);
  return {
    mts: toNumber(row[0]),
    type: toString(row[1]),
    message_id: toNullableNumber(row[2]),
    data: decodeData(row[4]),
    code: toNullableNumber(row[5]),
    status: toString(row[6]),
    text: toNullableString(row[7]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Wallet                                                                     */
/* -------------------------------------------------------------------------- */

export interface IWalletV2 {
  type: IWalletTypeV2;
  currency: string;
  balance: number;
  unsettled_interest: number;
  available_balance: number;
  last_change: string | null;
  trade_details: unknown;
}

function decodeWallet(row: readonly unknown[]): IWalletV2 {
  return {
    type: toString(row[0]) as IWalletTypeV2,
    currency: toString(row[1]),
    balance: toNumber(row[2]),
    unsettled_interest: toNumber(row[3]),
    available_balance: toNumber(row[4]),
    last_change: toNullableString(row[5]),
    trade_details: typeof row[6] === "undefined" ? null : row[6],
  };
}

/* -------------------------------------------------------------------------- */
/*  Order                                                                      */
/* -------------------------------------------------------------------------- */

export interface IOrderV2 {
  id: number;
  gid: number | null;
  cid: number;
  symbol: string;
  mts_create: number;
  mts_update: number;
  amount: number;
  amount_orig: number;
  order_type: IOrderTypeV2;
  type_prev: IOrderTypeV2 | null;
  mts_tif: number | null;
  flags: number;
  status: string;
  price: number;
  price_avg: number;
  price_trailing: number;
  price_aux_limit: number;
  hidden: 0 | 1;
  placed_id: number | null;
  routing: string | null;
  meta: unknown;
}

function decodeOrder(row: readonly unknown[]): IOrderV2 {
  return {
    id: toNumber(row[0]),
    gid: toNullableNumber(row[1]),
    cid: toNumber(row[2]),
    symbol: toString(row[3]),
    mts_create: toNumber(row[4]),
    mts_update: toNumber(row[5]),
    amount: toNumber(row[6]),
    amount_orig: toNumber(row[7]),
    order_type: toString(row[8]) as IOrderTypeV2,
    type_prev: row[9] === null ? null : (toString(row[9]) as IOrderTypeV2),
    mts_tif: toNullableNumber(row[10]),
    flags: toNumber(row[12]),
    status: toString(row[13]),
    price: toNumber(row[16]),
    price_avg: toNumber(row[17]),
    price_trailing: toNumber(row[18]),
    price_aux_limit: toNumber(row[19]),
    hidden: toNumber(row[23]) === 1 ? 1 : 0,
    placed_id: toNullableNumber(row[24]),
    routing: toNullableString(row[28]),
    meta: typeof row[31] === "undefined" ? null : row[31],
  };
}

/**
 * Decode a `data` payload that may be either a single flat order row
 * `[ID, GID, CID, SYMBOL, ...]` or a nested array of orders `[[order], ...]`.
 *
 * The Bitfinex docs render most order-producing notifications as the nested
 * shape, but the live REST API sometimes returns the flat shape for
 * single-order submissions, which would otherwise decode to an empty array.
 */
function decodeOrdersFlexible(data: unknown): IOrderV2[] {
  const row = toRow(data);
  if (row.length === 0) {
    return [];
  }
  if (Array.isArray(row[0])) {
    return toRows(row).map(decodeOrder);
  }
  return [decodeOrder(row)];
}

/* -------------------------------------------------------------------------- */
/*  Trade                                                                      */
/* -------------------------------------------------------------------------- */

export interface IAuthTradeV2 {
  id: number;
  symbol: string;
  mts: number;
  order_id: number;
  exec_amount: number;
  exec_price: number;
  order_type: IOrderTypeV2;
  order_price: number | null;
  maker: -1 | 1;
  fee: number;
  fee_currency: string;
  cid: number | null;
}

function decodeTrade(row: readonly unknown[]): IAuthTradeV2 {
  return {
    id: toNumber(row[0]),
    symbol: toString(row[1]),
    mts: toNumber(row[2]),
    order_id: toNumber(row[3]),
    exec_amount: toNumber(row[4]),
    exec_price: toNumber(row[5]),
    order_type: toString(row[6]) as IOrderTypeV2,
    order_price: toNullableNumber(row[7]),
    maker: toNumber(row[8]) === 1 ? 1 : -1,
    fee: toNumber(row[9]),
    fee_currency: toString(row[10]),
    cid: toNullableNumber(row[11]),
  };
}

/* -------------------------------------------------------------------------- */
/*  OTC Order                                                                  */
/* -------------------------------------------------------------------------- */

export interface IOtcOrderV2 {
  id: number;
  symbol: string;
  mts_create: number;
  mts_update: number;
  initiator: number;
  initiator_nickname: string;
  counter_party_nickname: string;
  amount: number;
  price: number;
  status: string;
}

function decodeOtcOrder(row: readonly unknown[]): IOtcOrderV2 {
  return {
    id: toNumber(row[0]),
    symbol: toString(row[1]),
    mts_create: toNumber(row[2]),
    mts_update: toNumber(row[3]),
    initiator: toNumber(row[5]),
    initiator_nickname: toString(row[6]),
    counter_party_nickname: toString(row[7]),
    amount: toNumber(row[9]),
    price: toNumber(row[10]),
    status: toString(row[12]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Ledger entry                                                               */
/* -------------------------------------------------------------------------- */

export interface ILedgerEntryV2 {
  id: number;
  currency: string;
  wallet: IWalletTypeV2 | null;
  mts: number;
  amount: number;
  balance: number;
  description: string;
}

function decodeLedgerEntry(row: readonly unknown[]): ILedgerEntryV2 {
  const wallet = toNullableString(row[2]);
  return {
    id: toNumber(row[0]),
    currency: toString(row[1]),
    wallet: wallet === null ? null : (wallet as IWalletTypeV2),
    mts: toNumber(row[3]),
    amount: toNumber(row[5]),
    balance: toNumber(row[6]),
    description: toString(row[8]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Position                                                                   */
/* -------------------------------------------------------------------------- */

export interface IPositionV2 {
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
  type: number | null;
  collateral: number | null;
  collateral_min: number | null;
  meta: unknown;
}

function decodePosition(row: readonly unknown[]): IPositionV2 {
  return {
    symbol: toString(row[0]),
    status: toString(row[1]),
    amount: toNumber(row[2]),
    base_price: toNumber(row[3]),
    margin_funding: toNumber(row[4]),
    margin_funding_type: toNumber(row[5]),
    pl: toNullableNumber(row[6]),
    pl_perc: toNullableNumber(row[7]),
    price_liq: toNullableNumber(row[8]),
    leverage: toNullableNumber(row[9]),
    position_id: toNumber(row[11]),
    mts_create: toNullableNumber(row[12]),
    mts_update: toNullableNumber(row[13]),
    type: toNullableNumber(row[15]),
    collateral: toNullableNumber(row[17]),
    collateral_min: toNullableNumber(row[18]),
    meta: typeof row[19] === "undefined" ? null : row[19],
  };
}

/* -------------------------------------------------------------------------- */
/*  Funding offer                                                              */
/* -------------------------------------------------------------------------- */

export interface IFundingOfferV2 {
  id: number;
  symbol: string;
  mts_created: number;
  mts_updated: number;
  amount: number;
  amount_orig: number;
  type: IFundingOfferTypeV2;
  flags: number | null;
  status: string;
  rate: number;
  period: number;
  notify: 0 | 1;
  hidden: 0 | 1;
  renew: 0 | 1;
}

function decodeFundingOffer(row: readonly unknown[]): IFundingOfferV2 {
  return {
    id: toNumber(row[0]),
    symbol: toString(row[1]),
    mts_created: toNumber(row[2]),
    mts_updated: toNumber(row[3]),
    amount: toNumber(row[4]),
    amount_orig: toNumber(row[5]),
    type: toString(row[6]) as IFundingOfferTypeV2,
    flags: toNullableNumber(row[9]),
    status: toString(row[10]),
    rate: toNumber(row[14]),
    period: toNumber(row[15]),
    notify: toNumber(row[16]) === 1 ? 1 : 0,
    hidden: toNumber(row[17]) === 1 ? 1 : 0,
    renew: toNumber(row[19]) === 1 ? 1 : 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  Funding loan / credit                                                      */
/* -------------------------------------------------------------------------- */

export interface IFundingLoanV2 {
  id: number;
  symbol: string;
  side: IOrderSideFlag | 0;
  mts_create: number;
  mts_update: number;
  amount: number;
  flags: number | null;
  status: string;
  rate_type: string | null;
  rate: number;
  period: number;
  mts_opening: number;
  mts_last_payout: number | null;
  notify: 0 | 1;
  hidden: 0 | 1;
  renew: 0 | 1;
  no_close: 0 | 1;
}

export interface IFundingCreditV2 extends IFundingLoanV2 {
  position_pair: string | null;
}

function decodeFundingLoan(row: readonly unknown[]): IFundingLoanV2 {
  const side = toNumber(row[2]);
  return {
    id: toNumber(row[0]),
    symbol: toString(row[1]),
    side: side === 1 ? 1 : side === -1 ? -1 : 0,
    mts_create: toNumber(row[3]),
    mts_update: toNumber(row[4]),
    amount: toNumber(row[5]),
    flags: toNullableNumber(row[6]),
    status: toString(row[7]),
    rate_type: toNullableString(row[8]),
    rate: toNumber(row[11]),
    period: toNumber(row[12]),
    mts_opening: toNumber(row[13]),
    mts_last_payout: toNullableNumber(row[14]),
    notify: toNumber(row[15]) === 1 ? 1 : 0,
    hidden: toNumber(row[16]) === 1 ? 1 : 0,
    renew: toNumber(row[18]) === 1 ? 1 : 0,
    no_close: toNumber(row[20]) === 1 ? 1 : 0,
  };
}

function decodeFundingCredit(row: readonly unknown[]): IFundingCreditV2 {
  return {
    ...decodeFundingLoan(row),
    position_pair: toNullableString(row[21]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Funding trade                                                              */
/* -------------------------------------------------------------------------- */

export interface IFundingTradeAuthV2 {
  id: number;
  currency: string;
  mts_create: number;
  offer_id: number;
  amount: number;
  rate: number;
  period: number;
}

function decodeFundingTradeAuth(row: readonly unknown[]): IFundingTradeAuthV2 {
  return {
    id: toNumber(row[0]),
    currency: toString(row[1]),
    mts_create: toNumber(row[2]),
    offer_id: toNumber(row[3]),
    amount: toNumber(row[4]),
    rate: toNumber(row[5]),
    period: toNumber(row[6]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Margin / funding info                                                      */
/* -------------------------------------------------------------------------- */

export interface IMarginInfoBaseV2 {
  type: "base";
  user_pl: number;
  user_swaps: number;
  margin_balance: number;
  margin_balance_net: number;
  margin_min: number;
}

export interface IMarginInfoSymbolV2 {
  type: "sym";
  symbol: string;
  tradable_balance: number;
  gross_balance: number;
  buy: number;
  sell: number;
}

export type IMarginInfoV2 = IMarginInfoBaseV2 | IMarginInfoSymbolV2;

function decodeMarginInfo(row: readonly unknown[]): IMarginInfoV2 {
  const key = toString(row[0]);
  if (key === "base") {
    const data = toRow(row[1]);
    return {
      type: "base",
      user_pl: toNumber(data[0]),
      user_swaps: toNumber(data[1]),
      margin_balance: toNumber(data[2]),
      margin_balance_net: toNumber(data[3]),
      margin_min: toNumber(data[4]),
    };
  }
  const data = toRow(row[2]);
  return {
    type: "sym",
    symbol: toString(row[1]),
    tradable_balance: toNumber(data[0]),
    gross_balance: toNumber(data[1]),
    buy: toNumber(data[2]),
    sell: toNumber(data[3]),
  };
}

export interface IFundingInfoV2 {
  type: "sym";
  symbol: string;
  yield_loan: number;
  yield_lend: number;
  duration_loan: number;
  duration_lend: number;
}

function decodeFundingInfo(row: readonly unknown[]): IFundingInfoV2 {
  const data = toRow(row[2]);
  return {
    type: "sym",
    symbol: toString(row[1]),
    yield_loan: toNumber(data[0]),
    yield_lend: toNumber(data[1]),
    duration_loan: toNumber(data[2]),
    duration_lend: toNumber(data[3]),
  };
}

/* -------------------------------------------------------------------------- */
/*  User info / summary                                                        */
/* -------------------------------------------------------------------------- */

/**
 * User info response. The endpoint returns a large positional array with many
 * undocumented placeholder positions; only the well-documented leading fields
 * are decoded by name. The full raw response is exposed via `raw` so callers
 * can read any field that is not surfaced here.
 */
export interface IUserInfoV2 {
  id: number;
  email: string;
  username: string;
  mts_account_create: number;
  verified: 0 | 1;
  verification_level: number;
  timezone: string | null;
  locale: string | null;
  company: string | null;
  email_verified: 0 | 1;
  subaccount_type: string | null;
  mts_master_account_create: number | null;
  group_id: number | null;
  master_account_id: number | null;
  raw: readonly unknown[];
}

function asFlag(value: unknown): 0 | 1 {
  return toNumber(value) === 1 ? 1 : 0;
}

function decodeUserInfo(row: readonly unknown[]): IUserInfoV2 {
  return {
    id: toNumber(row[0]),
    email: toString(row[1]),
    username: toString(row[2]),
    mts_account_create: toNumber(row[3]),
    verified: asFlag(row[4]),
    verification_level: toNumber(row[5]),
    timezone: toNullableString(row[7]),
    locale: toNullableString(row[8]),
    company: toNullableString(row[9]),
    email_verified: asFlag(row[10]),
    subaccount_type: toNullableString(row[12]),
    mts_master_account_create: toNullableNumber(row[14]),
    group_id: toNullableNumber(row[15]),
    master_account_id: toNullableNumber(row[16]),
    raw: row,
  };
}

export interface ISummaryV2 {
  trade_vol_30d: unknown;
  fees_funding_30d: unknown;
  fees_funding_total_30d: number | null;
  fees_trading_30d: unknown;
  fees_trading_total_30d: number | null;
  leo_lev: number | null;
  leo_amount_avg: number | null;
  raw: readonly unknown[];
}

function decodeSummary(row: readonly unknown[]): ISummaryV2 {
  return {
    trade_vol_30d: row[4] ?? null,
    fees_funding_30d: row[5] ?? null,
    fees_funding_total_30d: toNullableNumber(row[6]),
    fees_trading_30d: row[7] ?? null,
    fees_trading_total_30d: toNullableNumber(row[8]),
    leo_lev: toNullableNumber(row[9]),
    leo_amount_avg: toNullableNumber(row[10]),
    raw: row,
  };
}

/* -------------------------------------------------------------------------- */
/*  Audit / logins                                                             */
/* -------------------------------------------------------------------------- */

export interface IAuditLogV2 {
  mts_create: number;
  log: string;
  ip: string | null;
  user_agent: string | null;
}

function decodeAuditLog(row: readonly unknown[]): IAuditLogV2 {
  return {
    mts_create: toNumber(row[0]),
    log: toString(row[2]),
    ip: toNullableString(row[5]),
    user_agent: toNullableString(row[6]),
  };
}

export interface ILoginEntryV2 {
  id: number;
  time: number;
  ip: string | null;
  extra_info: string | null;
}

function decodeLogin(row: readonly unknown[]): ILoginEntryV2 {
  return {
    id: toNumber(row[0]),
    time: toNumber(row[2]),
    ip: toNullableString(row[4]),
    extra_info: toNullableString(row[7]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Key permissions                                                            */
/* -------------------------------------------------------------------------- */

export interface IKeyPermissionV2 {
  scope: string;
  read: 0 | 1;
  write: 0 | 1;
}

function decodeKeyPermission(row: readonly unknown[]): IKeyPermissionV2 {
  return {
    scope: toString(row[0]),
    read: asFlag(row[1]),
    write: asFlag(row[2]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Deposit address                                                            */
/* -------------------------------------------------------------------------- */

export interface IDepositAddressV2 {
  method: string;
  currency_code: string;
  address: string;
  pool_address: string | null;
}

function decodeDepositAddress(raw: unknown): IDepositAddressV2 {
  const row = toRow(raw);
  return {
    method: toString(row[1]),
    currency_code: toString(row[2]),
    address: toString(row[4]),
    pool_address: toNullableString(row[5]),
  };
}

export interface IDepositAddressAllEntry {
  address: string;
  wallet: IWalletTypeV2;
}

function decodeDepositAddressAll(
  row: readonly unknown[],
): IDepositAddressAllEntry {
  return {
    address: toString(row[0]),
    wallet: toString(row[1]) as IWalletTypeV2,
  };
}

export interface IDepositInvoiceV2 {
  invoice_hash: string;
  invoice: string;
  amount: string;
}

function decodeDepositInvoice(row: readonly unknown[]): IDepositInvoiceV2 {
  return {
    invoice_hash: toString(row[0]),
    invoice: toString(row[1]),
    amount: toString(row[4]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Movement                                                                   */
/* -------------------------------------------------------------------------- */

export interface IMovementV2 {
  id: number;
  currency: string;
  currency_name: string;
  mts_started: number;
  mts_updated: number;
  status: string;
  amount: number;
  fees: number;
  destination_address: string | null;
  memo: string | null;
  transaction_id: string | null;
  note: string | null;
  bank_fee: number | null;
  bank_router_id: number | null;
  external_bank_mov_id: number | null;
  external_bank_mov_status: string | null;
  external_bank_mov_description: string | null;
  external_bank_acc_info: unknown;
}

function decodeMovement(row: readonly unknown[]): IMovementV2 {
  return {
    id: toNumber(row[0]),
    currency: toString(row[1]),
    currency_name: toString(row[2]),
    mts_started: toNumber(row[5]),
    mts_updated: toNumber(row[6]),
    status: toString(row[9]),
    amount: toNumber(row[12]),
    fees: toNumber(row[13]),
    destination_address: toNullableString(row[16]),
    memo: toNullableString(row[17]),
    transaction_id: toNullableString(row[20]),
    note: toNullableString(row[21]),
    bank_fee: toNullableNumber(row[22]),
    bank_router_id: toNullableNumber(row[23]),
    external_bank_mov_id: toNullableNumber(row[26]),
    external_bank_mov_status: toNullableString(row[27]),
    external_bank_mov_description: toNullableString(row[28]),
    external_bank_acc_info: row[29] ?? null,
  };
}

export interface IMovementInfoV2 {
  id: number;
  currency: string;
  currency_method: string;
  remark: string | null;
  mts_started: number;
  mts_updated: number;
  status: string;
  amount: number;
  fees: number;
  destination_address: string | null;
  raw: readonly unknown[];
}

function decodeMovementInfo(row: readonly unknown[]): IMovementInfoV2 {
  return {
    id: toNumber(row[0]),
    currency: toString(row[1]),
    currency_method: toString(row[2]),
    remark: toNullableString(row[4]),
    mts_started: toNumber(row[5]),
    mts_updated: toNumber(row[6]),
    status: toString(row[9]),
    amount: toNumber(row[12]),
    fees: toNumber(row[13]),
    destination_address: toNullableString(row[16]),
    raw: row,
  };
}

/* -------------------------------------------------------------------------- */
/*  Alerts                                                                     */
/* -------------------------------------------------------------------------- */

export interface IAlertV2 {
  info: string;
  type: "price";
  symbol: string;
  price: number;
  countdown: number;
}

function decodeAlert(row: readonly unknown[]): IAlertV2 {
  return {
    info: toString(row[0]),
    type: "price",
    symbol: toString(row[2]),
    price: toNumber(row[3]),
    countdown: toNumber(row[4]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Withdrawal                                                                 */
/* -------------------------------------------------------------------------- */

export interface IWithdrawalV2 {
  withdrawal_id: number;
  method: string;
  payment_id: string | null;
  wallet: IWalletTypeV2;
  amount: number;
  withdrawal_fee: number;
}

function decodeWithdrawal(raw: unknown): IWithdrawalV2 {
  const row = toRow(raw);
  return {
    withdrawal_id: toNumber(row[0]),
    method: toString(row[2]),
    payment_id: toNullableString(row[3]),
    wallet: toString(row[4]) as IWalletTypeV2,
    amount: toNumber(row[5]),
    withdrawal_fee: toNumber(row[8]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Transfer                                                                   */
/* -------------------------------------------------------------------------- */

export interface ITransferV2 {
  mts_update: number;
  wallet_from: IWalletTypeV2;
  wallet_to: IWalletTypeV2;
  currency: string;
  currency_to: string | null;
  amount: number;
}

function decodeTransfer(raw: unknown): ITransferV2 {
  const row = toRow(raw);
  return {
    mts_update: toNumber(row[0]),
    wallet_from: toString(row[1]) as IWalletTypeV2,
    wallet_to: toString(row[2]) as IWalletTypeV2,
    currency: toString(row[4]),
    currency_to: toNullableString(row[5]),
    amount: toNumber(row[7]),
  };
}

/* -------------------------------------------------------------------------- */
/*  Settings                                                                   */
/* -------------------------------------------------------------------------- */

export interface IUserSettingEntry {
  key: string;
  value: unknown;
}

function decodeUserSetting(row: readonly unknown[]): IUserSettingEntry {
  return {
    key: toString(row[0]),
    value: typeof row[1] === "undefined" ? null : row[1],
  };
}

/* -------------------------------------------------------------------------- */
/*  Method option types                                                        */
/* -------------------------------------------------------------------------- */

export interface ISymbolOptionalOptions {
  symbol?: string;
}

export interface ICurrencyOptionalOptions {
  currency?: string;
}

export interface IRetrieveOrdersOptions extends ISymbolOptionalOptions {
  id?: number[];
  gid?: number;
  cid?: number;
  cid_date?: string;
}

export interface IOrdersHistoryOptions
  extends ISymbolOptionalOptions, IPaginationOptions {
  id?: number[];
}

export interface IOrderTradesOptions {
  symbol: string;
  id: number;
}

export interface ITradesHistoryOptions
  extends ISymbolOptionalOptions, IPaginationOptions {
  sort?: -1 | 1;
}

export interface IOtcOrdersHistoryOptions
  extends ISymbolOptionalOptions, IPaginationOptions {
  id?: number[];
}

export interface ILedgersOptions
  extends ICurrencyOptionalOptions, IPaginationOptions {
  category?: number;
  wallet?: IWalletTypeV2;
}

export interface IMovementsOptions
  extends ICurrencyOptionalOptions, IPaginationOptions {
  id?: number[];
  address?: string;
}

export interface IMovementInfoOptions {
  id: number;
}

export interface IPositionsAuditOptions extends IPaginationOptions {
  id: number[];
}

export interface IPositionsHistoryOptions extends IPaginationOptions {
  id?: number;
}

export interface IPositionsSnapshotOptions extends IPaginationOptions {
  id?: number;
}

export interface IClaimPositionOptionsV2 {
  id: number;
  amount?: string;
}

export interface IIncreasePositionOptions {
  symbol: string;
  amount: string;
}

export interface IIncreasePositionInfoOptions {
  symbol: string;
  amount?: string;
}

export interface IUpdatePositionFundingTypeOptions {
  symbol: string;
  type: 0 | 1;
}

export interface IDerivCollateralSetOptions {
  symbol: string;
  collateral: number;
}

export interface IDerivCollateralLimitsOptions {
  symbol: string;
}

export interface ISubmitOrderOptions {
  type: IOrderTypeV2;
  symbol: string;
  amount: string;
  price?: string;
  lev?: number;
  price_trailing?: string;
  price_aux_limit?: string;
  price_oco_stop?: string;
  gid?: number;
  cid?: number;
  flags?: number;
  tif?: string;
  meta?: Record<string, unknown>;
}

export interface IUpdateOrderOptions {
  id: number;
  amount?: string;
  price?: string;
  cid?: number;
  cid_date?: string;
  gid?: number;
  flags?: number;
  lev?: number;
  delta?: string;
  price_aux_limit?: string;
  price_trailing?: string;
  tif?: string;
  meta?: Record<string, unknown>;
}

export interface ICancelOrderOptionsV2 {
  id?: number;
  cid?: number;
  cid_date?: string;
}

export interface ICancelOrdersMultipleOptions {
  id?: number[];
  gid?: number[];
  cid?: [number, string][];
  all?: 0 | 1;
}

export type IOrderMultiOp =
  | ["oc_multi", ICancelOrdersMultipleOptions]
  | ["oc", ICancelOrderOptionsV2]
  | ["on", ISubmitOrderOptions]
  | ["ou", IUpdateOrderOptions];

export interface IOrderMultiOptions {
  ops: IOrderMultiOp[];
}

export interface ISubmitFundingOfferOptions {
  type: IFundingOfferTypeV2;
  symbol: string;
  amount: string;
  rate: string;
  period: number;
  flags?: number;
}

export interface ICancelFundingOfferOptions {
  id: number;
}

export interface ICancelAllFundingOffersOptions {
  currency?: string;
}

export interface IFundingCloseOptions {
  id: number;
}

export interface IFundingAutoRenewOptions {
  status: 0 | 1;
  currency: string;
  amount?: string;
  rate?: string;
  period?: number;
}

export interface IKeepFundingOptions {
  type: "credit" | "loan";
  id?: number[];
  changes?: Record<string, unknown>;
}

export interface ISymbolPathHistoryOptions
  extends ISymbolOptionalOptions, IPaginationOptions {}

export interface IInfoMarginOptions {
  key: "base" | "sym_all" | (string & {});
}

export interface IInfoFundingOptions {
  key: string;
}

export interface ITransferOptionsV2 {
  from: IWalletTypeV2;
  to: IWalletTypeV2;
  currency: string;
  currency_to?: string;
  amount: string;
  email_dst?: string;
  user_id_dst?: number;
  tfaToken?: Record<string, unknown>;
}

export interface IDepositAddressOptions {
  wallet: IWalletTypeV2;
  method: string;
  op_renew?: 0 | 1;
}

export interface IDepositAddressAllOptions {
  method: string;
  page?: number;
  pageSize?: number;
}

export interface IDepositInvoiceOptions {
  wallet: IWalletTypeV2;
  currency: string;
  amount: string;
}

export interface ILnxInvoicePaymentsOptions {
  action: string;
  query: Record<string, unknown>;
}

export interface IWithdrawOptionsV2 {
  wallet: IWalletTypeV2;
  method: string;
  amount: string;
  address?: string;
  invoice?: string;
  payment_id?: string;
  fee_deduct?: 0 | 1;
  note?: string;
  travel_rule_tos?: boolean;
  vasp_did?: string;
  vasp_name?: string;
  beneficiary_self?: boolean;
  dest_firstname?: string;
  dest_lastname?: string;
  dest_corp_name?: string;
}

export interface IAlertSetOptions {
  type: "price";
  symbol: string;
  price: string;
  count?: number;
}

export interface IAlertDeleteOptions {
  symbol: string;
  price: string | number;
}

export interface ICalcOrderAvailOptions {
  symbol: string;
  type: string;
  dir?: 1 | -1;
  rate?: string;
  lev?: string;
}

export interface IUserSettingsReadOptions {
  keys: string[];
}

export interface IUserSettingsWriteOptions {
  settings: [string, unknown][];
}

export interface IUserSettingsDeleteOptions {
  keys: string[];
}

/** Token capability identifiers: `a`ccount, `o`rders, `f`unding, `s`ettings, `w`allets, `wd` (withdraw), `bp` (Bitfinex Pay). */
export type ITokenCap = "a" | "bp" | "f" | "o" | "s" | "w" | "wd";

export interface IGenerateTokenOptions {
  scope: string;
  ttl?: number;
  caps?: ITokenCap[];
  writePermission?: boolean;
  _cust_ip?: string;
}

export interface IThalexProviderOptions {
  provider: "thalex";
  amount: string;
  ccy: string;
  tfaToken: Record<string, unknown>;
}

export interface IThalexFreeTransferCountOptions {
  provider: "thalex";
}

/* -------------------------------------------------------------------------- */
/*  Specialized response shapes                                                */
/* -------------------------------------------------------------------------- */

export interface IIncreasePositionInfoV2 {
  max_pos: number;
  current_pos: number;
  base_currency_balance: number;
  tradable_balance_quote_currency: number;
  tradable_balance_quote_total: number;
  tradable_balance_base_currency: number;
  tradable_balance_base_total: number;
}

function decodeIncreasePositionInfo(
  row: readonly unknown[],
): IIncreasePositionInfoV2 {
  const pos = toRow(row[0]);
  const balance = toRow(row[1]);
  const tradable = toRow(balance[1]);
  return {
    max_pos: toNumber(pos[0]),
    current_pos: toNumber(pos[1]),
    base_currency_balance: toNumber(balance[0]),
    tradable_balance_quote_currency: toNumber(tradable[0]),
    tradable_balance_quote_total: toNumber(tradable[1]),
    tradable_balance_base_currency: toNumber(tradable[2]),
    tradable_balance_base_total: toNumber(tradable[3]),
  };
}

export interface IDerivCollateralLimits {
  min_collateral: number;
  max_collateral: number;
}

export interface IFundingAutoRenewStateV2 {
  currency: string;
  period: number;
  rate: number;
  threshold: number | null;
}

function decodeFundingAutoRenewState(raw: unknown): IFundingAutoRenewStateV2 {
  const row = toRow(raw);
  return {
    currency: toString(row[0]),
    period: toNumber(row[1]),
    rate: toNumber(row[2]),
    threshold: toNullableNumber(row[3]),
  };
}

export interface IThalexTransferV2 {
  type: string;
  addressDest: string;
  amount: string;
  ccy: string;
  createdAt: number;
  updatedAt: number;
  id: string;
  status: string;
  fee: string;
}

export interface IThalexFreeCounter {
  available: number;
  resetsAt: number | null;
}

export interface IThalexFreeTransferCountV2 {
  deposits: IThalexFreeCounter;
  withdrawals: IThalexFreeCounter;
}

/* -------------------------------------------------------------------------- */
/*  Client                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Build a strictly monotonic nonce generator anchored to `Date.now() * 1000`
 * (microsecond-resolution timestamp). When called multiple times within the
 * same millisecond — and across `Promise.all`/fast sequential usage — it
 * returns `last + 1` instead of repeating the same value, satisfying
 * Bitfinex's strictly-increasing-nonce requirement.
 */
export function createMonotonicNonce(): () => string {
  let last = 0n;
  return (): string => {
    const now = BigInt(Date.now()) * 1000n;
    last = now > last ? now : last + 1n;
    return last.toString();
  };
}

export class AuthenticatedClientV2 extends PublicClientV2 {
  readonly #key: string;
  readonly #secret: string;
  #nonce: () => string;

  public constructor({
    key,
    secret,
    url = ApiUrlV2Auth,
    nonce = createMonotonicNonce(),
    ...rest
  }: IAuthenticatedClientV2Options) {
    super({ url, ...rest });
    this.#key = key;
    this.#secret = secret;
    this.#nonce = nonce;
  }

  public set nonce(nonce: () => string) {
    this.#nonce = nonce;
  }

  public get nonce(): () => string {
    return this.#nonce;
  }

  public override async post<T = unknown>(
    path = "",
    init: IFetchOptions = {},
    body: Record<string, unknown> = {},
  ): Promise<T> {
    const url = new URL(path, this.base_url);
    const v2Path = url.pathname.replace(/^\/v2\//u, "");
    const nonce = this.#nonce();
    const bodyStr = JSON.stringify(body);
    const headers = signatureV2({
      key: this.#key,
      secret: this.#secret,
      path: v2Path,
      nonce,
      body: bodyStr,
    });
    return super.post<T>(
      path,
      { ...init, headers: { ...init.headers, ...headers } },
      body,
    );
  }

  /* ------------------------------ Wallets ------------------------------- */

  /** Returns an array of all the current user's wallets. */
  public async getWallets(): Promise<IWalletV2[]> {
    const rows = await this.post<unknown[][]>("auth/r/wallets");
    return toRows(rows).map(decodeWallet);
  }

  /* ------------------------------- Orders ------------------------------- */

  /** Retrieve active orders, optionally filtered by symbol. */
  public async getActiveOrders({
    symbol,
    ...rest
  }: IRetrieveOrdersOptions = {}): Promise<IOrderV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/orders"
        : `auth/r/orders/${symbol}`;
    const rows = await this.post<unknown[][]>(path, {}, { ...rest });
    return toRows(rows).map(decodeOrder);
  }

  /** Submit a new order. */
  public async submitOrder(
    body: ISubmitOrderOptions,
  ): Promise<INotificationV2<IOrderV2[]>> {
    const raw = await this.post<unknown[]>(
      "auth/w/order/submit",
      {},
      { ...body },
    );
    return decodeNotification(raw, decodeOrdersFlexible);
  }

  /** Update an existing order. */
  public async updateOrder(
    body: IUpdateOrderOptions,
  ): Promise<INotificationV2<IOrderV2>> {
    const raw = await this.post<unknown[]>(
      "auth/w/order/update",
      {},
      { ...body },
    );
    return decodeNotification(raw, (data) => decodeOrder(toRow(data)));
  }

  /** Cancel an order by id, cid, or cid+cid_date. */
  public async cancelOrder(
    body: ICancelOrderOptionsV2,
  ): Promise<INotificationV2<IOrderV2>> {
    const raw = await this.post<unknown[]>(
      "auth/w/order/cancel",
      {},
      { ...body },
    );
    return decodeNotification(raw, (data) => decodeOrder(toRow(data)));
  }

  /** Cancel multiple orders by id, gid, cid, or all flag. */
  public async cancelOrdersMultiple(
    body: ICancelOrdersMultipleOptions = {},
  ): Promise<INotificationV2<IOrderV2[]>> {
    const raw = await this.post<unknown[]>(
      "auth/w/order/cancel/multi",
      {},
      { ...body },
    );
    return decodeNotification(raw, decodeOrdersFlexible);
  }

  /**
   * Send multiple order operations in a single request.
   * Each operation is `[command, params]`.
   */
  public orderMulti(body: IOrderMultiOptions): Promise<unknown> {
    return this.post(
      "auth/w/order/multi",
      {},
      { ops: body.ops as unknown as Record<string, unknown>[] },
    );
  }

  /** Get orders history, optionally filtered by symbol. */
  public async getOrdersHistory({
    symbol,
    ...rest
  }: IOrdersHistoryOptions = {}): Promise<IOrderV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/orders/hist"
        : `auth/r/orders/${symbol}/hist`;
    const rows = await this.post<unknown[][]>(path, {}, { ...rest });
    return toRows(rows).map(decodeOrder);
  }

  /** Get trades executed for a specific order. */
  public async getOrderTrades({
    symbol,
    id,
  }: IOrderTradesOptions): Promise<IAuthTradeV2[]> {
    const rows = await this.post<unknown[][]>(
      `auth/r/order/${symbol}:${id}/trades`,
    );
    return toRows(rows).map(decodeTrade);
  }

  /** Get trades history, optionally filtered by symbol. */
  public async getTradesHistory({
    symbol,
    ...rest
  }: ITradesHistoryOptions = {}): Promise<IAuthTradeV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/trades/hist"
        : `auth/r/trades/${symbol}/hist`;
    const rows = await this.post<unknown[][]>(path, {}, { ...rest });
    return toRows(rows).map(decodeTrade);
  }

  /** Get OTC orders history (Symbol path segment is mandatory, may be a marker). */
  public async getOtcOrdersHistory({
    symbol = "ALL",
    ...rest
  }: IOtcOrdersHistoryOptions = {}): Promise<IOtcOrderV2[]> {
    const rows = await this.post<unknown[][]>(
      `auth/r/orders/otc/${symbol}/hist`,
      {},
      { ...rest },
    );
    return toRows(rows).map(decodeOtcOrder);
  }

  /* ------------------------------ Ledgers ------------------------------- */

  /** Get ledger entries, optionally filtered by currency. */
  public async getLedgers({ currency, ...rest }: ILedgersOptions = {}): Promise<
    ILedgerEntryV2[]
  > {
    const path =
      typeof currency === "undefined"
        ? "auth/r/ledgers/hist"
        : `auth/r/ledgers/${currency}/hist`;
    const rows = await this.post<unknown[][]>(path, {}, { ...rest });
    return toRows(rows).map(decodeLedgerEntry);
  }

  /* ------------------------------ Positions ----------------------------- */

  /** Get margin info for the given key ("base", "sym_all" or a symbol). */
  public async getMarginInfo({
    key,
  }: IInfoMarginOptions): Promise<IMarginInfoV2 | IMarginInfoV2[]> {
    const raw = await this.post(`auth/r/info/margin/${key}`);
    if (key === "sym_all" && Array.isArray(raw)) {
      return toRows(raw).map(decodeMarginInfo);
    }
    return decodeMarginInfo(toRow(raw));
  }

  /** Get active positions. */
  public async getPositions(): Promise<IPositionV2[]> {
    const rows = await this.post<unknown[][]>("auth/r/positions");
    return toRows(rows).map(decodePosition);
  }

  /** Claim a position. */
  public async claimPosition(
    body: IClaimPositionOptionsV2,
  ): Promise<INotificationV2<IPositionV2>> {
    const raw = await this.post<unknown[]>(
      "auth/w/position/claim",
      {},
      { ...body },
    );
    return decodeNotification(raw, (data) => decodePosition(toRow(data)));
  }

  /** Increase an active position. */
  public async increasePosition(
    body: IIncreasePositionOptions,
  ): Promise<INotificationV2<IPositionV2>> {
    const raw = await this.post<unknown[]>(
      "auth/w/position/increase",
      {},
      { ...body },
    );
    return decodeNotification(raw, (data) => decodePosition(toRow(data)));
  }

  /** Get info about increasing a position. */
  public async getIncreasePositionInfo(
    body: IIncreasePositionInfoOptions,
  ): Promise<IIncreasePositionInfoV2> {
    const raw = await this.post<unknown[]>(
      "auth/r/position/increase/info",
      {},
      { ...body },
    );
    return decodeIncreasePositionInfo(toRow(raw));
  }

  /** Get positions history. */
  public async getPositionsHistory(
    body: IPositionsHistoryOptions = {},
  ): Promise<IPositionV2[]> {
    const rows = await this.post<unknown[][]>(
      "auth/r/positions/hist",
      {},
      { ...body },
    );
    return toRows(rows).map(decodePosition);
  }

  /** Get positions snapshot. */
  public async getPositionsSnapshot(
    body: IPositionsSnapshotOptions = {},
  ): Promise<IPositionV2[]> {
    const rows = await this.post<unknown[][]>(
      "auth/r/positions/snap",
      {},
      { ...body },
    );
    return toRows(rows).map(decodePosition);
  }

  /** Audit positions by id list. */
  public async getPositionsAudit(
    body: IPositionsAuditOptions,
  ): Promise<IPositionV2[]> {
    const rows = await this.post<unknown[][]>(
      "auth/r/positions/audit",
      {},
      { ...body },
    );
    return toRows(rows).map(decodePosition);
  }

  /** Update position funding type (0 = daily, 1 = term). */
  public updatePositionFundingType(
    body: IUpdatePositionFundingTypeOptions,
  ): Promise<INotificationV2<null>> {
    return this.post<unknown[]>(
      "auth/w/position/update/funding/type",
      {},
      { ...body },
    ).then((raw) => decodeNotification(raw, () => null));
  }

  /** Set derivative position collateral. */
  public derivPositionCollateralSet(
    body: IDerivCollateralSetOptions,
  ): Promise<{ status: 0 | 1 }> {
    return this.post<unknown[][]>(
      "auth/w/deriv/collateral/set",
      {},
      { ...body },
    ).then((raw) => {
      const inner = toRow(toRow(raw)[0]);
      return { status: asFlag(inner[0]) };
    });
  }

  /** Get derivative position collateral limits. */
  public async derivPositionCollateralLimits(
    body: IDerivCollateralLimitsOptions,
  ): Promise<IDerivCollateralLimits> {
    const row = await this.post<unknown[]>(
      "auth/calc/deriv/collateral/limits",
      {},
      { ...body },
    );
    return {
      min_collateral: toNumber(row[0]),
      max_collateral: toNumber(row[1]),
    };
  }

  /* ------------------------------ Funding ------------------------------- */

  /** Get active funding offers, optionally filtered by symbol. */
  public async getFundingOffers({
    symbol,
  }: ISymbolOptionalOptions = {}): Promise<IFundingOfferV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/funding/offers"
        : `auth/r/funding/offers/${symbol}`;
    const rows = await this.post<unknown[][]>(path);
    return toRows(rows).map(decodeFundingOffer);
  }

  /** Submit a new funding offer. */
  public async submitFundingOffer(
    body: ISubmitFundingOfferOptions,
  ): Promise<INotificationV2<IFundingOfferV2>> {
    const raw = await this.post<unknown[]>(
      "auth/w/funding/offer/submit",
      {},
      { ...body },
    );
    return decodeNotification(raw, (data) => decodeFundingOffer(toRow(data)));
  }

  /** Cancel a funding offer. */
  public async cancelFundingOffer(
    body: ICancelFundingOfferOptions,
  ): Promise<INotificationV2<IFundingOfferV2>> {
    const raw = await this.post<unknown[]>(
      "auth/w/funding/offer/cancel",
      {},
      { ...body },
    );
    return decodeNotification(raw, (data) => decodeFundingOffer(toRow(data)));
  }

  /** Cancel all funding offers, optionally for a single currency. */
  public async cancelAllFundingOffers(
    body: ICancelAllFundingOffersOptions = {},
  ): Promise<INotificationV2<null>> {
    const raw = await this.post<unknown[]>(
      "auth/w/funding/offer/cancel/all",
      {},
      { ...body },
    );
    return decodeNotification(raw, () => null);
  }

  /** Close a funding loan/credit. */
  public async fundingClose(
    body: IFundingCloseOptions,
  ): Promise<INotificationV2<null>> {
    const raw = await this.post<unknown[]>(
      "auth/w/funding/close",
      {},
      { ...body },
    );
    return decodeNotification(raw, () => null);
  }

  /** Activate or deactivate funding auto-renew. */
  public async fundingAutoRenew(
    body: IFundingAutoRenewOptions,
  ): Promise<INotificationV2<IFundingAutoRenewStateV2 | null>> {
    const raw = await this.post<unknown[]>(
      "auth/w/funding/auto",
      {},
      { ...body },
    );
    return decodeNotification(raw, (data) => {
      if (data === null) {
        return null;
      }
      return decodeFundingAutoRenewState(data);
    });
  }

  /** Keep funding (credit/loan). */
  public async keepFunding(
    body: IKeepFundingOptions,
  ): Promise<INotificationV2<null>> {
    const raw = await this.post<unknown[]>(
      "auth/w/funding/keep",
      {},
      { ...body },
    );
    return decodeNotification(raw, () => null);
  }

  /** Funding offers history, optionally filtered by symbol. */
  public async getFundingOffersHistory({
    symbol,
    ...rest
  }: ISymbolPathHistoryOptions = {}): Promise<IFundingOfferV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/funding/offers/hist"
        : `auth/r/funding/offers/${symbol}/hist`;
    const rows = await this.post<unknown[][]>(path, {}, { ...rest });
    return toRows(rows).map(decodeFundingOffer);
  }

  /** Active funding loans, optionally filtered by symbol. */
  public async getFundingLoans({
    symbol,
  }: ISymbolOptionalOptions = {}): Promise<IFundingLoanV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/funding/loans"
        : `auth/r/funding/loans/${symbol}`;
    const rows = await this.post<unknown[][]>(path);
    return toRows(rows).map(decodeFundingLoan);
  }

  /** Funding loans history, optionally filtered by symbol. */
  public async getFundingLoansHistory({
    symbol,
    ...rest
  }: ISymbolPathHistoryOptions = {}): Promise<IFundingLoanV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/funding/loans/hist"
        : `auth/r/funding/loans/${symbol}/hist`;
    const rows = await this.post<unknown[][]>(path, {}, { ...rest });
    return toRows(rows).map(decodeFundingLoan);
  }

  /** Active funding credits, optionally filtered by symbol. */
  public async getFundingCredits({
    symbol,
  }: ISymbolOptionalOptions = {}): Promise<IFundingCreditV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/funding/credits"
        : `auth/r/funding/credits/${symbol}`;
    const rows = await this.post<unknown[][]>(path);
    return toRows(rows).map(decodeFundingCredit);
  }

  /** Funding credits history, optionally filtered by symbol. */
  public async getFundingCreditsHistory({
    symbol,
    ...rest
  }: ISymbolPathHistoryOptions = {}): Promise<IFundingCreditV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/funding/credits/hist"
        : `auth/r/funding/credits/${symbol}/hist`;
    const rows = await this.post<unknown[][]>(path, {}, { ...rest });
    return toRows(rows).map(decodeFundingCredit);
  }

  /** Funding trades history, optionally filtered by symbol. */
  public async getFundingTradesHistory({
    symbol,
    ...rest
  }: ISymbolPathHistoryOptions = {}): Promise<IFundingTradeAuthV2[]> {
    const path =
      typeof symbol === "undefined"
        ? "auth/r/funding/trades/hist"
        : `auth/r/funding/trades/${symbol}/hist`;
    const rows = await this.post<unknown[][]>(path, {}, { ...rest });
    return toRows(rows).map(decodeFundingTradeAuth);
  }

  /** Get funding info for a symbol. */
  public async getFundingInfo({
    key,
  }: IInfoFundingOptions): Promise<IFundingInfoV2> {
    const row = await this.post<unknown[]>(`auth/r/info/funding/${key}`);
    return decodeFundingInfo(toRow(row));
  }

  /* --------------------------- Account actions -------------------------- */

  /** Get user info. */
  public async getUserInfo(): Promise<IUserInfoV2> {
    const row = await this.post<unknown[]>("auth/r/info/user");
    return decodeUserInfo(toRow(row));
  }

  /** Get account summary (fees, volumes, LEO). */
  public async getSummary(): Promise<ISummaryV2> {
    const row = await this.post<unknown[]>("auth/r/summary");
    return decodeSummary(toRow(row));
  }

  /** Login history. */
  public async getLoginsHistory(
    body: IPaginationOptions = {},
  ): Promise<ILoginEntryV2[]> {
    const rows = await this.post<unknown[][]>(
      "auth/r/logins/hist",
      {},
      { ...body },
    );
    return toRows(rows).map(decodeLogin);
  }

  /** Get key permissions for the active API key. */
  public async getKeyPermissions(): Promise<IKeyPermissionV2[]> {
    const rows = await this.post<unknown[][]>("auth/r/permissions");
    return toRows(rows).map(decodeKeyPermission);
  }

  /** Generate a short-lived API token. */
  public async generateToken(body: IGenerateTokenOptions): Promise<string> {
    const row = await this.post<string[]>("auth/w/token", {}, { ...body });
    return toString(toRow(row)[0]);
  }

  /** Account changelog. */
  public async getAuditHistory(
    body: IPaginationOptions = {},
  ): Promise<IAuditLogV2[]> {
    const rows = await this.post<unknown[][]>(
      "auth/r/audit/hist",
      {},
      { ...body },
    );
    return toRows(rows).map(decodeAuditLog);
  }

  /** Transfer between wallets. */
  public async transfer(
    body: ITransferOptionsV2,
  ): Promise<INotificationV2<ITransferV2>> {
    const raw = await this.post<unknown[]>("auth/w/transfer", {}, { ...body });
    return decodeNotification(raw, decodeTransfer);
  }

  /** Get a deposit address. */
  public async getDepositAddress(
    body: IDepositAddressOptions,
  ): Promise<INotificationV2<IDepositAddressV2>> {
    const raw = await this.post<unknown[]>(
      "auth/w/deposit/address",
      {},
      { ...body },
    );
    return decodeNotification(raw, decodeDepositAddress);
  }

  /** List all deposit addresses for a method. */
  public async getDepositAddressAll(
    body: IDepositAddressAllOptions,
  ): Promise<IDepositAddressAllEntry[]> {
    const rows = await this.post<unknown[][]>(
      "auth/r/deposit/address/all",
      {},
      { ...body },
    );
    return toRows(rows).map(decodeDepositAddressAll);
  }

  /** Generate a deposit invoice (e.g. LNX). */
  public async generateDepositInvoice(
    body: IDepositInvoiceOptions,
  ): Promise<IDepositInvoiceV2> {
    const row = await this.post<unknown[]>(
      "auth/w/deposit/invoice",
      {},
      { ...body },
    );
    return decodeDepositInvoice(toRow(row));
  }

  /** Query LNX invoice payments (action-driven). */
  public lnxInvoicePayments(
    body: ILnxInvoicePaymentsOptions,
  ): Promise<unknown> {
    return this.post("auth/r/ext/invoice/payments", {}, { ...body });
  }

  /** Submit a withdrawal request. */
  public async withdraw(
    body: IWithdrawOptionsV2,
  ): Promise<INotificationV2<IWithdrawalV2>> {
    const raw = await this.post<unknown[]>("auth/w/withdraw", {}, { ...body });
    return decodeNotification(raw, decodeWithdrawal);
  }

  /** Movements (deposits/withdrawals), optionally filtered by currency. */
  public async getMovements({
    currency,
    ...rest
  }: IMovementsOptions = {}): Promise<IMovementV2[]> {
    const path =
      typeof currency === "undefined"
        ? "auth/r/movements/hist"
        : `auth/r/movements/${currency}/hist`;
    const rows = await this.post<unknown[][]>(path, {}, { ...rest });
    return toRows(rows).map(decodeMovement);
  }

  /** Detailed movement info by id. */
  public async getMovementInfo(
    body: IMovementInfoOptions,
  ): Promise<IMovementInfoV2> {
    const row = await this.post<unknown[]>(
      "auth/r/movements/info",
      {},
      { ...body },
    );
    return decodeMovementInfo(toRow(row));
  }

  /** List all active price alerts. */
  public async getAlerts(): Promise<IAlertV2[]> {
    const rows = await this.post<unknown[][]>("auth/r/alerts");
    return toRows(rows).map(decodeAlert);
  }

  /** Set a price alert. */
  public async setAlert(body: IAlertSetOptions): Promise<IAlertV2> {
    const row = await this.post<unknown[]>("auth/w/alert/set", {}, { ...body });
    return decodeAlert(toRow(row));
  }

  /** Delete a price alert. */
  public async deleteAlert({
    symbol,
    price,
  }: IAlertDeleteOptions): Promise<boolean> {
    const row = await this.post<unknown[]>(
      `auth/w/alert/price:${symbol}:${price}/del`,
    );
    return toRow(row)[0] === true;
  }

  /** Calculate balance available for orders/offers. */
  public async getCalcOrderAvailable(
    body: ICalcOrderAvailOptions,
  ): Promise<number> {
    const row = await this.post<unknown[]>(
      "auth/calc/order/avail",
      {},
      { ...body },
    );
    return toNumber(toRow(row)[0]);
  }

  /** Read user settings by keys. */
  public async getUserSettings(
    body: IUserSettingsReadOptions,
  ): Promise<IUserSettingEntry[]> {
    const rows = await this.post<unknown[][]>(
      "auth/r/settings",
      {},
      { ...body },
    );
    return toRows(rows).map(decodeUserSetting);
  }

  /**
   * Write user settings. Each entry is `[key, value]`; the API expects them
   * inside a `{settings: [...]}` wrapper.
   */
  public setUserSettings(
    body: IUserSettingsWriteOptions,
  ): Promise<INotificationV2<readonly unknown[]>> {
    return this.post<unknown[]>(
      "auth/w/settings/set",
      {},
      { settings: body.settings as unknown as Record<string, unknown>[] },
    ).then((raw) => decodeNotification(raw, (data) => toRow(data)));
  }

  /** Delete user settings by keys. */
  public deleteUserSettings(
    body: IUserSettingsDeleteOptions,
  ): Promise<INotificationV2<readonly unknown[]>> {
    return this.post<unknown[]>("auth/w/settings/del", {}, { ...body }).then(
      (raw) => decodeNotification(raw, (data) => toRow(data)),
    );
  }

  /* ----------------------------- Thalex -------------------------------- */

  /** Submit a Thalex deposit request. */
  public thalexDeposit(
    body: IThalexProviderOptions,
  ): Promise<IThalexTransferV2> {
    return this.post<IThalexTransferV2>(
      "auth/w/ext/wallets/deposits/request",
      {},
      { ...body },
    );
  }

  /** Submit a Thalex withdrawal request. */
  public thalexWithdrawal(
    body: IThalexProviderOptions,
  ): Promise<IThalexTransferV2> {
    return this.post<IThalexTransferV2>(
      "auth/w/ext/wallets/withdrawals/request",
      {},
      { ...body },
    );
  }

  /**
   * Get Thalex free transfer counts (deposits/withdrawals).
   *
   * Unlike the deposit/withdrawal endpoints (lowercase `provider`), the docs
   * specify this endpoint's body key as capitalized `Provider`; the lowercase
   * option is mapped accordingly.
   */
  public thalexFreeTransferCount({
    provider,
  }: IThalexFreeTransferCountOptions): Promise<IThalexFreeTransferCountV2> {
    return this.post<IThalexFreeTransferCountV2>(
      "auth/r/ext/wallets/transfers/free/count",
      {},
      { Provider: provider },
    );
  }
}
