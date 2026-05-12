# LeadFlow

A single-screen, AI-augmented CRM for sales reps. Track leads, log every discussion, set follow-up reminders. Built as a coding assessment for [Es Magico](https://esmagico.in/), designed to ship as a real product.

## Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui (Vercel)
- **Backend:** Fastify + TypeScript + Prisma + zod (Render)
- **Database:** PostgreSQL 16 (Supabase in prod, Docker locally)
- **AI:** Groq (Whisper transcription + Llama 3.3 70B summarisation) — wiring up next
- **Auth:** Google OAuth via Auth.js v5 — wiring up next
- **Notifications:** Fast2SMS (SMS), Resend (email) — wiring up next

## Live demo
Live URL goes here once deployed.

## Local setup

Prereqs: Node 20+, pnpm 9+, Docker Desktop.

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres + Redis
docker compose up -d

# 3. Set up env vars
cp .env.example .env

# 4. Create the initial migration
pnpm --filter @leadflow/db migrate dev --name init

# 5. Seed sample data (8 leads, 20+ discussions, all statuses)
pnpm seed
# Copy the demo user id from the output. Paste it into NEXT_PUBLIC_DEV_USER_ID in .env

# 6. Start everything
pnpm --filter @leadflow/api dev   # API on :4000
pnpm --filter @leadflow/web dev   # Web on :3000
```

Open `http://localhost:3000`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run web + api in parallel |
| `pnpm seed` | Reset and seed the database |
| `pnpm typecheck` | Type-check every package |
| `pnpm format` | Prettier across all files |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:migrate` | Run pending migrations |

## API quick reference

Every route is user-scoped. During development send `X-User-Id: <demo-user-id>`; real Google OAuth via Auth.js lands shortly.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness check (UptimeRobot pings this) |
| GET | `/api/v1/leads?status=&q=&followUp=today\|overdue\|upcoming` | List leads with filters |
| POST | `/api/v1/leads` | Create a lead |
| GET | `/api/v1/leads/:id` | Lead + full discussion timeline |
| PATCH | `/api/v1/leads/:id` | Update name/company/phone/status |
| POST | `/api/v1/leads/:id/discussions` | Log a discussion (optional follow-up) |

Error shape is always `{ error: { code, message, details? } }`. Status codes: 200/201/204 success, 401 missing auth, 404 not found or cross-user, 422 validation, 500 server.

## Architecture notes

- **Monorepo with pnpm workspaces:** `apps/web` (Next), `apps/api` (Fastify), `packages/shared` (zod schemas), `packages/db` (Prisma client). Same TypeScript baseline (`tsconfig.base.json`).
- **Zod schemas in `@leadflow/shared`** are imported by both web and api - single source of validation truth across the wire.
- **`Lead` table has denormalised `lastDiscussionAt` and `nextFollowUpAt`** maintained transactionally on every discussion insert. Makes "today's follow-ups" and "sort by recent activity" indexed scans instead of joins.
- **Cross-user lookups return 404, not 403**, so a lead id cannot be probed by an unauthorised user.
- **Frontend Server Components fetch the API over HTTP** (not direct Prisma), keeping the architecture honest about the data path even when both apps share a host.
- **URL is the source of truth for filter and search state.** Refresh preserves state, sharing a link preserves state, back/forward works.

## Deployment

Ship order: Supabase → Render → Vercel → Google OAuth. ~15 minutes end-to-end.

### 1. Database (Supabase)
1. Create a project at https://supabase.com (free tier is fine)
2. **Project Settings → Database → Connection string → "Transaction pooler"** tab
3. Copy the URL and replace `[YOUR-PASSWORD]` with the project DB password (set when you created the project; if forgotten, click **Reset database password**)
4. Locally, run migrations against Supabase one time so the schema lands:
   ```
   DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres" \
     pnpm --filter @leadflow/db migrate:deploy
   ```

### 2. Backend (Render)
1. Push the repo to GitHub (already done)
2. https://render.com → **New** → **Blueprint** → connect this repo
3. Render reads `render.yaml` and prompts for the secrets:
   - `DATABASE_URL` → your Supabase Transaction-pooler URL from step 1
   - `GROQ_API_KEY` → from https://console.groq.com/keys
   - `FAST2SMS_API_KEY` → from https://www.fast2sms.com/dashboard/dev-api (skip if not using SMS)
   - `REDIS_URL` → leave blank (unused for now)
4. Deploy. Wait for green. Copy the service URL (e.g., `https://leadflow-api.onrender.com`).
5. (Recommended) https://uptimerobot.com free monitor pinging `https://your-render-url/health` every 5 minutes so the free dyno doesn't cold-start.

### 3. Frontend (Vercel)
1. https://vercel.com → **Add New** → **Project** → import the same GitHub repo
2. Vercel reads `vercel.json` and auto-configures build / output directory
3. Add **Environment Variables** (Settings → Environment Variables):

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | Same Supabase URL as Render. Used by the Auth.js `signIn` callback to upsert users. |
   | `NEXT_PUBLIC_API_URL` | Your Render API URL (e.g., `https://leadflow-api.onrender.com`) |
   | `API_INTERNAL_URL` | Same as above |
   | `AUTH_SECRET` | Run `openssl rand -base64 32` and paste the output. **Must be different from local.** |
   | `AUTH_TRUST_HOST` | `true` |
   | `AUTH_URL` | Your Vercel domain (e.g., `https://leadflow.vercel.app`) |
   | `AUTH_GOOGLE_ID` | From Google Cloud Console |
   | `AUTH_GOOGLE_SECRET` | From Google Cloud Console |
   | `NODE_ENV` | `production` |
4. Deploy. Copy the live URL.

### 4. Google OAuth — production redirect URI
1. https://console.cloud.google.com/apis/credentials → your OAuth 2.0 Client
2. Under **Authorized redirect URIs**, add:
   ```
   https://<your-vercel-domain>/api/auth/callback/google
   ```
3. Save. Without this, sign-in will fail with `redirect_uri_mismatch` on production.
4. If the OAuth consent screen is still in **Testing** mode, add any reviewer's Gmail under **Test users** (Es Magico / yourself).

### Why this order?
Supabase first because both Render and Vercel need its URL. Render before Vercel because Vercel needs the Render URL as `NEXT_PUBLIC_API_URL`. Google OAuth last because it needs the Vercel domain in the redirect URI.

## License
All rights reserved by Abhimanyu Singh.
