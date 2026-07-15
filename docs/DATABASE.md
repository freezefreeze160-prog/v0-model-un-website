# Database

The production database is a **Supabase** PostgreSQL project. This document is
the authoritative description of the live schema (the previous
`scripts/001_complete_setup.sql` was out of date and has been retired).

## How schema changes are made

The database predates any migration tooling — it was built directly in the
Supabase SQL editor, so there is **no baseline migration** that reproduces it
from scratch. Going forward, **every change ships as an incremental, additive
migration** in `supabase/migrations/` (never `DROP`ping tables or columns), and
is applied to production through Supabase. Each migration is dated and
documented.

## Tables (public schema)

| Table | Purpose |
| --- | --- |
| `profiles` | One row per user. `user_id` → `auth.users`. Fields: `full_name`, `role` (`participant`/`deputy`/`general_secretary`/`admin`/`founder`), `region` (int), `bio`, `photo_url`, `phone`, plus team fields (`supervisor_id`, `is_team_member`, `team_role`). |
| `user_conferences` | Conferences. Multilingual `name_/date_/description_/conditions_{ru,kk,en}`, `city`, `location`, `status` (`pending`/`approved`/`rejected`/`published`), `registration_open`, `registration_fee_amount/currency`, `approval_required`, `creator_id`, `assigned_deputy_id`. |
| `conference_committees` | Committees within a conference. `name`, `topic`, `countries[]`, `capacity`, `priority`, `languages[]`. |
| `delegate_applications` | **Current** application table. Committee preferences (`primary/secondary/third_committee_id`), `assigned_committee_id`, `assigned_country`, school fields (`school_type`, `school_nis_id`, `custom_school_name/_city`), `status`. |
| `registrations` | **Legacy** application table (`conference` as varchar). Being retired in favour of `delegate_applications` — see `docs/AUDIT.md` §1.4. |
| `news` | Multilingual news (`title_/content_{ru,kk,en}`, `author_id`). |
| `notifications` | In-app notifications (`type`, `title`, `body`, `data` jsonb, `read_at`). |
| `action_logs` | Audit trail (`action`, `target_type`, `target_id`, `details` jsonb). |

All tables have Row Level Security enabled.

## Database functions

The app relies on ~18 PL/pgSQL functions (most `SECURITY DEFINER`), including:
`handle_new_user` (trigger: auto-creates a profile on signup),
`notify_application_status` (trigger: notification on status change),
`approve_conference` / `reject_conference` / `approve_conference_request`,
`assign_delegate`, `update_application_status`, `can_manage_application`,
`assign_deputy_to_general_secretary`, `get_assigned_deputy`,
`toggle_conference_registration`, `delete_conference`, `log_action`, and the
`admin_*` user-management helpers.

> **Security note (tracked in `docs/AUDIT.md`):** several of these functions are
> currently executable by the `anon`/`authenticated` roles and some have a
> mutable `search_path`. Hardening them is Phase B of the enhancement plan.

## Migrations log

| File | What it does | Applied to prod? |
| --- | --- | --- |
| `20260714_0001_role_based_founder.sql` | Removes the hardcoded founder email from all RLS policies; makes founder/admin access role-based; guarantees the existing founder keeps access; fixes the broken `profiles.id` predicate on `registrations`. | ⏳ pending |
| `20260714_0002_function_and_rls_hardening.sql` | Pins `search_path` on 4 functions; revokes `anon` EXECUTE on privileged RPCs; tightens always-true INSERT policies; drops exact-duplicate policies. | ⏳ pending |

**Apply order:** run `0001` **before** deploying the matching app code (so the
founder's role is set first). Both are wrapped in transactions and are additive
(no `DROP TABLE`, no data deletion).

Still to do with a live connection (needs reading function bodies / testing):
- Add internal caller-role checks inside the privileged `admin_*` functions.
- Full `auth.uid()` → `(select auth.uid())` rewrite across policies (perf).
- Enable **Leaked Password Protection** (Supabase → Auth → Policies toggle).

## Getting a fresh schema dump

To regenerate an exact snapshot (requires the DB connection string):

```bash
supabase db dump --schema public -f docs/schema.sql
```
