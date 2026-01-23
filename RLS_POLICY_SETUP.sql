-- ========================================
-- RLS POLICY FOR PRESIDENTS TO CREATE EVENTS
-- ========================================
-- 
-- Location: Run this in Supabase SQL Editor
-- Database: nclubs-app
-- 
-- This policy allows authenticated users who are presidents 
-- of a club to create events for that specific club.
-- 
-- Requirements:
-- - User must be authenticated
-- - User must have a record in president_assignments table
-- - User's president_assignments.club_id must match events.club_id
--

create policy "president_create_event"
on public.events
for insert
to authenticated
with check (
  exists (
    select 1
    from president_assignments pa
    where pa.user_id = auth.uid()
      and pa.club_id = events.club_id
  )
);

-- ========================================
-- VERIFICATION QUERY
-- ========================================
-- 
-- Run this to check if the policy was created:
-- 

select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
from pg_policies 
where tablename = 'events' 
  and policyname = 'president_create_event';

