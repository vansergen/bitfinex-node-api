import { PublicClient1, PublicClient1Params } from "./public1";
import { Signer } from "./signer";

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

  get nonce(): string {
    return Date.now().toString();
  }
}
