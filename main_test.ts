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

import { storeShortLink, getShortLink } from "./src/databaseController.ts";

Deno.test("Short link description handling", async (t) => {
  await t.step("should create short link with a description", async () => {
    const longUrl = "https://example.com/desc-test";
    const shortCode = await generateShortCode(longUrl);
    const userId = "test-user-1";
    const desc = "A very useful resource for testing descriptions";

    const saved = await storeShortLink(longUrl, shortCode, userId, desc);
    assertEquals(saved.description, desc);

    const retrieved = await getShortLink(shortCode);
    assertExists(retrieved);
    assertEquals(retrieved.description, desc);
  });

  await t.step("should update the description of an existing short link", async () => {
    const longUrl = "https://example.com/desc-test-2";
    const shortCode = await generateShortCode(longUrl);
    const userId = "test-user-2";
    const initialDesc = "Initial description";
    const updatedDesc = "Updated description";

    // Store initially
    await storeShortLink(longUrl, shortCode, userId, initialDesc);
    const retrieved1 = await getShortLink(shortCode);
    assertExists(retrieved1);
    assertEquals(retrieved1.description, initialDesc);

    // Update description
    await storeShortLink(longUrl, shortCode, userId, updatedDesc);
    const retrieved2 = await getShortLink(shortCode);
    assertExists(retrieved2);
    assertEquals(retrieved2.description, updatedDesc);
  });
});
