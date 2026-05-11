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

## License
All rights reserved by Abhimanyu Singh.
