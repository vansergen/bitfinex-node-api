import { PublicClient1, PublicClient1Params, Currency, Symb } from "./public1";
import { Signer } from "./signer";
import type { RequestInit } from "node-fetch";

export const aff_code = "rX7Hc9_O2";

export interface DepositParams {
  method: string;
  wallet_name: "trading" | "exchange" | "deposit";
  renew?: 0 | 1;
}

export interface TransferParams extends Currency {
  amount: string;
  walletfrom: "trading" | "deposit" | "exchange";
  walletto: "trading" | "deposit" | "exchange";
}

export interface WithdrawParams {
  withdraw_type: string;
  walletselected: "trading" | "exchange" | "deposit";
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

export interface OrderHistoryParams {
  limit?: number;
}

export interface BalanceHistoryParams {
  currency: string;
  wallet?: "trading" | "exchange" | "deposit";
  since?: string;
  until?: string;
  limit?: number;
}

export interface DepositsWithdrawalsParams {
  currency: string;
  method?: "bitcoin" | "litecoin" | "darkcoin" | "wire";
  since?: string;
  until?: string;
  limit?: number;
}

export interface PastTradesParams {
  symbol?: string;
  timestamp?: string;
  until?: string;
  limit_trades?: number;
  reverse?: number;
}

export interface NewOfferParams {
  currency: string;
  amount: string;
  rate: string;
  period: number;
  direction: "lend" | "loan";
}

export interface ClaimParams {
  position_id: number;
  amount?: string;
}

export type OrderType =
  | "market"
  | "limit"
  | "stop"
  | "trailing-stop"
  | "fill-or-kill"
  | "exchange market"
  | "exchange limit"
  | "exchange stop"
  | "exchange trailing-stop"
  | "exchange fill-or-kill";

export interface OrderParams extends Symb {
  amount: string;
  price: string;
  side: "buy" | "sell";
  type: OrderType;
  exchange?: "bitfinex";
  is_hidden?: boolean;
  is_postonly?: boolean;
  use_all_available?: 0 | 1;
  ocoorder?: boolean;
  buy_price_oco?: string;
  sell_price_oco?: string;
  lev?: number;
}

export interface OrdersParams {
  orders: OrderParams[];
}

export interface ReplaceOrderParams extends Symb {
  order_id: number;
  amount: string;
  price?: string;
  exchange: "bitfinex";
  side: "buy" | "sell";
  type: OrderType;
  is_hidden?: boolean;
  is_postonly?: boolean;
  use_remaining?: boolean;
  lev?: number;
}

export type AccountInfo = [
  {
    leo_fee_disc_c2c: string;
    leo_fee_disc_c2s: string;
    leo_fee_disc_c2f: number;
    maker_fees: string;
    taker_fees: string;
    fees: { pairs: string; maker_fees: string; taker_fees: string }[];
  }
];

export interface AccountFees {
  withdraw: { [currency: string]: string };
}

export interface Summary {
  time: string;
  status: { resid_hint: null };
  is_locked: boolean;
  trade_vol_30d: [
    {
      curr: string;
      vol: number;
      vol_maker: number;
      vol_BFX: number;
      vol_BFX_maker: number;
    }
  ];
  fees_funding_30d: Record<string, never>;
  fees_funding_total_30d: number;
  fees_trading_30d: Record<string, never>;
  fees_trading_total_30d: number;
  maker_fee: number;
  taker_fee: number;
  deriv_maker_rebate: number;
  deriv_taker_fee: number;
}

export interface DepositAddress {
  result: string;
  method: string;
  currency: string;
  address: string;
}

export interface KeyPermission {
  read: boolean;
  write: boolean;
}

export interface KeyPermissions {
  account: KeyPermission;
  history: KeyPermission;
  orders: KeyPermission;
  positions: KeyPermission;
  funding: KeyPermission;
  wallets: KeyPermission;
  withdraw: KeyPermission;
}

export interface MarginInformation {
  margin_balance: string;
  tradable_balance: string;
  unrealized_pl: string;
  unrealized_swap: string;
  net_value: string;
  required_margin: string;
  leverage: string;
  margin_requirement: string;
  margin_limits: {
    on_pair: string;
    initial_margin: string;
    margin_requirement: string;
    tradable_balance: string;
  }[];
  message: string;
}

export interface WalletBalance {
  type: "trading" | "deposit" | "exchange";
  currency: string;
  amount: string;
  available: string;
}

export type TransferResponse = [
  { status: "error" | "success"; message: string }
];

export type WithdrawResponse = [
  {
    status: "error" | "success";
    message: string;
    withdrawal_id: number;
    wallettype?: "trading" | "deposit" | "exchange";
    method?: string;
    address?: string;
    invoice?: null | number;
    payment_id?: null | number;
    amount?: string;
    fees?: string;
  }
];

export interface OrderResponse {
  id: number;
  cid: number;
  cid_date: string;
  gid: null | number | string;
  symbol: string;
  exchange: "bitfinex";
  price: string;
  avg_execution_price: string;
  side: "buy" | "sell";
  type: OrderType;
  timestamp: string;
  oco_order?: boolean | null | 0 | 1;
  is_live: boolean;
  is_cancelled: boolean;
  is_hidden: boolean | 0 | 1;
  was_forced: boolean;
  original_amount: string;
  remaining_amount: string;
  executed_amount: string;
  order_id?: number;
  src?: string;
  meta?: Record<string, unknown>;
}

export interface NewOrdersResponse {
  order_ids: OrderResponse[];
  status: string;
}

export interface Position {
  id: number;
  symbol: string;
  status: string;
  base: string;
  amount: string;
  timestamp: string;
  swap: string;
  pl: string;
}

export interface HistoryBalance {
  currency: string;
  amount: string;
  balance: string;
  description: string;
  timestamp: string;
}

export interface DepositWithdrawal {
  id: number;
  txid: number;
  currency: string;
  method: string;
  type: string;
  amount: string;
  description: string;
  address: string;
  status:
    | "SENDING"
    | "PROCESSING"
    | "PENDING"
    | "POSTPENDING"
    | "COMPLETED"
    | "USER EMAILED"
    | "APPROVED"
    | "USER APPROVED"
    | "CANCELED"
    | "PENDING CANCELLATION"
    | "UNCOMFIRMED";
  timestamp: string;
  timestamp_created: string;
  fee: number;
}

export interface PastTrade {
  price: string;
  amount: string;
  timestamp: string;
  type: "Buy" | "Sell";
  fee_currency: string;
  fee_amount: string;
  tid: number;
  order_id: number;
}

export interface Offer {
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
  offer_id: number;
}

export interface AuthenticatedClient1Options extends PublicClient1Params {
  key: string;
  secret: string;
}

export class AuthenticatedClient1 extends PublicClient1 {
  readonly #key: string;
  readonly #secret: string;
  #nonce: () => number;

