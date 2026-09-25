# QuietNote — Peacock India secure notes POC

Secure, expiring note sharing by **Adarsh S**. A focused Next.js application with owner management, generated access keys, and PostgreSQL-enforced one-time access.

**Live application:** [QuietNote](https://secure-note-sharing-app-nine.vercel.app). Published at [oyadarsh-hue/secure-note-sharing-app](https://github.com/oyadarsh-hue/secure-note-sharing-app). [GitHub Actions verification](https://github.com/oyadarsh-hue/secure-note-sharing-app/actions/runs/36108283626) passed migrations, lint, typecheck, formatting, 23 database tests, concurrency checks, audit, production build and 2 browser tests. Both browser tests also passed against the real HTTPS deployment; reviewer login and secure session-cookie flags were checked separately. The author's webcam recording is pending. See `VERIFICATION.md` and `DEPLOYMENT.md` for evidence and release steps.

## Run locally

Use Node.js 22.18+ (tested with 24.13), npm, and PostgreSQL 17 for a new installation. The committed lockfile pins dependencies. PostgreSQL 12.8 was available for this workstation's isolated local verification; it is not recommended for new production deployments.

```sh
npm ci
cp .env.example .env
```

Set `DATABASE_URL`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET` in `.env`. Generate the secret with `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`. Quote environment values containing `#`. Never commit `.env`.

For Docker, set `POSTGRES_PASSWORD` in the environment or `.env`, then run `docker compose up -d`. Use the same password in `DATABASE_URL`. The database is exposed only on loopback. Alternatively create a dedicated database on an existing PostgreSQL service.

```sh
npx prisma generate
npm run db:migrate
# Configure DEMO_EMAIL and DEMO_PASSWORD first:
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The seed upserts only the configured reviewer account and updates that account's password; do not point it at a personal account. Demo credentials are provided privately in the submission pack, not in the repository.

For a production build locally:

```sh
npm run build
npm start
```

## Stack and layout

Next.js 16 App Router, React 19, TypeScript, Tailwind 4, locally owned shadcn-style Radix/CVA UI components, Hono 4, Prisma 6, PostgreSQL, Zod 4, and stable NextAuth 4 credentials authentication. NextAuth JWT sessions avoid the database-session restriction of its credentials provider. bcrypt cost is 12. No experimental auth release is used.

| Location                   | Responsibility                                               |
| -------------------------- | ------------------------------------------------------------ |
| `src/app`                  | Pages, server route protection, Next.js route handlers       |
| `src/components`           | Forms, share recipient UI, reusable UI components            |
| `src/server/api.ts`        | Hono API, validation, origin enforcement, errors             |
| `src/server/auth.ts`       | NextAuth, session identity and login limits                  |
| `src/server/accounts.ts`   | Registration, unique normalized email, password verification |
| `src/server/shares.ts`     | Creation, ownership, atomic access, status, revoke           |
| `src/server/security.ts`   | Random tokens/keys and hashing                               |
| `src/server/rate-limit.ts` | Distributed fixed-window rate limits                         |
| `prisma`                   | Schema, versioned SQL migrations, reviewer seed              |
| `tests`, `e2e`             | Real PostgreSQL tests and browser/API workflows              |

Required pages: `/login`, `/register`, `/notes/new`, `/notes/[id]`, `/share/[token]`. A small `/notes` list displays the latest 50 owner notes. No analytics dashboard or unrelated features.

## Database

`User` has a unique normalized email, bcrypt password hash, and many notes. `Note` belongs to one user and has one `ShareLink`. A share stores an indexed unique SHA-256 token digest, optional bcrypt key digest, access/share enums, expiry, consumption/revocation timestamps, and an atomic view count. Timestamps use `timestamptz` and are rendered in the reader's local time. `RateLimit` stores hashed bucket identities and expiry, shared across servers. Foreign keys cascade on account/note deletion; the application exposes no deletion endpoint. Revocation preserves the share record.

## API

| Method and path                 | Access / result                                         |
| ------------------------------- | ------------------------------------------------------- |
| POST `/api/auth/register`       | Public, validated account registration, 201             |
| GET/POST `/api/auth/*`          | NextAuth CSRF, login/session/logout                     |
| POST `/api/notes`               | Authenticated owner; transactionally creates note/share |
| GET `/api/notes/:id`            | Owner only; content/status/count, no hashes             |
| POST `/api/notes/:id/revoke`    | Owner only; idempotent revocation                       |
| GET `/api/share/:token/status`  | Status/rules only, no content or side effects           |
| POST `/api/share/:token/access` | Deliberate access; key required for protected shares    |

Hono mutations require JSON and an `Origin` matching `NEXTAUTH_URL`; command-line clients must send it. NextAuth uses its own CSRF mechanism. Missing session returns 401. Non-owner and missing notes return 404. Wrong access key returns 403, invalid token 404, used/expired/revoked 410, throttling 429 with Retry-After, and invalid input 400. Registration conflict is 409. Unexpected errors are generic 500 responses.

## Share flow and security

1. Owner submits a future expiry and validated title/content.
2. The server creates 32 random bytes (256 bits) for a URL-safe token. Only SHA-256(token) is persisted. Database readers cannot reconstruct share URLs from digests.
3. Protected shares receive 20 uniformly selected characters from a 32-character unambiguous alphabet: 100 bits of entropy. Only a cost-12 bcrypt hash is stored. The raw key and URL are returned once; save both immediately. Public shares have no key.
4. Prisma's nested create commits the note and share together. A failure leaves neither record.
5. Recipient GETs only metadata. Explicit Open/Unlock POST performs access; React effects and Next.js prefetch cannot consume a link.
6. Protected requests verify the key, then execute the authoritative conditional update. Wrong keys never increment or consume.

### Atomic one-time access and accurate counts

`src/server/shares.ts` contains a parameterized UPDATE inside a transaction:

```sql
UPDATE "ShareLink"
SET "consumedAt" = CASE WHEN "shareType" = 'ONE_TIME'
    THEN clock_timestamp() ELSE "consumedAt" END,
    "viewCount" = "viewCount" + 1,
    "updatedAt" = clock_timestamp()
WHERE "id" = $1
  AND "revokedAt" IS NULL
  AND "consumedAt" IS NULL
  AND "expiresAt" > clock_timestamp()
RETURNING "noteId";
```

PostgreSQL locks the row. Under concurrent access the waiting UPDATE rechecks the changed row: once consumed, no second request matches. Only the winner receives note content. This is not a SELECT-then-write decision, an in-memory lock, or a frontend guarantee. Preliminary status reads improve messages but do not authorize access. The content read occurs in the transaction, so a failed database read rolls back the claim.

Time-based shares keep `consumedAt` null and use the same atomic increment. `clock_timestamp()` checks actual database time, including after waiting for another writer, rather than trusting browser time or a transaction-start timestamp. Revocation also updates the same row: whichever transaction wins the lock determines the ordering. A revocation cannot retract content already returned.

A successful view means the server authorized and committed an access, **not proof a human read the response**. If the response is lost after commit, a one-time note stays consumed. There is intentionally no automatic access retry or reopening token.

### Other controls and limitations

- Passwords and generated keys are bcrypt-hashed; account passwords are 12–72 characters and at most 72 UTF-8 bytes, preventing bcrypt truncation.
- Sessions are NextAuth encrypted JWTs, eight-hour lifetime, HttpOnly and SameSite=Lax. HTTPS deployment enables Secure cookies. Owner identity comes only from the verified session.
- Content is React-escaped plain text, never HTML. Title is limited to 120 characters, content to 20,000; request body to 100 KB.
- Responses carrying share/API information are uncached; private pages are dynamic. Referrer policy prevents leaking share paths. Frame blocking, nosniff, permissions policy, and HTTPS HSTS are configured.
- CSP currently permits inline script/style to accommodate Next.js hydration; nonce-based CSP is a future hardening step, not claimed as implemented.
- No secrets, raw keys, share URLs, request bodies, or SQL errors are logged by application logging. Configure hosting access-log retention/redaction because URLs contain bearer tokens.
- Notes themselves are not end-to-end encrypted; the server/database administrator can read content. Use synthetic assessment data and managed disk encryption/TLS.
- No password reset, email verification, account deletion UI, or background retention job is included. Do not treat this POC as a production secret vault.

## Rate limiting and scaling

Atomic PostgreSQL upserts count attempts across application processes. Limits: registration 10/hour per IP bucket; login 30/5 minutes per IP and 10/5 minutes per normalized email; note creation 30/hour per user; status 120/minute per IP; access 60/minute per IP and 10/minute per share+IP. Wrong keys and blocked requests never count as views. Limiters fail closed if PostgreSQL is unavailable.

`TRUSTED_PROXY=none` ignores spoofable client headers and puts anonymous traffic in one shared IP bucket. This is intentionally conservative for local/unknown hosting and can limit unrelated visitors. On Vercel only, set `TRUSTED_PROXY=vercel` to use the platform's overwritten `x-vercel-forwarded-for`. Do not enable it on an untrusted proxy. Rate limits mitigate guessing but are not a complete distributed denial-of-service defense.

At one million readers, use an edge WAF, managed connection pooling, and Redis/Upstash for rate-limit counters. Keep the conditional one-time claim in PostgreSQL. A single popular time-based share becomes a hot counter row: consider sharded counters or durable events if eventual count consistency is acceptable, document that tradeoff, and benchmark. Moving the count away from the access transaction requires idempotency and reconciliation. Do not promise unlimited throughput. Clean expired limiter buckets regularly, e.g. daily `DELETE FROM "RateLimit" WHERE "resetAt" < now() - interval '1 day'`, in bounded batches on a large dataset.

## Tests

Create a **separate** database named `peacock_test`. Copy `.env` to `.env.test` and change only its database connection to that dedicated database. The suite refuses connections without `/peacock_test?` in the URL and clears that database's application records. Never use real data in it.

```sh
# Set DATABASE_URL to the dedicated test database for this command:
npm run db:migrate
# Vitest loads .env.test itself:
npm test
npm run test:concurrency
npm run lint
npm run typecheck
npm run format:check
npm run build
```

The native Vitest config loader avoids a Windows sandbox/esbuild parent-directory issue and requires the documented modern Node version. No test bypasses the database using a mock. See `VERIFICATION.md` for exact coverage/results.

Browser testing requires a running application:

```sh
npx playwright install chromium
npm run build
npm start
# In another terminal:
npm run test:e2e
```

Set `E2E_BASE_URL` to a dedicated live staging deployment for the same smoke test. It creates synthetic accounts/notes, consumes links and revokes them. Do not run it against a site with important data. Review rate-limit buckets before repeated runs. For a fresh CI database, the included GitHub workflow runs migrations, database tests, build, and browser checks.

## Dependency decision

Prisma 6 preserves a straightforward, stable schema/client setup. Its `deepmerge-ts` configuration dependency is overridden to patched 8.0.2 to address the audit advisory. Generate/migrate/build and database tests must pass with that override. Vitest is updated to stable 5.0.1 to resolve the test-tool advisory. The lockfile captures the resolution; do not run a blind `npm audit fix --force` downgrade.

## Learning and submission

Read `INTERVIEW_PREP.md` for what/why/how/change explanations and likely questions. `DEMO_VIDEO_SCRIPT.md` and `TECHNICAL_VIDEO_SCRIPT.md` provide a combined recording plan under eight minutes with webcam and real code. Deployment instructions are in `DEPLOYMENT.md`. Submission should wait for real verified repository, HTTPS app, video, reviewer credentials, and application-form confirmation.
