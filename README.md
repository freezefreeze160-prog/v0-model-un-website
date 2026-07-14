# MUN Kazakhstan

The official Model United Nations platform for schools across Kazakhstan — conference registration, delegate applications, committee & country assignment, secretariat tools and news, in Kazakh, Russian and English.

## Tech stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Radix)
- **Supabase** — PostgreSQL, Auth, Storage, Row Level Security
- Deployed on **Vercel**

## Getting started

```bash
pnpm install
cp .env.example .env.local   # add your Supabase credentials
pnpm dev
```

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_URL`

## Database

The production database is a Supabase project. The authoritative schema lives in
**[`docs/DATABASE.md`](docs/DATABASE.md)**; incremental changes are tracked as
migrations in **`supabase/migrations/`**.

> ⚠️ The legacy `scripts/001_complete_setup.sql` did **not** match production and
> has been retired — do not run it. See `docs/DATABASE.md`.

## Documentation

- [`docs/AUDIT.md`](docs/AUDIT.md) — codebase & database audit
- [`docs/DATABASE.md`](docs/DATABASE.md) — current schema & migration guide

## Branding

The official product name is **MUN Kazakhstan**. Use it consistently across the
UI, metadata, emails and documentation.
