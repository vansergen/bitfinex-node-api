import { type IFetchOptions } from "rpc-request";
import {
  type IPublicClientOptions,
  PublicClient,
  type ISymbolOptions,
} from "./public.js";
import { signature } from "./signature.js";

export const AffCode = "rX7Hc9_O2";

export type IWalletType = "deposit" | "exchange" | "trading";

export type IOrderType =
  | "exchange fill-or-kill"
  | "exchange limit"
  | "exchange market"
  | "exchange stop-limit"
  | "exchange stop"
  | "exchange trailing-stop"
  | "fill-or-kill"
  | "limit"
  | "market"
  | "stop-limit"
  | "stop"
  | "trailing-stop";

export type IOrderSide = "buy" | "sell";

export interface IDepositOptions {
  method: string;
  wallet_name: IWalletType;
  renew?: 0 | 1;
}

export interface ITransferOptions {
  amount: string;
  currency?: string;
  walletfrom: IWalletType;
  walletto: IWalletType;
}

export interface IWithdrawOptions {
  withdraw_type: string;
  walletselected: IWalletType;
  amount: string;
  address?: string;
  currency?: string;
  payment_id?: string;
  account_name?: string;
  account_number?: string;
  swift?: string;
  bank_name?: string;
  bank_address?: string;
  bank_city?: string;
  bank_country?: string;
  detail_payment?: string;
  expressWire?: 0 | 1;
  intermediary_bank_name?: string;
  intermediary_bank_address?: string;
  intermediary_bank_city?: string;
  intermediary_bank_country?: string;
  intermediary_bank_account?: string;
  intermediary_bank_swift?: string;
}

export interface IOrderOptions extends ISymbolOptions {
  amount: string;
  price: string;
  side: IOrderSide;
  type: IOrderType;
  exchange?: "bitfinex";
  is_hidden?: boolean;
  is_postonly?: boolean;
  use_all_available?: 0 | 1;
  ocoorder?: boolean;
  buy_price_oco?: string;
  sell_price_oco?: string;
  lev?: number;
}

export interface IReplaceOrderOptions extends IOrderOptions {
  order_id: number;
  use_remaining?: boolean;
}

export interface ICancelOrderOptions {
  order_id: number;
}

export interface ICancelOrdersOptions {
  order_ids: number[];
}

export interface IOrderStatusOptions {
  order_id: number;
}

export interface IOrderHistoryOptions {
  limit?: number;
}

export interface IBalanceHistoryOptions {
  currency: string;
  wallet?: IWalletType;
  since?: string;
  until?: string;
  limit?: number;
}

