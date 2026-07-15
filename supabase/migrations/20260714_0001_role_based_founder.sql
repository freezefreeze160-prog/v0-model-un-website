-- ============================================================================
-- 0001 — Role-based founder (remove hardcoded email from RLS)
-- ============================================================================
-- Replaces every RLS policy that hardcodes the founder email
-- ('speed_777_speed@mail.ru') with a role-based check against profiles.role.
-- Additive & idempotent. No tables or data are dropped.
--
-- SAFETY: step 1 guarantees the existing founder keeps founder access before
-- the email fallback is removed, so no one is locked out. Apply this migration
-- BEFORE deploying the matching application code.
-- ============================================================================

begin;

-- 1. One-time data fix: make sure the current founder actually has role='founder'.
--    (Only elevates the single known founder account; safe to re-run.)
update public.profiles p
set role = 'founder'
from auth.users u
where p.user_id = u.id
  and u.email = 'speed_777_speed@mail.ru'
  and p.role is distinct from 'founder';

-- 2. Helper: does the current user hold one of the given roles?
--    SECURITY DEFINER so it can read profiles regardless of the caller's RLS.
create or replace function public.current_user_has_role(target_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid())
      and role = any(target_roles)
  );
$$;

revoke execute on function public.current_user_has_role(text[]) from anon;

-- 3. profiles — replace email-based founder policies with role-based.
drop policy if exists "Founder can delete any profile" on public.profiles;
create policy "Admins can delete profiles" on public.profiles
  for delete using (public.current_user_has_role(array['founder','admin']));

drop policy if exists "Founder can update any profile" on public.profiles;
create policy "Admins can update any profile" on public.profiles
  for update using (public.current_user_has_role(array['founder','admin']))
  with check (public.current_user_has_role(array['founder','admin']));

-- 4. user_conferences — drop the three email-based policies (role-based
--    equivalents already exist: "Founder can view all conferences" is replaced
--    by the existing "Approved conferences are viewable by everyone" +
--    "Users can view pending conferences"; update/delete covered by
--    "Founders and admins can update any conference" / creator policies).
drop policy if exists "Founder can view all conferences" on public.user_conferences;
drop policy if exists "Founder can delete all conferences" on public.user_conferences;
drop policy if exists "Founder can update all conferences" on public.user_conferences;

-- Ensure a role-based admin view policy exists (published already public).
drop policy if exists "Admins can view all conferences" on public.user_conferences;
create policy "Admins can view all conferences" on public.user_conferences
  for select using (
    status = 'published'
    or creator_id = (select auth.uid())
    or public.current_user_has_role(array['founder','admin'])
  );

-- 5. delegate_applications — drop the two email-based policies (role-based
--    "Founders can update any application" and creator policies remain).
drop policy if exists "Founder can view all applications" on public.delegate_applications;
drop policy if exists "Founder can update all applications" on public.delegate_applications;

drop policy if exists "Admins can view all applications" on public.delegate_applications;
create policy "Admins can view all applications" on public.delegate_applications
  for select using (
    user_id = (select auth.uid())
    or public.current_user_has_role(array['founder','admin'])
    or conference_id in (
      select id from public.user_conferences where creator_id = (select auth.uid())
    )
  );

-- 6. Fix the broken predicate on registrations ("Admins can see their
--    applications" used profiles.id = auth.uid(); should be profiles.user_id).
drop policy if exists "Admins can see their applications" on public.registrations;
create policy "Admins can see registrations" on public.registrations
  for select using (
    admin_id = (select auth.uid())
    or public.current_user_has_role(array['founder','general_secretary'])
  );

commit;
