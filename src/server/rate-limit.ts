import { db } from "./db";
import { hashToken } from "./security";
import { AppError } from "./errors";
// PostgreSQL upsert serializes increments across all application instances.
export async function rateLimit(identity: string, limit: number, seconds = 60) {
  const key = hashToken(identity);
  const rows = await db.$queryRaw<{ hits: number }[]>`
    INSERT INTO "RateLimit" ("key", "hits", "resetAt")
    VALUES (${key}, 1, clock_timestamp() + ${seconds} * interval '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE WHEN "RateLimit"."resetAt" <= clock_timestamp() THEN 1 ELSE "RateLimit"."hits" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= clock_timestamp() THEN clock_timestamp() + ${seconds} * interval '1 second' ELSE "RateLimit"."resetAt" END
    RETURNING "hits"`;
  if (rows[0].hits > limit)
    throw new AppError(429, "Too many attempts. Please try again later.");
}
export function clientIp(headers: Headers) {
  return process.env.TRUSTED_PROXY === "vercel"
    ? headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "shared";
}
