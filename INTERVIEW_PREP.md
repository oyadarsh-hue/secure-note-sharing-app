# Understand and modify QuietNote

## Architecture in ordinary language

The browser is responsible for displaying forms and results. Next.js serves pages and the API routes. Hono organizes API requests. Zod checks data. Prisma talks to PostgreSQL. The database decides whether a share can be used; a disabled button is only a usability feature.

## Subsystems: what, why, how, and where to change them

| Subsystem        | What and why                                              | How it works                                                                                                                                                   | How to modify                                                                                                                              |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Authentication   | Establishes which account is asking                       | `accounts.ts` normalizes email and bcrypt-hashes passwords; `auth.ts` verifies credentials and issues an eight-hour NextAuth JWT session in an HttpOnly cookie | Change lifetime in `auth.ts`; password policy in `validation.ts`. Add reset/verification with token expiry rather than plaintext passwords |
| Authorization    | Prevents one signed-in person managing another's notes    | `requireUser()` reads the signed session; `getOwnedNote` filters by both note ID and user ID; revoke also checks ownership                                     | Add a new owner action through the same service pattern; never accept browser `userId`                                                     |
| Schema           | Keeps relationships and invariants in PostgreSQL          | User has many Notes; Note has one ShareLink; unique emails/tokens and foreign keys enforce relationships                                                       | Edit schema, generate a migration locally, review SQL, deploy it; plan existing-data changes before adding required fields                 |
| Hono routing     | Connects HTTP requests to services                        | `api.ts` applies origin/body/rate checks, parses Zod input, calls the service, and maps errors                                                                 | Add a route and schema, then API/auth tests. Keep concurrency logic in the service                                                         |
| Note creation    | Saves note and sharing rules together                     | Nested Prisma create inserts both in one transaction                                                                                                           | For multiple shares per note, replace the unique noteId relationship and add a share-list UI                                               |
| Token            | Creates an unguessable bearer link                        | `randomBytes(32)` generates 256 bits; SHA-256 digest is stored                                                                                                 | Change token encoding and validation together; never use IDs or Math.random                                                                |
| Access key       | Adds a separately transmitted secret to a protected link  | Twenty random characters, 100 bits, bcrypt cost 12; returned once                                                                                              | Change alphabet/length in `security.ts`; evaluate entropy and update tests/help text                                                       |
| Public access    | Allows access without a key, subject to lifetime          | Status GET is harmless; explicit POST does the conditional update and returns plain text                                                                       | Keep reading separate from metadata/prefetch; don't introduce automatic retries                                                            |
| Protected access | Requires the generated key                                | Verify bcrypt first, then run exactly the same database claim                                                                                                  | If adding key reset, define whether old keys stop immediately and enforce it atomically                                                    |
| One-time claim   | Prevents concurrent readers both winning                  | PostgreSQL UPDATE matches only unused, unrevoked, unexpired rows; returned row proves success                                                                  | Keep every rule in the conditional operation; add concurrency tests for new rules                                                          |
| View count       | Counts successful access commits, without lost increments | `viewCount = viewCount + 1` in the claim, never a stale JS value                                                                                               | For heavy traffic consider event/sharded counters and explain eventual consistency                                                         |
| Expiry           | Closes a link at a chosen time                            | ISO time becomes a PostgreSQL timestamptz; `clock_timestamp()` is authoritative                                                                                | Change maximum allowed lifetime in validation; retain database recheck after key verification                                              |
| Revoke           | Allows owner to stop future reads while retaining history | Set revokedAt once; repeated requests are safe; access predicate excludes revoked rows                                                                         | For soft restore, design a separate explicit action and test races; don't clear timestamps casually                                        |
| Rate limits      | Slows guessing and protects bcrypt/DB                     | Atomic upsert counters shared across instances; share+IP, IP, account/user buckets                                                                             | Replace store with Redis behind the same function; use trusted platform IP parsing                                                         |
| UI               | Makes sharing rules understandable                        | Reusable Radix/CVA components, local times, explicit Open/Unlock, loading/error states                                                                         | Update labels and field controls in components; keep server validation authoritative                                                       |

