import { db } from "../src/server/db";
import { register } from "../src/server/accounts";
export const password = "TestOnly#Peacock2026!";
export async function reset() {
  await db.rateLimit.deleteMany();
  await db.user.deleteMany();
}
export const account = (email = "owner@example.com") =>
  register({ name: "Test Owner", email, password, confirmPassword: password });
export const noteInput = (extra: Record<string, unknown> = {}) => ({
  title: "A private note",
  content: "<script>alert(1)</script>\nPlain text.",
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  shareType: "TIME_BASED",
  accessType: "PUBLIC",
  ...extra,
});
export const tokenFrom = (url: string) =>
  new URL(url).pathname.split("/").pop()!;
