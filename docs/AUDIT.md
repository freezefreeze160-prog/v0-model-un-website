# MUN Kazakhstan — Codebase & Database Audit

**Date:** 2026-07-14
**Scope:** Existing production app (`main` branch) + live Supabase project `MUNNISDatabase` (`vodtmdduljajlgybzxep`).
**Rule followed:** Read-only audit. No code or database changes were made to produce this report.

---

## 0. Most important finding — the repo SQL is stale; production is the source of truth

The database was built **ad-hoc through the Supabase SQL editor**, not through tracked migrations (`list_migrations` returns empty). As a result:

- The repo file `scripts/001_complete_setup.sql` **does not match production**. It creates only 5 tables with different columns, and is missing `registrations`, `notifications`, `action_logs`, ~20 database functions, and dozens of columns that production actually has.
- ⚠️ **Do NOT run `scripts/001_complete_setup.sql` against production.** It would conflict with the live schema. It should be treated as dead/misleading and replaced by an accurate schema dump.

**Production data volume:** only `profiles` has data (1 row — the founder account). All other tables are empty. Changes are therefore low-risk today, but the zero-data-loss rule still applies.

### Actual production tables (8)

| Table | Rows | Purpose |
|---|---|---|
| `profiles` | 1 | users, role, region, bio, photo, team fields |
| `registrations` | 0 | **legacy** registration table (conference as varchar `almaty_mun_2025`) |
| `user_conferences` | 0 | conferences (multilingual, status, fees, approval) |
| `delegate_applications` | 0 | **current** application table (committee prefs, assignment) |
| `conference_committees` | 0 | committees (countries[], capacity, priority) |
| `news` | 0 | multilingual news |
| `action_logs` | 0 | audit log (jsonb details) |
| `notifications` | 0 | in-app notifications (type, title, body, read_at) |

Production also has ~20 `SECURITY DEFINER` functions (`approve_conference`, `assign_delegate`, `update_application_status`, `admin_update_user_role`, `admin_delete_user`, `log_action`, `notify_application_status`, `handle_new_user`, …) — the app logic lives largely in the database.

---

## 1. Database inconsistencies

1. **Hardcoded founder email in RLS policies.** `speed_777_speed@mail.ru` is baked into policies on `profiles`, `user_conferences`, and `delegate_applications` (e.g. *"Founder can update all conferences"*). This is a database-level hardcode, not just a code smell — it must be replaced with role-based checks (`profiles.role = 'founder'`).
2. **Duplicate / overlapping RLS policies.** Heavy accumulation from iterative editing:
   - `user_conferences`: ~5 overlapping UPDATE policies and 4 SELECT policies that all say roughly the same thing.
   - `registrations`: two identical INSERT policies (*"Anyone can insert registrations"* + *"Allow insert for all"*), and two overlapping SELECT policies.
   - `delegate_applications`: multiple redundant SELECT/UPDATE policies (creator, founder-by-email, founder-by-role — three ways to express one rule).
   - This is the root cause of the **54 "Multiple Permissive Policies"** performance warnings.
3. **Broken policy predicate.** `registrations` policy *"Admins can see their applications"* checks `profiles.id = auth.uid()`, but `profiles.id` is the profile PK — it should be `profiles.user_id = auth.uid()`. As written it never matches.
4. **Two parallel registration systems.** `registrations` (legacy) and `delegate_applications` (current) coexist. `app/dashboard` reads `registrations`; `app/register` writes `delegate_applications`. They will never show each other's data.
5. **Form fields silently dropped.** `app/register/page.tsx` collects `grade` (8–12) and `school`, but the insert into `delegate_applications` omits them, and the table has no `grade` column. Data entered by the user is discarded.
6. **Overly permissive INSERT policies** (`WITH CHECK (true)`) on `registrations`, `delegate_applications`, `notifications`, `action_logs` — anyone can insert arbitrary rows.

## 2. Missing columns / tables (relative to requested features)

- **Public profiles** need: `username` (public URL slug), `city`, `grade`, `school`, `mun_experience`, `awards`. `profiles` currently has only `region` (int), `bio`, `photo_url`. (`awards` should be its own table.)
- **Certificates** — no table exists. Needed for Participation / Honorable Mention / Outstanding / Best Delegate + public verification.
- **Position papers** — no table / storage bucket exists.
- **Messaging** (delegate ↔ secretariat) — no table exists (`notifications` is one-way only).
- **Analytics** — no rollup/materialization; would be computed on the fly.

## 3. Dead / misleading code

- `scripts/001_complete_setup.sql` — stale, does not match production (see §0).
- `lib/roles.ts` → `VERIFICATION_CODES` + `validateVerificationCode()` — plaintext access codes (`Founder1`, `Administrator{N}`, …) that the **actual signup flow never calls** (`lib/auth-actions.ts` assigns `founder` purely by email match, everyone else `participant`). Dead and insecure.
- `README.md` describes the auto-generated v0 template, not the app.

## 4. Security issues

