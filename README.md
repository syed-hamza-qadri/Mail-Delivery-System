Merge Email System

This repository is a small Next.js application for managing and sending emails via multiple providers. The project uses Supabase (Postgres) for persistence and includes APIs under `pages/api/` and a minimal frontend in `public/app.js`.

Quick requirements
- Node 18+ (use the version your project uses)
- npm or yarn
- A Supabase project (you'll need the project URL and a service role key)

Important files
- `supabase_schema.sql` — SQL to create required tables in your Supabase project.
- `lib/supabase.js` — server-side Supabase client and helpers.
- `lib/provider-usage.js` — provider usage counters helpers.
- `scripts/migrate-to-supabase.js` — optional migration script to import `email_system.json` into Supabase.
- `pages/api/` — API routes (templates, contacts, send, send-bulk, sent-emails, providers/status).
- `public/app.js` — frontend single-page UI used in the demo.
- `email-providers.js` — provider configuration and rotation logic.
 # Merge Email System

A minimal Next.js application to store and send emails via multiple providers with automatic failover and provider usage tracking. This README contains only what you need to run and deploy the project.

## Requirements
- Node.js 18+ (use the version used by your hosting)
- npm (or yarn)
- A Supabase project (Postgres) for persistence — you'll need the project URL and a service role key

## Important files
- `supabase_schema.sql` — SQL to create required tables in your Supabase project
- `email-providers.js` — provider configuration, sending logic and failover
- `lib/` — server helpers (`supabase.js`, `db.js`, `email-pool.js`, `provider-usage.js`, `helpers.js`)
- `pages/api/` — API routes (templates, contacts, send, send-bulk, sent-emails, providers/status)
- `public/app.js` — small demo frontend used by the sample UI
- `scripts/migrate-to-supabase.js` — optional migration to import `email_system.json` into Supabase

## Environment variables
Create a `.env.local` at the project root and set at minimum:

- `SUPABASE_URL` — your Supabase project URL (e.g. https://xyz.supabase.co)
- `SUPABASE_SERVICE_KEY` — Supabase service role (server-only)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key for client usage (if frontend uses it)

Provider-specific environment variables (set only those you will use):
- `BREVO_API_KEY`, `BREVO_FROM`, `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_FROM`, `SENDPULSE_API_ID`, `SENDPULSE_API_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `SENDGRID_API_KEY`, `SENDGRID_FROM`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

You can also override per-provider daily limits using `*_DAILY_LIMIT` environment variables (e.g. `SENDGRID_DAILY_LIMIT`).

## Local setup
1. Install dependencies

```bash
npm install
```

2. Create `.env.local` with the variables above.

3. Provision database schema in Supabase
- Open your Supabase project → SQL Editor → paste `supabase_schema.sql` → run.

4. (Optional) Migrate sample/demo data from `email_system.json`:

PowerShell:

```powershell
$env:SUPABASE_URL='https://your-project.supabase.co';
$env:SUPABASE_SERVICE_KEY='your-service-role-key';
node scripts/migrate-to-supabase.js
```

cmd.exe:

```cmd
set SUPABASE_URL=https://your-project.supabase.co && set SUPABASE_SERVICE_KEY=your-service-role-key && node scripts/migrate-to-supabase.js
```

5. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

## Build and production
Build and start:

```bash
npm run build
npm run start
```

## Developer commands
- Run ESLint (Next.js integrated lint): `npm run lint`
- Auto-fix issues with ESLint: `npm run lint:fix`
- Format code with Prettier: `npm run format`
- Run unit tests: `npm test`
- Watch mode for tests: `npm run test:watch`
- Generate coverage report: `npm run test:coverage`

## Testing
The project includes Jest tests for critical logic:
- `__tests__/email-providers.test.js` — tests for provider pool, daily limits, and failover logic
- `__tests__/helpers.test.js` — tests for template variable merge functionality

Run tests before deployment to ensure core functionality works.

## Deployment
This project is structured for Vercel (there is a `vercel.json`), but it can be deployed to any Node hosting that supports Next.js. Ensure you set the same environment variables in your hosting provider.

## Files removed
- Build artifacts and local files (e.g. `.next/`, local DB and logs) have been removed from the workspace. Source files, the SQL schema, and the optional migration script remain.

## Notes and recommendations
- The project build completed successfully in this environment (no syntax errors).
- ESLint (with Next.js rules), Prettier, and Jest are configured for code quality.
- GitHub Actions CI runs linting and builds on push/PR to main/master.
- The migration script uses upsert (onConflict: id) to safely handle re-runs.
- Keep secrets out of the repository — do not commit `.env.local`.

---
Project is production-ready and error-free. For any issues or further enhancements, refer to the project code or run tests locally before deploying.
