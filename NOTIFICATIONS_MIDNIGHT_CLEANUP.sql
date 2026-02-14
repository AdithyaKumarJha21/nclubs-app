-- =====================================================
-- NOTIFICATIONS MIDNIGHT CLEANUP
-- =====================================================
-- Goal:
--   1) Keep only today's notifications visible in the app.
--   2) Automatically delete previous-day notifications at 00:00 (UTC)
--      so the table does not keep growing with stale data.
--
-- Run this script once in Supabase SQL editor.

-- Ensure pg_cron exists (available on Supabase projects).
create extension if not exists pg_cron;

-- Delete all notifications created before the current UTC day.
create or replace function public.cleanup_expired_notifications()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.notifications
  where created_at < date_trunc('day', now() at time zone 'utc');
end;
$$;

-- Allow the scheduler to execute the function.
grant execute on function public.cleanup_expired_notifications() to postgres;

-- Remove previous schedule if this script is rerun.
select cron.unschedule(jobid)
from cron.job
where jobname = 'notifications_midnight_cleanup_utc';

-- Schedule cleanup every day at 00:00 UTC.
select cron.schedule(
  'notifications_midnight_cleanup_utc',
  '0 0 * * *',
  $$select public.cleanup_expired_notifications();$$
);
