import { createHmac } from "node:crypto";

export interface ISignatureV2Options {
  key: string;
  secret: string;
  path: string;
  nonce: string;
  body: string;
}

export interface ISignedHeadersV2 {
  "bfx-apikey": string;
  "bfx-nonce": string;
  "bfx-signature": string;
}

/**
 * Sign a Bitfinex v2 authenticated REST request.
 *
 * The message is `/api/v2/{path}{nonce}{body}` signed with HMAC-SHA384
 * using the API secret.
 *
 * https://docs.bitfinex.com/docs/rest-auth
 */
export function signatureV2({
  key,
  secret,
  path,
  nonce,
  body,
}: ISignatureV2Options): ISignedHeadersV2 {
  const message = `/api/v2/${path}${nonce}${body}`;
  return {
    "bfx-apikey": key,
    "bfx-nonce": nonce,
    "bfx-signature": createHmac("sha384", secret).update(message).digest("hex"),
  };
}
