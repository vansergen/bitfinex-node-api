import * as crypto from "crypto";

export type SignerOptions = {
  key: string;
  secret: string;
  body: object;
};

export type SignedHeaders = {
  "X-BFX-APIKEY": string;
  "X-BFX-PAYLOAD": string;
  "X-BFX-SIGNATURE": string;
};

export function Signer({ key, secret, body }: SignerOptions): SignedHeaders {
  const payload = Buffer.from(JSON.stringify(body)).toString("base64");
  return {
    "X-BFX-APIKEY": key,
    "X-BFX-PAYLOAD": payload,
    "X-BFX-SIGNATURE": crypto
      .createHmac("sha384", secret)
      .update(payload)
      .digest("hex"),
  };
}