  public constructor({ key, secret, ...rest }: AuthenticatedClient1Options) {
    super(rest);
    this.#key = key;
    this.#secret = secret;
    this.#nonce = (): number => Date.now();
  }

  public async post(
    path: string,
    _options?: RequestInit | undefined,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    const data = { ...params, nonce: `${this.#nonce()}`, request: path };
    const body = JSON.stringify(data);
    const payload = Buffer.from(body).toString("base64");
    const headers = Signer({ key: this.#key, secret: this.#secret, payload });
    const response = await super.post(path, { ..._options, body, headers });
    return response;
  }

  /**
   * Return information about your account (trading fees).
   */
  public async getAccountInfo(): Promise<AccountInfo> {
    const request = "/v1/account_infos";
    const info = (await this.post(request)) as AccountInfo;
    return info;
  }

  /**
   * Return the fees applied to your withdrawals.
   */
  public async getAccountFees(): Promise<AccountFees> {
    const request = "/v1/account_fees";
    const fees = (await this.post(request)) as AccountFees;
    return fees;
  }

  /**
   * Returns a 30-day summary of your trading volume and return on margin funding.
   */
  public async getSummary(): Promise<Summary> {
    const request = "/v1/summary";
    const summary = (await this.post(request)) as Summary;
    return summary;
  }

  /**
   * Returns your deposit address to make a new deposit.
   */
  public async getDepositAddress(body: DepositParams): Promise<DepositAddress> {
    const request = "/v1/deposit/new";
    const data = { ...body };
    const address = (await this.post(request, {}, data)) as DepositAddress;
    return address;
  }

  /**
   * Returns the permissions of the key being used to generate this request.
   */
  public async getKeyPermissions(): Promise<KeyPermissions> {
    const request = "/v1/key_info";
    const permissions = (await this.post(request)) as KeyPermissions;
    return permissions;
  }

  /**
   * Returns the trading wallet information for margin trading.
   */
  public async getMarginInformation(): Promise<MarginInformation> {
    const request = "/v1/margin_infos";
    const info = (await this.post(request)) as MarginInformation;
    return info;
  }

  /**
   * Returns your balances.
   */
  public async getWalletBalances(): Promise<WalletBalance[]> {
    const request = "/v1/balances";
    const balances = (await this.post(request)) as WalletBalance[];
    return balances;
  }

  /**
   * Move available balances between your wallets.
   */
  public async transfer({
    currency = this.currency,
    ...rest
  }: TransferParams): Promise<TransferResponse> {
    const request = "/v1/transfer";
    const data = { currency, ...rest };
    const response = (await this.post(request, {}, data)) as TransferResponse;
    return response;
  }

  /**
   * Request a withdrawal from one of your wallet.
   */
  public async withdraw(body: WithdrawParams): Promise<WithdrawResponse> {
    const request = "/v1/withdraw";
    const data = { ...body };
    const response = (await this.post(request, {}, data)) as WithdrawResponse;
    return response;
  }

  /**
   * Submit a new Order, can be used to create margin, exchange, and derivative orders.
   */
  public async newOrder({
    symbol = this.symbol,
    ...rest
  }: OrderParams): Promise<OrderResponse> {
    const request = "/v1/order/new";
    const data = { symbol, ...rest, aff_code };
    const response = (await this.post(request, {}, data)) as OrderResponse;
    return response;
  }

  /**
   * Submit several new orders at once, can be used to create margin, exchange, and derivative orders.
   */
  public async newOrders({ orders }: OrdersParams): Promise<NewOrdersResponse> {
    for (const order of orders) {
      if (!order.symbol) {
        order.symbol = this.symbol;
      }
    }
    const request = "/v1/order/new/multi";
    const data = { orders };
    const response = (await this.post(request, {}, data)) as NewOrdersResponse;
    return response;
  }

  /**
   * Cancel an order.
   */
  public async cancelOrder(body: { order_id: number }): Promise<OrderResponse> {
    const request = "/v1/order/cancel";
    const data = { ...body };
    const response = (await this.post(request, {}, data)) as OrderResponse;
    return response;
  }

  /**
   * Cancel multiples orders at once.
   */
  public async cancelOrders(body: {
    order_ids: number[];
  }): Promise<{ result: string }> {
    const request = "/v1/order/cancel/multi";
    const data = { ...body };
    const response = (await this.post(request, {}, data)) as { result: string };
    return response;
  }

  /**
   * Cancel all active orders at once.
   */
  public async cancelAllOrders(): Promise<{ result: string }> {
    const request = "/v1/order/cancel/all";
    const response = (await this.post(request, {})) as { result: string };
    return response;
  }

  /**
   * Replace an order with a new one. Can be used to replace an order with a new margin, exchange, or derivative order.
   */
  public async replaceOrder({
    symbol = this.symbol,
    ...rest
  }: ReplaceOrderParams): Promise<OrderResponse> {
    const request = "/v1/order/cancel/replace";
    const data = { symbol, ...rest, aff_code };
    const response = (await this.post(request, {}, data)) as OrderResponse;
    return response;
  }

  /**
   * Get the status of an order.
   */
  public async getOrder(body: { order_id: number }): Promise<OrderResponse> {
    const request = "/v1/order/status";
    const data = { ...body };
    const response = (await this.post(request, {}, data)) as OrderResponse;
    return response;
  }

  /**
   * Get your active orders.
   */
  public async getOrders(): Promise<OrderResponse[]> {
    const request = "/v1/orders";
    const orders = (await this.post(request)) as OrderResponse[];
    return orders;
  }

  /**
   * Get your latest inactive orders.
   */
  public async getOrderHistory(
    body?: OrderHistoryParams
  ): Promise<OrderResponse[]> {
    const request = "/v1/orders/hist";
    const data = { ...body };
    const orders = (await this.post(request, {}, data)) as OrderResponse[];
    return orders;
  }

  /**
   * Get your active positions.
   */
  public async getPositions(): Promise<Position[]> {
    const request = "/v1/positions";
    const positions = (await this.post(request)) as Position[];
    return positions;
  }

  /**
   * Claim your position.
   */
  public async claimPosition(body: ClaimParams): Promise<Position> {
    const request = "/v1/position/claim";
    const position = (await this.post(request, {}, { ...body })) as Position;
    return position;
  }

  /** Get balance ledger entries. */
  public async getBalanceHistory(
    body: BalanceHistoryParams
  ): Promise<HistoryBalance[]> {
    const request = "/v1/history";
    const balances = (await this.post(
      request,
      {},
      { ...body }
    )) as HistoryBalance[];
    return balances;
  }

  /** Get past deposits/withdrawals. */
  public async getDepositsWithdrawals(
    body: DepositsWithdrawalsParams
  ): Promise<DepositWithdrawal[]> {
    const request = "/v1/history/movements";
    const balances = (await this.post(
      request,
      {},
      { ...body }
    )) as DepositWithdrawal[];
    return balances;
  }

  /** Get past trades. */
  public async getPastTrades({
    symbol = this.symbol,
    ...rest
  }: PastTradesParams = {}): Promise<PastTrade[]> {
    const request = "/v1/mytrades";
    const trades = (await this.post(
      request,
      {},
      { ...rest, symbol }
    )) as PastTrade[];
    return trades;
  }

  /** Submit a new offer. */
  public async newOffer(body: NewOfferParams): Promise<Offer> {
    const request = "/v1/offer/new";
    const offer = (await this.post(request, {}, { ...body })) as Offer;
    return offer;
  }

  public set nonce(nonce: () => number) {
    this.#nonce = nonce;
  }

  public get nonce(): () => number {
    return this.#nonce;
  }
}
