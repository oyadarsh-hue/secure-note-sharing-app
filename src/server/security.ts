import { createHash, randomBytes, randomInt } from "node:crypto";
import { compare, hash } from "bcryptjs";
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const generateToken = () => randomBytes(32).toString("base64url");
export function generateKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 20 },
    () => alphabet[randomInt(alphabet.length)],
  ).join("");
}
export const hashPassword = (value: string) => hash(value, 12);
export const verifyPassword = (value: string, digest: string) =>
  compare(value, digest);
