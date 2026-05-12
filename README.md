# LeadFlow

A single-screen, AI-augmented CRM for sales reps. Track leads, log every discussion, set follow-up reminders. Built as a coding assessment for [Es Magico](https://esmagico.in/), designed to ship as a real product.

**Live:** https://lead-flow-web-5mdc.vercel.app/

## Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui — deployed to **Vercel**
- **Backend:** Fastify + TypeScript + Prisma + zod — deployed to **Render**
- **Database:** PostgreSQL on **Supabase** (Sydney pooler)
- **AI:** Groq (Whisper transcription + Llama 3.3 70B summarisation)
- **Auth:** Google OAuth via Auth.js v5
- **Notifications:** Fast2SMS (SMS), Resend (email — scaffolded)

## Architecture

```
┌──────────────┐    HTTPS    ┌──────────────┐    TCP     ┌──────────────┐
│              │ ──────────► │              │ ─────────► │              │
│   Vercel     │             │    Render    │            │   Supabase   │
│              │ ◄────────── │              │ ◄───────── │              │
│  Next.js     │  JSON       │   Fastify    │   rows     │  PostgreSQL  │
│  UI + Auth   │             │  + Prisma    │            │              │
└──────────────┘             └──────────────┘            └──────────────┘
   no DB libs                owns all DB ops              just Postgres
```

The frontend is intentionally thin — UI, auth callbacks, and HTTPS calls. **No database libraries.** When Auth.js needs to upsert a user after Google sign-in, it makes a server-to-server fetch to `POST /api/v1/auth/google-user` on Render. Render owns all Prisma calls. Single source of truth for data operations.

A shared `INTERNAL_API_TOKEN` header authenticates server-to-server requests between Vercel functions and Render (the browser never sees this token).

## Local setup

Prereqs: Node 20+, pnpm 9+, Docker Desktop.

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Postgres + Redis (Docker Compose)
docker compose up -d

# 3. Set up env vars
cp .env.example .env

# 4. Create the initial migration locally
pnpm --filter @leadflow/db migrate dev --name init

# 5. Seed sample data (8 leads, 20+ discussions, every status)
pnpm seed
# Note the demo user id printed at the end - paste into NEXT_PUBLIC_DEV_USER_ID in .env

# 6. Start both servers
pnpm --filter @leadflow/api dev   # API on :4000
pnpm --filter @leadflow/web dev   # Web on :3000
```

Open `http://localhost:3000`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run web + api in parallel |
| `pnpm seed` | Reset and seed the local database |
| `pnpm typecheck` | Type-check every package |
| `pnpm format` | Prettier across all files |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:migrate` | Run pending migrations |

## API quick reference

All business routes are user-scoped (the Fastify auth middleware ensures `request.userId` is set). The Vercel frontend authenticates Server Components / mutations against the API via an `X-User-Id` header derived from the user's verified Auth.js session.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness check (UptimeRobot pings this) |
| `POST` | `/api/v1/auth/google-user` | **Internal-only** — called server-to-server by Vercel's Auth.js after Google sign-in. Requires `X-Internal-Token` header. Upserts the user. |
| `GET` | `/api/v1/me` | Current user profile + settings |
| `PATCH` | `/api/v1/me` | Update name / summarisation prompt / SMS prefs |
| `POST` | `/api/v1/me/seed` | One-shot demo seed for the current user |
| `GET` | `/api/v1/leads?status=&q=&followUp=today\|overdue\|upcoming` | List leads with filters |
| `POST` | `/api/v1/leads` | Create a lead |
| `GET` | `/api/v1/leads/:id` | Lead + full discussion timeline |
| `PATCH` | `/api/v1/leads/:id` | Update name / company / phone / status |
| `POST` | `/api/v1/leads/:id/discussions` | Log a discussion (optional follow-up date) |
| `POST` | `/api/v1/leads/:id/transcriptions` | Multipart audio upload → Whisper → Llama → new discussion |
| `POST` | `/api/v1/discussions/:id/summarize` | AI summarise a discussion using the user's prompt |

Errors always look like `{ error: { code, message, details? } }`. Status codes: 200/201/204 success, 401 missing auth, 404 not found or cross-user, 422 validation, 502 upstream AI error, 500 server.

## Architecture notes

- **Monorepo with pnpm workspaces:** `apps/web` (Next), `apps/api` (Fastify), `packages/shared` (zod schemas — used by both apps), `packages/db` (Prisma client — used by Render only).
- **Zod schemas in `@leadflow/shared`** are imported by both web and api — single source of validation truth across the wire.
- **`Lead` has denormalised `lastDiscussionAt` and `nextFollowUpAt`** maintained transactionally on every discussion insert. Indexed scans for "today's follow-ups" and "sort by recent activity" instead of joins.
- **Cross-user lookups return 404, not 403** — prevents lead-id enumeration by unauthorised users.
- **Frontend Server Components fetch the API over HTTPS** (not directly to Prisma), keeping the architecture honest about data direction even in local dev.
- **URL is the source of truth for filter and search state.** Refresh preserves state, sharing a link preserves state, back/forward works.

## Deployment

End-to-end in 15 minutes: **Supabase → Render → Vercel → Google OAuth**.

### 1. Database (Supabase)
1. Create a project at https://supabase.com
2. **Project Settings → Database → Connection string → Transaction pooler tab**
3. Copy the URL, replace `[YOUR-PASSWORD]` with the project's DB password
4. Run migrations locally one time so the schema lands in Supabase:
   ```bash
   DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres" \
     pnpm --filter @leadflow/db migrate:deploy
   ```

### 2. Backend (Render)
1. https://render.com → **New → Blueprint** → connect this repo → Render reads `render.yaml`
2. Provide the prompted secrets:
   ```
   DATABASE_URL=postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   DIRECT_URL=postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres
   GROQ_API_KEY=<your-groq-key>
   FAST2SMS_API_KEY=<your-fast2sms-key>
   INTERNAL_API_TOKEN=<generate one: `openssl rand -base64 32`>
   ```
3. Deploy. Health check hits `/health`. Copy the Render URL.
4. (Recommended) [UptimeRobot](https://uptimerobot.com) free monitor pinging `/health` every 5 minutes keeps the free dyno warm.

### 3. Frontend (Vercel)
1. https://vercel.com → **Add New → Project** → import this repo. **Root Directory: `apps/web`.**
2. Environment Variables — paste:
   ```
   NEXT_PUBLIC_API_URL=https://<your-render-url>.onrender.com
   API_INTERNAL_URL=https://<your-render-url>.onrender.com
   INTERNAL_API_TOKEN=<same value as Render>
   AUTH_SECRET=<generate: `openssl rand -base64 32`>
   AUTH_TRUST_HOST=true
   AUTH_URL=https://<your-vercel-domain>.vercel.app
   AUTH_GOOGLE_ID=<google-oauth-client-id>
   AUTH_GOOGLE_SECRET=<google-oauth-client-secret>
   NODE_ENV=production
   ```
3. Deploy. **Note:** Vercel has no `DATABASE_URL` — the frontend never touches the database directly.

### 4. Google OAuth
1. https://console.cloud.google.com/apis/credentials → your OAuth Client ID
2. **Authorized redirect URIs** → add:
   ```
   https://<your-vercel-domain>.vercel.app/api/auth/callback/google
   ```
3. If still in Testing mode, add reviewer Gmail accounts under **Test users** on the consent screen.

## License
All rights reserved by Abhimanyu Singh.