| # | Issue | Where |
|---|---|---|
| S1 | Hardcoded founder email | `lib/roles.ts` (`FOUNDER_EMAIL`), `components/header.tsx` (×2), `app/admin`, `app/create-conference`, `lib/auth-actions.ts`, **and DB RLS policies** |
| S2 | Plaintext verification codes | `lib/roles.ts` (dead code, still a leak of the scheme) |
| S3 | ~20 `SECURITY DEFINER` functions executable by **anon** and **authenticated** | e.g. `admin_delete_user`, `admin_update_user_role`, `assign_delegate`, `approve_conference`, `delete_conference`. If any lacks an internal caller-role check, this is privilege escalation via `/rest/v1/rpc/...` |
| S4 | 4 functions with mutable `search_path` | `handle_new_user`, `update_conference_committees_updated_at`, `admin_update_team_member`, `notify_application_status` |
| S5 | Client-side authorization | role gating computed in the browser (`header.tsx`, `admin/page.tsx`) |
| S6 | Build-error suppression | `next.config.mjs` sets `ignoreBuildErrors` + `ignoreDuringBuilds` — real type/lint errors ship to production |
| S7 | Leaked-password protection disabled | Supabase Auth setting (HaveIBeenPwned check off) |
| S8 | Over-permissive INSERT RLS | see §1.6 |

## 5. UI inconsistencies (branding & design)

- **Inconsistent product name:** `app/layout.tsx` title = "MUNX Казахстан"; `components/header.tsx` logo = "MUNX NIS"; `lib/translations.ts` = "MUNX NIS" (×3); `README.md` = "Model UN website". → standardize to **MUN Kazakhstan** everywhere (logo, `<title>`, metadata, nav, footer, emails, social/OG tags, docs).
- **About page off-brand:** `app/about/page.tsx` is hardcoded **Russian-only** (bypasses the i18n system) and hardcoded **blue `#0055aa`**, clashing with the site's green NIS theme.
- Generic image `alt` text ("Student 1"…"Student 4") on the homepage.

## 6. Performance issues (from Supabase advisors)

- **35 × Auth RLS InitPlan** — policies call `auth.uid()` bare, re-evaluated per row. Fix: wrap as `(select auth.uid())`.
- **54 × Multiple Permissive Policies** — redundant policies multiply per-row checks (see §1.2). Consolidating fixes both correctness and speed.
- **26 × Unused Index**, **2 × Duplicate Index**, **2 × Unindexed Foreign Key**.
- `next.config.mjs` sets `images.unoptimized: true`.

## 7. Accessibility issues

- Icon-only buttons without `aria-label` (theme toggle, language switch in `header.tsx`).
- Language buttons don't expose active state to assistive tech (`aria-pressed`).
- Generic/duplicate `alt` text (§5).
- Colour-only status cues in some badges; verify contrast of the green theme in dark mode.

---

## 8. Proposed incremental plan (nothing here is done yet)

Ordered to be backward-compatible, smallest-risk first. Each DB change ships as its own incremental migration in `supabase/migrations/`, additive only (no `DROP`).

**Phase A — safe, zero-risk**
1. Rebrand everything to **MUN Kazakhstan** (code strings, metadata, OG tags, README).
2. Fix the About page: use i18n + green theme.
3. Remove build-error suppression (`next.config.mjs`) and fix whatever surfaces.
4. Replace `scripts/001_complete_setup.sql` with an accurate schema dump + document it.

**Phase B — security hardening (needs your OK; changes RLS/functions)**
5. Migration: role-based policies replacing the hardcoded founder email; consolidate duplicate policies; wrap `auth.uid()`; fix the `profiles.id` predicate bug.
6. Migration: set `search_path` on the 4 functions; add caller-role checks / `REVOKE EXECUTE` on admin RPCs.
7. Remove dead verification-code + hardcoded-email code; keep role checks in the DB.
8. Enable leaked-password protection (Supabase dashboard setting).

**Phase C — new features (additive migrations + UI)**
9. Extend `profiles` (`username`, `city`, `grade`, `mun_experience`) + new `awards` table → public profile page.
10. `certificates` table + generation + public verification page.
11. `position_papers` table + Storage bucket + upload/review UI.
12. `messages` table + delegate↔secretariat UI (build on existing `notifications`).
13. Dashboard stats + analytics; improved search (delegate/school/city/conference/committee/awards).
14. Mobile responsiveness polish (same design language).

**Cross-cutting:** reconcile the `registrations` vs `delegate_applications` split (decide one system; migrate/redirect the other) — flagged for your decision since it touches core flow.

---

## 9. Items that need your decision before I touch them

1. **`registrations` vs `delegate_applications`** — which is the canonical application table? (Recommend standardizing on `delegate_applications`.)
2. **The ~20 admin RPC functions** — I need to read each function body to confirm whether it already checks the caller's role before I lock down `EXECUTE`. Confirm you want me to audit + harden these.
3. Any RLS/policy change touches authorization on live tables — per your rule I will stop and confirm each such migration before applying it to production.