export interface IDepositsWithdrawalsOptions {
  currency: string;
  method?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface IPastTradesOptions extends ISymbolOptions {
  timestamp?: string;
  until?: string;
  limit_trades?: number;
  reverse?: 0 | 1;
}

export interface INewOfferOptions {
  currency: string;
  amount: string;
  rate: string;
  period: number;
  direction: "lend" | "loan";
}

export interface ICancelOfferOptions {
  offer_id: number;
}

export interface IOfferStatusOptions {
  offer_id: number;
}

export interface IClaimPositionOptions {
  position_id: number;
  amount?: string;
}

export interface IFundingTradesOptions {
  symbol: string;
  until?: string;
  limit_trades?: number;
}

export interface ICloseFundingOptions {
  swap_id: number;
}

export interface IClosePositionOptions {
  position_id: number;
}

export type IAccountInfo = [
  {
    leo_fee_disc_c2c: string;
    leo_fee_disc_c2s: string;
    leo_fee_disc_c2f: number;
    maker_fees: string;
    taker_fees: string;
    fees: { pairs: string; maker_fees: string; taker_fees: string }[];
  },
];

export interface IAccountFees {
  withdraw: Record<string, string>;
}

export interface ISummary {
  time: string;
  status: { resid_hint: null };
  is_locked: boolean;
  trade_vol_30d: {
    curr: string;
    vol: number;
    vol_maker: number;
    vol_BFX: number;
    vol_BFX_maker: number;
  }[];
  fees_funding_30d: Record<string, never>;
  fees_funding_total_30d: number;
  fees_trading_30d: Record<string, never>;
  fees_trading_total_30d: number;
  maker_fee: number;
  taker_fee: number;
  deriv_maker_rebate: number;
  deriv_taker_fee: number;
}

export interface IDepositAddress {
  result: string;
  method: string;
  currency: string;
  address: string;
}

export interface IKeyPermission {
  read: boolean;
  write: boolean;
}

export interface IKeyPermissions {
  account: IKeyPermission;
  history: IKeyPermission;
  orders: IKeyPermission;
  positions: IKeyPermission;
  funding: IKeyPermission;
  wallets: IKeyPermission;
  withdraw: IKeyPermission;
}

export interface IMarginLimit {
  on_pair: string;
  initial_margin: string;
  margin_requirement: string;
  tradable_balance: string;
}

export interface IMarginInformation {
  margin_balance: string;
  tradable_balance: string;
  unrealized_pl: string;
  unrealized_swap: string;
  net_value: string;
  required_margin: string;
  leverage: string;
  margin_requirement: string;
  margin_limits: IMarginLimit[];
  message: string;
}

export interface IWalletBalance {
  type: IWalletType;
  currency: string;
  amount: string;
  available: string;
}

export type ITransferResponse = [
  { status: "error" | "success"; message: string },
];

export type IWithdrawResponse = [
  {
    status: "error" | "success";
    message: string;
    withdrawal_id: number;
    wallettype?: IWalletType;
    method?: string;
    address?: string;
    invoice?: number | null;
    payment_id?: number | null;
    amount?: string;
    fees?: string;
  },
];

export interface IOrderResponse {
  id: number;
  cid: number;
  cid_date: string;
  gid: number | string | null;
  symbol: string;
  exchange: "bitfinex";
  price: string;
  avg_execution_price: string;
  side: IOrderSide;
  type: IOrderType;
  timestamp: string;
  oco_order?: 0 | 1 | boolean | null;
  is_live: boolean;
  is_cancelled: boolean;
  is_hidden: 0 | 1 | boolean;
  was_forced: boolean;
  original_amount: string;
  remaining_amount: string;
  executed_amount: string;
  order_id?: number;
  src?: string;
  meta?: Record<string, unknown>;
}

export interface INewOrdersResponse {
  order_ids: IOrderResponse[];
  status: string;
}

export interface IPosition {
  id: number;
  symbol: string;
  status: string;
  base: string;
  amount: string;
  timestamp: string;
  swap: string;
  pl: string;
}

export interface IHistoryBalance {
  currency: string;
  amount: string;
  balance: string;
  description: string;
  timestamp: string;
}

export type IDepositWithdrawalStatus =
  | "APPROVED"
  | "CANCELED"
  | "COMPLETED"
  | "PENDING CANCELLATION"
  | "PENDING"
  | "POSTPENDING"
  | "PROCESSING"
  | "SENDING"
  | "UNCOMFIRMED"
  | "USER APPROVED"
  | "USER EMAILED";

export interface IDepositWithdrawal {
  id: number;
  txid: number;
  currency: string;
  method: string;
  type: string;
  amount: string;
  description: string;
  address: string;
  status: IDepositWithdrawalStatus;
  timestamp: string;
  timestamp_created: string;
  fee: number;
}

export interface IPastTrade {
  price: string;
  amount: string;
  timestamp: string;
  type: "Buy" | "Sell";
  fee_currency: string;
  fee_amount: string;
  tid: number;
  order_id: number;
}

export interface IOffer {
  id: number;
  currency: string;
  rate: string;
  period: number;
  direction: "lend" | "loan";
  timestamp: string;
  is_live: boolean;
  is_cancelled: boolean;
  original_amount: string;
  remaining_amount: string;
  executed_amount: string;
  offer_id?: number;
}

export interface ICredit {
  id: number;
  currency: string;
  status: string;
  rate: string;
  period: number;
  amount: string;
  timestamp: string;
}

export interface IFundingTrade {
  rate: string;
  period: number;
  amount: string;
  timestamp: string;
  type: "Buy" | "Sell";
  tid: number;
  offer_id: number;
}

export interface ITakenFund {
  id: number;
  position_id: number;
  currency: string;
  rate: string;
  period: number;
  amount: string;
  timestamp: string;
  auto_close: boolean;
}

export interface ITotalFund {
  position_pair: string;
  total_swaps: string;
}

export interface IClosePositionResponse {
  message: string;
  order: {
    id: number;
    type: "MARKET";
    pair: string;
    status: string;
    created_at: string;
    updated_at: string;
    user_id: number;
    amount: string;
    price: null;
    originalamount: string;
    routing: string;
    lockedperiod: null;
    trailingprice: string;
    hidden: boolean;
    vir: number;
    maxrate: string;
    placed_id: null;
    placed_trades: null;
    nopayback: null;
    avg_price: string;
    active: number;
    fiat_currency: null;
    cid: null;
    cid_date: null;
    mseq: number;
    gid: null;
    flags: number;
    price_aux_limit: string;
    type_prev: null;
    tif: null;
    v_pair: string;
    meta: null;
    liq_stage: null;
    pos_id: null;
  };
  position: {
    id: number;
    pair: string;
    status: string;
    user_id: number;
    created_at: string;
    updated_at: string;
    amount: string;
    base: string;
    swap: string;
    noliquidation: null;
    period: null;
    vir: number;
    maxrate: string;
    swap_type: number;
    active: number;
    type: number;
    lev: number;
    stage: number;
    collateral: string;
    meta?: string;
  };
}

export interface IAuthenticatedClientOptions extends IPublicClientOptions {
  key: string;
  secret: string;
  nonce?: (() => string) | undefined;
}

export class AuthenticatedClient extends PublicClient {
  readonly #key: string;
  readonly #secret: string;
  #nonce: () => string;

