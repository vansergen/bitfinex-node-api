import {
  PublicClient1,
  PublicClient1Params,
  DefaultCurrency,
  Currency
} from "./public1";
import { Signer } from "./signer";

export type DepositParams = {
  method: string;
  wallet_name: "trading" | "exchange" | "deposit";
  renew?: 0 | 1;
};

export type TransferParams = Currency & {
  amount: string;
  walletfrom: "trading" | "deposit" | "exchange";
  walletto: "trading" | "deposit" | "exchange";
};

export type WithdrawParams = {
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
};

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

export type AccountFees = { withdraw: { [currency: string]: string } };

export type Summary = {
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
  fees_funding_30d: {};
  fees_funding_total_30d: number;
  fees_trading_30d: {};
  fees_trading_total_30d: number;
  maker_fee: number;
  taker_fee: number;
  deriv_maker_rebate: number;
  deriv_taker_fee: number;
};

export type DepositAddress = {
  result: string;
  method: string;
  currency: string;
  address: string;
};

export type KeyPermission = { read: boolean; write: boolean };

export type KeyPermissions = {
  account: KeyPermission;
  history: KeyPermission;
  orders: KeyPermission;
  positions: KeyPermission;
  funding: KeyPermission;
  wallets: KeyPermission;
  withdraw: KeyPermission;
};

export type MarginInformation = {
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
};

export type WalletBalance = {
  type: "trading" | "deposit" | "exchange";
  currency: string;
  amount: string;
  available: string;
};

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

export type AuthenticatedClient1Options = PublicClient1Params & {
  key: string;
  secret: string;
};

export class AuthenticatedClient1 extends PublicClient1 {
  readonly key: string;
  readonly secret: string;

  constructor({ key, secret, ...rest }: AuthenticatedClient1Options) {
    super(rest);
    this.key = key;
    this.secret = secret;
  }

  post({ body = {}, uri }: { body?: object; uri: string }): Promise<any> {
    body = { ...body, nonce: this.nonce, request: uri };
    const headers = Signer({ key: this.key, secret: this.secret, body });
    return super.post({ body, headers, uri });
  }

  /**
   * Return information about your account (trading fees).
   */
  getAccountInfo(): Promise<AccountInfo> {
    return this.post({ uri: "/v1/account_infos" });
  }

  /**
   * Return the fees applied to your withdrawals.
   */
  getAccountFees(): Promise<AccountFees> {
    return this.post({ uri: "/v1/account_fees" });
  }

  /**
   * Returns a 30-day summary of your trading volume and return on margin funding.
   */
  getSummary(): Promise<Summary> {
    return this.post({ uri: "/v1/summary" });
  }

  /**
   * Returns your deposit address to make a new deposit.
   */
  getDepositAddress(body: DepositParams): Promise<DepositAddress> {
    return this.post({ body, uri: "/v1/deposit/new" });
  }

  /**
   * Returns the permissions of the key being used to generate this request.
   */
  getKeyPermissions(): Promise<KeyPermissions> {
    return this.post({ uri: "/v1/key_info" });
  }

  /**
   * Returns the trading wallet information for margin trading.
   */
  getMarginInformation(): Promise<MarginInformation> {
    return this.post({ uri: "/v1/margin_infos" });
  }

  /**
   * Returns your balances.
   */
  getWalletBalances(): Promise<WalletBalance[]> {
    return this.post({ uri: "/v1/balances" });
  }

  /**
   * Move available balances between your wallets.
   */
  transfer({
    currency = DefaultCurrency,
    ...body
  }: TransferParams): Promise<TransferResponse> {
    return this.post({ body: { currency, ...body }, uri: "/v1/transfer" });
  }

  /**
   * Request a withdrawal from one of your wallet.
   */
  withdraw(body: WithdrawParams): Promise<WithdrawResponse> {
    return this.post({ body, uri: "/v1/withdraw" });
  }

  get nonce(): string {
    return Date.now().toString();
  }
}