## Walk through the most important code

Open `src/server/shares.ts`, function `accessShare`. Read the preliminary lookup and key comparison first. Explain that these are not the final eligibility decision. Point to the UPDATE's WHERE clause. It checks consumption, revocation, and database time together. The UPDATE also increments the count and records consumption. Only after a returned row exists does the transaction read the note. If no row matches, the service returns 410 without content.

Two transactions can both see an initially active share. They cannot both update its unused row. The second waits for the first writer and rechecks the predicate after the lock is available. This is why an earlier SELECT does not create a race in this implementation: it never replaces the conditional UPDATE.

## Likely questions and short answers

**Two users click together?** One conditional update wins. The other sees no eligible row and gets 410. The real PostgreSQL tests assert one winner and count 1 for public and protected shares, plus 25 readers.

**Why hash the URL token?** A database dump should not directly contain bearer URLs. Random tokens have enough entropy for a fast SHA-256 digest to be appropriate. Hashing doesn't protect a URL leaked from a browser or hosting access log.

**Why hash the access key?** The application only needs to verify it, not recover it. bcrypt makes candidate verification more expensive. The owner must save the original key because the app cannot show it again.

**Why PostgreSQL?** Transactions, unique constraints, row locks, conditional writes and atomic counters make these invariants understandable and enforceable.

**Multiple servers?** They all share the same database claim and rate-limit rows. No process-local lock or memory counter determines correctness.

**One million opens?** The one-time invariant remains correct, but throughput is not unlimited. Add an edge WAF, pooled connections and Redis limits. A time-based share's counter is a hot row; shard or use durable events if eventual counts are acceptable. Load-test before promising capacity.

**Transaction fails?** The create leaves no partial note/share. The access transaction rolls back its claim/count if its database work fails. A network failure after commit is different: the link stays used even if the client missed the response.

**Prevent unauthorized revoke?** Derive identity from the session, select the note by ID plus owner ID, and constrain the mutation to that owner. Non-owners receive 404.

**Authentication versus authorization?** Authentication answers who you are. Authorization checks whether that identity owns this note.

**Expired status code?** Access returns 410 Gone. The harmless status endpoint returns structured EXPIRED information with 200 so the UI can explain it.

**What counts as a view?** A committed authorized access operation. Not key attempts, metadata requests, prefetches, or proof a human actually read the text.

**Why a button for public links?** GET and prefetch should be safe. The deliberate POST prevents bots/prefetch/Strict Mode from silently using a one-time link.

**Can revoke undo a screenshot?** No. Revocation stops future server access, not copies already made.

**Is it end-to-end encrypted?** No. Passwords/keys/tokens are hashed, but note content is readable by the server. TLS and managed database encryption are deployment controls. Don't call this zero-knowledge.

**Can attackers spoof IP limits?** The default ignores forwarding headers and shares one bucket. Vercel mode trusts only its overwritten header. For another host, implement and verify that host's proxy trust boundary.

**Does duplicate registration reveal an account?** A 409 response still creates an enumeration signal. Login errors are generic and registration is limited. A higher-risk product should use an indistinguishable email-verification flow.

**Why not encode the note in a JWT share link?** Revocation, one-time use and exact counts still require server state; a random opaque token with a database row keeps the authority clear.

**What would you add before real production use?** Supported managed PostgreSQL, verified deployment controls, recovery/email verification, retention/deletion policy, observability with redaction, robust distributed abuse defenses, and security/load testing.

## Practice changes

1. Limit expiry to seven days: add the upper bound in Zod and database-time validation; test eight days rejected and one day accepted.
2. Add a remaining-views quota: store it and decrement within the same conditional UPDATE; test concurrent requests around the last remaining view.
3. Change count labels: update the owner page; do not change service semantics to match a UI shortcut.
4. Add pagination: use a stable cursor and owner filter in the notes query, not an unbounded fetch.

Explain these changes in your own words before recording. Do not claim features or deployment results that have not been demonstrated.
