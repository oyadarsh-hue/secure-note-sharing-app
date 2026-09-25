# Verification record — 25 September 2026

## Scope

These results are for the **local production build**, not a public deployment. Tested on Windows with Node 24.13.0, Next.js 16.3.6, Prisma 6.19.3, PostgreSQL 12.8, Vitest 5.0.1 and Playwright Chromium. New production setup targets supported managed PostgreSQL. GitHub Actions configuration is included but has not run on GitHub.

| Check                     | Actual result                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Database migration        | Initial SQL migration applied to both local application and dedicated test databases; subsequent deploy reports no pending migration |
| Reviewer seed             | Account created; manual browser login reached the owner notes page                                                                   |
| Formatter                 | `npm run format:check` passed                                                                                                        |
| Lint                      | `npm run lint` passed without lint warnings/errors                                                                                   |
| TypeScript                | `npm run typecheck` passed                                                                                                           |
| Unit/integration          | `npm test`: 23 passed, 0 failed, using real PostgreSQL                                                                               |
| Dedicated concurrency run | `npm run test:concurrency`: 3 passed, 0 failed (subset of the 23 tests)                                                              |
| Production build          | `npm run build` passed, including Prisma generation and Next.js compilation/typechecking                                             |
| Browser tests             | `npm run test:e2e`: 2 passed, 0 failed against `next start`                                                                          |
| Dependency audit          | `npm audit --audit-level=moderate`: zero vulnerabilities after patched resolutions                                                   |
| Secret scan               | Intended tracked source reviewed; configured secrets and credential patterns not found; `.env` and `.env.test` ignored               |

Total unique automated test cases: **25 passed, 0 failed**. The separately rerun three concurrency cases are not counted twice.

## Evidence exercised

- Registration, normalized duplicate email, bcrypt hashes, correct/incorrect login, password validation.
- Public time-based, public one-time and protected note creation; only digests persisted; no owner API hash disclosure.
- Metadata requests neither consume nor reveal note content.
- Correct-key success; wrong/missing keys add no views and do not consume a one-time share.
- Public access uses atomic increments; 12 simultaneous time-based accesses produce count 12.
- Expired, revoked, invalid and already-used links fail without increments.
- Revocation is idempotent, retains its timestamp, and blocks a correct key too.
- Non-owner management/revocation denied; anonymous HTTP requests return 401.
- Past dates, blank titles and oversized content rejected; failed nested create leaves no orphan note.
- Concurrent rate-limit upserts permit exactly the configured number of requests.
- Public and protected two-reader database tests each produce one success, one 410 and count 1; 25 simultaneous readers also produce one winner.
- Browser test independently makes two simultaneous HTTP access requests and verifies statuses [200, 410] plus owner count 1.
- UI registration/login/logout, create/copy-once details, wrong key, plain-text script rendering, use/expiry/revoke states, owner counts, and cross-origin POST rejection.
- Homepage/registration fit 390px mobile and 768px tablet without horizontal overflow; desktop homepage visually inspected.

## Fixed during verification

- Narrowed the validated owner-share return type rather than suppressing nullability errors.
- Replaced internal full-page navigation with the Next.js router and cleared lint warnings.
- Used native Vitest config loading because esbuild configuration bundling could not enumerate a protected Windows parent directory.
- Replaced the seed's tsx launcher with a portable Node `.mjs` script to avoid the sandbox OS-account lookup failure.
- Quoted the local demo password in dotenv configuration so `#` was not treated as a comment.
- Scoped browser alert assertions to the application's main content to avoid Next.js's separate accessibility announcer.
- Updated Vitest and patched Prisma's deepmerge dependency; reverified generation, migrations, database tests and build.
- Stopped the local server before regenerating Prisma on Windows to release its locked query-engine DLL, then rebuilt and restarted successfully.

## Security review boundaries

The scan checks configured auth/demo secrets, common credential signatures and forbidden tracked paths; it is not a proof that every conceivable secret is absent. Test-only credentials in the test suite and CI database are deliberately disposable and are not live credentials. The public source contains no reviewer password, database credential, generated share URL or access key.

Production HTTPS/cookie behavior, hosting log redaction, managed connection limits, provider access controls, and real live credentials are **not verified** until deployment. There has been no penetration test or million-reader load test. Rate limiting, encryption boundaries, response-loss behavior, and scaling tradeoffs are explained in README.

## Outstanding release requirements

- Authenticated access to the requested `oyadarsh-hue` account, remote repository creation/push, and remote source verification.
- Authenticated deployment/database provisioning, migrations/seed in production, live HTTPS smoke tests.
- Application form: user confirmed prior submission on 25 September 2026; no duplicate submission performed.
- Adarsh's actual webcam-and-screen recording (<= 8 minutes), upload, and reviewer-access verification.
- Update the prepared Gmail draft only with verified real URLs and live credentials; send only after every mandatory pre-send condition passes.