  public constructor({
    key,
    secret,
    nonce = (): string => `${Date.now()}`,
    ...rest
  }: IAuthenticatedClientOptions) {
    super(rest);
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

  public post<T = unknown>(
    path = "",
    init: IFetchOptions = {},
    body: Record<string, unknown> = {},
  ): Promise<T> {
    const request = new URL(path, this.base_url).pathname;
    const data = JSON.stringify({ ...body, request, nonce: this.#nonce() });
    const payload = Buffer.from(data).toString("base64");
    const headers = signature({
      key: this.#key,
      secret: this.#secret,
      payload,
    });

    return super.post<T>(request, {
      ...init,
      body: data,
      headers: {
        ...init.headers,
        ...headers,
        "Content-Type": "application/json",
      },
    });
  }

  /** Return information about your account (trading fees). */
  public getAccountInfo(): Promise<IAccountInfo> {
    return this.post<IAccountInfo>("/v1/account_infos");
  }

  /** Return the fees applied to your withdrawals. */
  public getAccountFees(): Promise<IAccountFees> {
    return this.post<IAccountFees>("/v1/account_fees");
  }

  /** Return a 30-day summary of your trading volume and return on margin funding. */
  public getSummary(): Promise<ISummary> {
    return this.post<ISummary>("/v1/summary");
  }

  /** Return your deposit address to make a new deposit. */
  public getDepositAddress(body: IDepositOptions): Promise<IDepositAddress> {
    return this.post<IDepositAddress>("/v1/deposit/new", {}, { ...body });
  }

  /** Return the permissions of the key being used to generate this request. */
  public getKeyPermissions(): Promise<IKeyPermissions> {
    return this.post<IKeyPermissions>("/v1/key_info");
  }

  /** Return the trading wallet information for margin trading. */
  public getMarginInformation(): Promise<IMarginInformation[]> {
    return this.post<IMarginInformation[]>("/v1/margin_infos");
  }

  /** Return your balances. */
  public getWalletBalances(): Promise<IWalletBalance[]> {
    return this.post<IWalletBalance[]>("/v1/balances");
  }

  /** Move available balances between your wallets. */
  public transfer({
    currency = this.currency,
    ...rest
  }: ITransferOptions): Promise<ITransferResponse> {
    return this.post<ITransferResponse>(
      "/v1/transfer",
      {},
      { currency, ...rest },
    );
  }

  /** Request a withdrawal from one of your wallet. */
  public withdraw(body: IWithdrawOptions): Promise<IWithdrawResponse> {
    return this.post<IWithdrawResponse>("/v1/withdraw", {}, { ...body });
  }

  /** Submit a new Order. */
  public newOrder({
    symbol = this.symbol,
    ...rest
  }: IOrderOptions): Promise<IOrderResponse> {
    return this.post<IOrderResponse>(
      "/v1/order/new",
      {},
      { symbol, ...rest, aff_code: AffCode },
    );
  }

  /** Submit several new orders at once. */
  public newOrders({
    orders,
  }: {
    orders: IOrderOptions[];
  }): Promise<INewOrdersResponse> {
    const data = orders.map((order) => ({
      symbol: this.symbol,
      ...order,
    }));
    return this.post<INewOrdersResponse>(
      "/v1/order/new/multi",
      {},
      { orders: data },
    );
  }

  /** Cancel an order. */
  public cancelOrder(body: ICancelOrderOptions): Promise<IOrderResponse> {
    return this.post<IOrderResponse>("/v1/order/cancel", {}, { ...body });
  }

  /** Cancel multiples orders at once. */
  public cancelOrders(body: ICancelOrdersOptions): Promise<{ result: string }> {
    return this.post<{ result: string }>(
      "/v1/order/cancel/multi",
      {},
      { ...body },
    );
  }

  /** Cancel all active orders at once. */
  public cancelAllOrders(): Promise<{ result: string }> {
    return this.post<{ result: string }>("/v1/order/cancel/all");
  }

  /** Replace an order with a new one. */
  public replaceOrder({
    symbol = this.symbol,
    ...rest
  }: IReplaceOrderOptions): Promise<IOrderResponse> {
    return this.post<IOrderResponse>(
      "/v1/order/cancel/replace",
      {},
      { symbol, ...rest, aff_code: AffCode },
    );
  }

  /** Get the status of an order. */
  public getOrder(body: IOrderStatusOptions): Promise<IOrderResponse> {
    return this.post<IOrderResponse>("/v1/order/status", {}, { ...body });
  }

  /** Get your active orders. */
  public getOrders(): Promise<IOrderResponse[]> {
    return this.post<IOrderResponse[]>("/v1/orders");
  }

  /** Get your latest inactive orders. */
  public getOrderHistory(
    body: IOrderHistoryOptions = {},
  ): Promise<IOrderResponse[]> {
    return this.post<IOrderResponse[]>("/v1/orders/hist", {}, { ...body });
  }

  /** Get your active positions. */
  public getPositions(): Promise<IPosition[]> {
    return this.post<IPosition[]>("/v1/positions");
  }

  /** Claim your position. */
  public claimPosition(body: IClaimPositionOptions): Promise<IPosition> {
    return this.post<IPosition>("/v1/position/claim", {}, { ...body });
  }

  /** Get balance ledger entries. */
  public getBalanceHistory(
    body: IBalanceHistoryOptions,
  ): Promise<IHistoryBalance[]> {
    return this.post<IHistoryBalance[]>("/v1/history", {}, { ...body });
  }

  /** Get past deposits/withdrawals. */
  public getDepositsWithdrawals(
    body: IDepositsWithdrawalsOptions,
  ): Promise<IDepositWithdrawal[]> {
    return this.post<IDepositWithdrawal[]>(
      "/v1/history/movements",
      {},
      { ...body },
    );
  }

  /** Get past trades. */
  public getPastTrades({
    symbol = this.symbol,
    ...rest
  }: IPastTradesOptions = {}): Promise<IPastTrade[]> {
    return this.post<IPastTrade[]>("/v1/mytrades", {}, { ...rest, symbol });
  }

  /** Submit a new offer. */
  public newOffer(body: INewOfferOptions): Promise<IOffer> {
    return this.post<IOffer>("/v1/offer/new", {}, { ...body });
  }

  /** Cancel an offer. */
  public cancelOffer(body: ICancelOfferOptions): Promise<IOffer> {
    return this.post<IOffer>("/v1/offer/cancel", {}, { ...body });
  }

  /** Get the status of an offer. */
  public offerStatus(body: IOfferStatusOptions): Promise<IOffer> {
    return this.post<IOffer>("/v1/offer/status", {}, { ...body });
  }

  /** Get the funds currently taken. */
  public activeCredits(): Promise<ICredit[]> {
    return this.post<ICredit[]>("/v1/credits");
  }

  /** Get active offers. */
  public getOffers(): Promise<IOffer[]> {
    return this.post<IOffer[]>("/v1/offers");
  }

  /** Get latest inactive offers. */
  public offersHistory(body: IOrderHistoryOptions = {}): Promise<IOffer[]> {
    return this.post<IOffer[]>("/v1/offers/hist", {}, { ...body });
  }

  /** Get past funding trades. */
  public getFundingTrades(
    body: IFundingTradesOptions,
  ): Promise<IFundingTrade[]> {
    return this.post<IFundingTrade[]>("/v1/mytrades_funding", {}, { ...body });
  }

  /** Get funds used in a margin position. */
  public getTakenFunds(): Promise<ITakenFund[]> {
    return this.post<ITakenFund[]>("/v1/taken_funds");
  }

  /** Get borrowed funds and not used in a margin position. */
  public getUnusedFunds(): Promise<ITakenFund[]> {
    return this.post<ITakenFund[]>("/v1/unused_taken_funds");
  }

  /** Get the total of active funding used in positions. */
  public getTotalFunds(): Promise<ITotalFund[]> {
    return this.post<ITotalFund[]>("/v1/total_taken_funds");
  }

  /** Close a taken funding. */
  public closeFunding(body: ICloseFundingOptions): Promise<ITakenFund> {
    return this.post<ITakenFund>("/v1/funding/close", {}, { ...body });
  }

  /** Close the position with a market order. */
  public closePosition(
    body: IClosePositionOptions,
  ): Promise<IClosePositionResponse> {
    return this.post<IClosePositionResponse>(
      "/v1/position/close",
      {},
      { ...body },
    );
  }
}
