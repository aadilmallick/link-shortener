import {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertExists,
} from "@std/assert";
import { CryptoUtils, generateShortCode } from "./src/Crypto.ts";

Deno.test("Crypto Practice ", async (t) => {
  await t.step("should generate hex hash", async () => {
    const longUrl = "https://www.example.com/some/long/path";
    const hashHex = await CryptoUtils.sha256(longUrl, "base64");
    console.log(hashHex);
    assertExists(hashHex);
  });
});
