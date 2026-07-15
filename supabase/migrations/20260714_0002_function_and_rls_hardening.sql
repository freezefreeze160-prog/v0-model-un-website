-- ============================================================================
-- 0002 — Function & RLS hardening
-- ============================================================================
-- 1. Pin search_path on flagged functions (advisor 0011).
-- 2. Revoke anon EXECUTE on privileged RPCs so logged-out visitors can no
--    longer call them (advisor 0028). The app calls them as authenticated
--    users, which is unaffected.
-- 3. Tighten INSERT policies that were WITH CHECK (true) (advisor 0024).
--    Trigger/definer functions bypass RLS, so tightening direct inserts is safe.
-- 4. Drop exact-duplicate policies.
-- Additive & reversible. No tables or data are dropped.
-- ============================================================================

begin;

-- 1. Pin search_path -----------------------------------------------------------
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.notify_application_status() set search_path = public, pg_temp;
alter function public.update_conference_committees_updated_at() set search_path = public, pg_temp;
alter function public.admin_update_team_member(uuid, boolean, text) set search_path = public, pg_temp;

-- 2. Revoke anon EXECUTE on privileged RPCs -----------------------------------
revoke execute on function public.admin_delete_user(uuid) from anon;
revoke execute on function public.admin_update_team_member(uuid, boolean, text) from anon;
revoke execute on function public.admin_update_user_region(uuid, integer) from anon;
revoke execute on function public.admin_update_user_role(uuid, text) from anon;
revoke execute on function public.approve_conference(uuid, uuid) from anon;
revoke execute on function public.approve_conference_request(uuid, uuid, text) from anon;
revoke execute on function public.assign_delegate(uuid, uuid, text) from anon;
revoke execute on function public.assign_deputy_to_general_secretary(uuid, uuid) from anon;
revoke execute on function public.can_manage_application(uuid, uuid) from anon;
revoke execute on function public.delete_conference(uuid) from anon;
revoke execute on function public.get_assigned_deputy(uuid) from anon;
revoke execute on function public.log_action(uuid, text, text, uuid, jsonb) from anon;
revoke execute on function public.reject_conference(uuid) from anon;
revoke execute on function public.toggle_conference_registration(uuid, boolean) from anon;
revoke execute on function public.update_application_status(uuid, text) from anon;

-- Trigger-only functions: not meant to be called via the API at all.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.notify_application_status() from anon, authenticated;

-- 3. Tighten always-true INSERT policies --------------------------------------
-- action_logs & notifications: real inserts come from SECURITY DEFINER
-- functions/triggers (which bypass RLS), so require auth for any direct insert.
drop policy if exists "System can insert logs" on public.action_logs;
create policy "Authenticated can insert logs" on public.action_logs
  for insert to authenticated with check (true);

drop policy if exists "System can insert" on public.notifications;
create policy "Authenticated can insert notifications" on public.notifications
  for insert to authenticated with check (true);

-- registrations: drop the duplicate, keep one that requires a signed-in user.
drop policy if exists "Allow insert for all" on public.registrations;
drop policy if exists "Anyone can insert registrations" on public.registrations;
create policy "Signed-in users can register" on public.registrations
  for insert to authenticated with check (auth.uid() is not null);

-- delegate_applications: remove the always-true policy; require the row to
-- belong to the caller (the app already sets user_id = auth.uid()).
drop policy if exists "Anyone can submit delegate applications" on public.delegate_applications;
drop policy if exists "Users can create applications" on public.delegate_applications;
create policy "Users can submit their own applications" on public.delegate_applications
  for insert to authenticated with check (auth.uid() = user_id);

-- 4. Drop exact-duplicate SELECT/UPDATE policies ------------------------------
drop policy if exists "Users can view their own registrations" on public.registrations; -- dup of "Users can view own registrations"
drop policy if exists "Founders can update any conference" on public.user_conferences;   -- dup of "Founders and admins can update any conference"

commit;
