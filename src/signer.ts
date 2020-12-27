import { createHmac } from "crypto";

export type SignerOptions = {
  key: string;
  secret: string;
  payload: string;
};

export type SignedHeaders = {
  "X-BFX-APIKEY": string;
  "X-BFX-PAYLOAD": string;
  "X-BFX-SIGNATURE": string;
};

export function Signer({ key, secret, payload }: SignerOptions): SignedHeaders {
  const signature = createHmac("sha384", secret).update(payload).digest("hex");
  return {
    "X-BFX-APIKEY": key,
    "X-BFX-PAYLOAD": payload,
    "X-BFX-SIGNATURE": signature,
  };
}
