import assert from "assert";
import { Signer, SignedHeaders } from "../index";

suite("Signer", () => {
  test("Correct signature", () => {
    const key = "17a455a3b5ee1cc6df5ab9a5287c0c9c6e6a86b5b9";
    const secret = "ddc64733b9a786f9ca45ddbc2f370ecdab2ed7acbb";
    const body = {
      request: "/v1/deposit/new",
      method: "bitcoin",
      wallet_name: "trading",
      nonce: "1574959951447",
    };
    const payload =
      "eyJyZXF1ZXN0IjoiL3YxL2RlcG9zaXQvbmV3IiwibWV0aG9kIjoiYml0Y29pbiIsIndhbGxldF9uYW1lIjoidHJhZGluZyIsIm5vbmNlIjoiMTU3NDk1OTk1MTQ0NyJ9";
    const signature =
      "49e35e58d8dc083cc245bf9933a54565c6b6202dc427574b75c13c49e8c9e5c8666185df8a6e4b44d63f2fe7175b79e9";
    const headers = Signer({ key, secret, body });
    const expectedHeaders: SignedHeaders = {
      "X-BFX-APIKEY": key,
      "X-BFX-PAYLOAD": payload,
      "X-BFX-SIGNATURE": signature,
    };
    assert.deepStrictEqual(headers, expectedHeaders);
  });
});
