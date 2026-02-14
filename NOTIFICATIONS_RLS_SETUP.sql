-- =====================================================
-- NOTIFICATIONS RLS STUDENT VISIBILITY PATCH
-- =====================================================
-- Based on existing policies shown in dashboard:
-- - notifications_read_for_assigned_club (SELECT)
-- This can exclude students who are not in club assignment tables.
--
-- This patch keeps your current insert/delete policies and adds a
-- student-only SELECT policy so students can read all notifications.

-- 1) Ensure RLS is enabled
alter table if exists public.notifications enable row level security;

-- 2) Add student read-all policy (safe + idempotent)
drop policy if exists "student_can_read_all_notifications" on public.notifications;
create policy "student_can_read_all_notifications"
on public.notifications
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and lower(r.name) = 'student'
  )
);

-- 3) (Optional) If admin should always read all notifications, enable this.
-- Uncomment if needed.
-- drop policy if exists "admin_can_read_all_notifications" on public.notifications;
-- create policy "admin_can_read_all_notifications"
-- on public.notifications
-- for select
-- to authenticated
-- using (
--   exists (
--     select 1
--     from public.profiles p
--     join public.roles r on r.id = p.role_id
--     where p.id = auth.uid()
--       and lower(r.name) = 'admin'
--   )
-- );

-- 4) Verify SELECT policies now applied to notifications
select schemaname, tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'notifications'
  and cmd = 'SELECT'
order by policyname;
