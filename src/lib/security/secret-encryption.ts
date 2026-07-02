/*
File description:
This server-only helper encrypts and decrypts Shopify and Klaviyo credentials before they are stored in
Supabase. It keeps the encryption key in environment variables and stores only AES-GCM ciphertext in the
database, so raw platform secrets are not saved as plain text.
*/

import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getAppEncryptionKey } from "@/lib/env";

const algorithm = "aes-256-gcm";
const ciphertextPrefix = "v1";

function getKeyBuffer() {
  const rawKey = getAppEncryptionKey().trim();
  const base64Key = Buffer.from(rawKey, "base64");

  if (base64Key.length === 32) {
    return base64Key;
  }

  const hexKey = Buffer.from(rawKey, "hex");

  if (hexKey.length === 32) {
    return hexKey;
  }

  const utf8Key = Buffer.from(rawKey, "utf8");

  if (utf8Key.length === 32) {
    return utf8Key;
  }

  throw new Error("APP_ENCRYPTION_KEY must decode to exactly 32 bytes.");
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getKeyBuffer(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Store the format version with the encrypted payload so future rotations can support old rows.
  return [
    ciphertextPrefix,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(encrypted: string) {
  const [version, ivValue, tagValue, ciphertextValue] = encrypted.split(":");

  if (version !== ciphertextPrefix || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Unsupported encrypted secret format.");
  }

  const decipher = createDecipheriv(algorithm, getKeyBuffer(), Buffer.from(ivValue, "base64"));

  decipher.setAuthTag(Buffer.from(tagValue, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
