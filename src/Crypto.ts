import { encodeBase64Url, encodeHex } from "jsr:@std/encoding";
import { crypto, DigestAlgorithm } from "jsr:@std/crypto/crypto";

export async function generateShortCode(longUrl: string) {
  try {
    new URL(longUrl);
  } catch (error) {
    console.log(error);
    throw new Error("Invalid URL provided");
  }

  // Generate a unique identifier for the URL
  const hashHex = await CryptoUtils.sha256(longUrl, "hex");

  // Take the first 8 characters of the hash for the short URL
  const shortCode = encodeBase64Url(hashHex.slice(0, 8));

  return shortCode;
}

export class CryptoUtils {
  private static async getHash(
    str: string,
    algorithm: DigestAlgorithm,
    format: "hex" | "base64" = "hex"
  ) {
    const stringData = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest(algorithm, stringData);
    const hashArray = new Uint8Array(hash);
    return format === "hex" ? encodeHex(hashArray) : encodeBase64Url(hashArray);
  }

  static sha256(str: string, format: "hex" | "base64" = "hex") {
    return this.getHash(str, "SHA-256", format);
  }
}
