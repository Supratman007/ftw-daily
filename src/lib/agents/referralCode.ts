import "server-only";
import { randomInt } from "node:crypto";

// Excludes visually-ambiguous characters (0/O, 1/I/L) -- these get
// read aloud and typed by hand a lot more than most codes in this app.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomSuffix(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** e.g. "AGENT-K7QX9M" -- callers retry with a fresh code on a unique
 * constraint conflict, which a 6-character code from a 32-symbol
 * alphabet makes vanishingly rare. */
export function generateReferralCode(): string {
  return `AGENT-${randomSuffix(6)}`;
}
