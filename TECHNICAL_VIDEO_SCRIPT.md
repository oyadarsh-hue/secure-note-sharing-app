# Technical segment for the combined recording

Use this around 4:30–7:25 in `DEMO_VIDEO_SCRIPT.md`, keeping the **entire webcam + screen recording below eight minutes**. These are speaking notes; rehearse and explain in your own words.

## 4:30–5:00 — architecture and schema

Open `prisma/schema.prisma`.

“The frontend is Next.js with TypeScript and Tailwind. Hono organizes the API, and Prisma connects it to PostgreSQL. A user owns notes, and each note has one share record. The share has the access rules, expiry, used and revoked timestamps, and successful-view count. The recipient never receives password hashes or the token hash. The note owner is taken from the authenticated session, not from a submitted user ID.”

## 5:00–5:25 — secrets and the access route

Open `src/server/security.ts`, then `src/server/api.ts` at the access route.

“The URL token comes from 32 cryptographically random bytes. I store its SHA-256 digest so a database dump doesn't directly expose working links. The protected key is separately generated with 100 bits of entropy and stored using bcrypt. The raw key is shown once. Status is a harmless GET; opening is a deliberate POST. This avoids consuming a link through prefetch or an effect running twice.”

## 5:25–6:35 — the real concurrency decision

Open `src/server/shares.ts`, function `accessShare`, with the UPDATE visible.

“First I look up the share and, if it's protected, check the supplied key. But that initial lookup isn't the final access decision. This UPDATE is.

“The WHERE clause requires an unused, unrevoked row whose expiry is still in the future. In the same operation I set consumedAt for one-time shares and increment the count. PostgreSQL locks the row while updating it. If two requests arrive together, the second waits and then rechecks the row after the first update. The row is now consumed, so it doesn't match.

“I only read and return the note if that update returns a row. Otherwise the request gets 410. Both the claim and note read are inside the transaction. There's no JavaScript read-modify-write counter and no in-memory lock. This works across app instances because they all use the same database.

“The timestamp is the database's current clock at the operation. Wrong keys never reach this update. Expired or revoked requests don't match it, so none of them add a view.”

## 6:35–7:05 — boundaries and abuse controls

Briefly open `src/server/rate-limit.ts`.

“I use shared database rate-limit buckets, including share plus IP and login account limits, to slow guessing. In a larger deployment I'd move those counters to Redis and add edge protection. I'd keep the one-time decision transactional. A popular time-based link can make its counter a hot row, so I'd load-test it and consider sharding or event-based counting with a clearly documented consistency tradeoff.

“A view means a committed authorized access, not proof that someone read the response. If the network drops after commit, a one-time link stays used. Also, this app isn't end-to-end encrypted; the server can read the note.”

## 7:05–7:25 — show real test results

Show the actual passing test output and `tests/concurrency.test.ts`.

“The tests use a real PostgreSQL database. The two-request tests verify one success, one 410, and count one for both public and protected links. There's also a larger simultaneous-request case. The browser test exercises registration, login, keys, expiry, revoke and HTTP concurrency against the production build. The README explains how to reproduce these checks.”

Only say checks passed when `VERIFICATION.md` and the actual final run confirm them. Only say the application is deployed after the live deployment has been independently tested.
