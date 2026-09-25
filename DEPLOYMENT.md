# Deploy and verify

Target: Vercel Node.js + managed PostgreSQL (Neon recommended). This is a deployment plan, not evidence that deployment exists. No paid purchase is required or authorized by these instructions.

1. Create a managed PostgreSQL database on a supported version in a region near the Vercel project. Use a dedicated assessment database and require TLS (`sslmode=require`). Keep its connection string in environment configuration, never Git.
2. Create the public `oyadarsh-hue/secure-note-sharing-app` repository, inspect the committed files and secret scan, and push `main`. Verify source, README, lockfile, migration, tests, and `.env.example` on GitHub. Confirm `.env`, `.env.test`, build output, and private submission pack are absent.
3. Import this repository in Vercel using the Next.js preset and Node 24. Build command: `npm run build`. The output is standard Next.js; do not export it as a static site.
4. Set production environment values: `DATABASE_URL`, `NEXTAUTH_SECRET` (fresh random 48 bytes), `NEXTAUTH_URL` (exact HTTPS production origin), `TRUSTED_PROXY=vercel`, `DEMO_EMAIL`, `DEMO_PASSWORD`. Use a dedicated reviewer password, not a personal credential. If the final host is initially unknown, reserve the project domain first, then set the origin and redeploy.
5. Run `npm ci`, `npx prisma generate`, and `npm run db:migrate` against the production database in a secure environment before routing traffic. Use the provider's direct migration URL if its transaction pooler does not support migration locking. Do not put migration commands in every serverless request or run `migrate dev` on production.
6. Run `npm run db:seed` with production demo variables. Seed only the reviewer account. Remove DEMO_PASSWORD from build/runtime configuration after seeding if it is not needed there.
7. Deploy. Verify HTTPS, HSTS, secure HttpOnly session cookie, SameSite, no-store API responses, and the five required pages. Read build/runtime logs without exposing credentials.
8. Run the browser workflow with `E2E_BASE_URL=https://ACTUAL_HOST` and verify real HTTP concurrency: one 200, one 410, owner count 1. Run against the assessment's synthetic data only. Verify public, protected, wrong key/count 0, correct key/count 1, time expiry, revoke, and owner denial. Verify the actual reviewer account separately.
9. Record the real production address and verification time in the private submission pack. A successful local build is not a verified live deployment.

## Git commands when authentication is ready

```sh
git status --short
git check-ignore .env .env.test
# Follow the secret review in VERIFICATION.md before the commit/push.
git add .
git commit -m "Implement secure note sharing and PostgreSQL concurrency tests"
git branch -M main
# Create the repository on GitHub first, or with authenticated gh:
gh repo create oyadarsh-hue/secure-note-sharing-app --public --source=. --remote=origin --push
```

If a repository is already created, use `git remote add origin https://github.com/oyadarsh-hue/secure-note-sharing-app.git` and `git push -u origin main`. Never overwrite an existing remote or force-push unrelated history. This URL is a requested destination until a successful remote verification establishes it as a deliverable.

## Operations

- Schedule expired rate-limit row cleanup. Add a note-retention policy before real users store private data.
- Use pool limits appropriate to serverless concurrency and monitor database connections, access errors and throttling.
- Back up the database with provider-managed encryption; restrict administrator access.
- Rotate auth secrets to invalidate sessions if needed. Disable/restrict registration when the assessment is complete and take down the synthetic demo.
- Review preview environments: each needs its own auth origin and preferably isolated data.

# Vercel assessment build

`vercel.json` applies committed migrations, seeds the dedicated reviewer account, and builds the application. Configure a real PostgreSQL `DATABASE_URL`, assigned HTTPS `NEXTAUTH_URL`, random `NEXTAUTH_SECRET`, `DEMO_EMAIL`, `DEMO_PASSWORD`, and `TRUSTED_PROXY=vercel` before deploying. Never use the `.env.example` placeholders in production. Each deployment resets only the configured demo account's password to `DEMO_PASSWORD`; do not configure a personal account here. Preview deployments require a separate database and their own environment values; do not connect previews to the assessment production database.
