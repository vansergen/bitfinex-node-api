import { createHmac } from "node:crypto";

export type ISignatureMethod = "HmacSHA384";

export const signatureMethod: ISignatureMethod = "HmacSHA384";

export interface ISignatureOptions {
  key: string;
  secret: string;
  payload: string;
}

export interface ISignedHeaders {
  "X-BFX-APIKEY": string;
  "X-BFX-PAYLOAD": string;
  "X-BFX-SIGNATURE": string;
}

export function signature({
  key,
  secret,
  payload,
}: ISignatureOptions): ISignedHeaders {
  return {
    "X-BFX-APIKEY": key,
    "X-BFX-PAYLOAD": payload,
    "X-BFX-SIGNATURE": createHmac("sha384", secret)
      .update(payload)
      .digest("hex"),
  };
}
