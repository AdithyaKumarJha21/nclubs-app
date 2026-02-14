-- Run this in Supabase SQL Editor to enable club file uploads.
-- This script configures:
-- - storage bucket + mime/file-size restrictions
-- - public read access
-- - faculty/president/admin write/delete access
-- - hard DB trigger limit of 4 files per club

-- 1) Bucket (public, 10MB cap, PDF/PNG/JPEG only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club_public',
  'club_public',
  true,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Ensure helper exists for role checks.
create or replace function public.user_can_manage_club(uid uuid, target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.roles r on r.id = p.role_id
    where p.id = uid
      and lower(coalesce(r.name, '')) = 'admin'
  )
  or exists (
    select 1
    from public.faculty_assignments fa
    where fa.faculty_id = uid and fa.club_id = target_club_id
  )
  or exists (
    select 1
    from public.president_assignments pa
    where pa.user_id = uid and pa.club_id = target_club_id
  );
$$;

-- 3) Add optional metadata columns used by the app (safe if already present).
alter table public.club_files
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists description text;

-- 4) Hard-limit total non-logo files per club to 4.
create or replace function public.enforce_club_file_limit()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.file_type, 'document') = 'logo' then
    return new;
  end if;

  if (
    select count(*)
    from public.club_files cf
    where cf.club_id = new.club_id
      and coalesce(cf.file_type, 'document') <> 'logo'
  ) >= 4 then
    raise exception 'Each club can only have 4 files';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_club_file_limit on public.club_files;
create trigger trg_enforce_club_file_limit
before insert on public.club_files
for each row
execute function public.enforce_club_file_limit();

-- 5) Enable realtime payloads on club_files if not already configured.
alter table public.club_files replica identity full;
alter publication supabase_realtime add table public.club_files;

-- 6) RLS policies for club_files table
alter table public.club_files enable row level security;

create policy "club_files_select_all_v2"
on public.club_files
for select
to anon, authenticated
using (true);

create policy "club_files_insert_president_faculty_v2"
on public.club_files
for insert
to authenticated
with check (public.user_can_manage_club(auth.uid(), club_id));

create policy "club_files_delete_president_faculty_v2"
on public.club_files
for delete
to authenticated
using (public.user_can_manage_club(auth.uid(), club_id));

-- 7) Storage object policies for bucket club_public
create policy "club_public_select_all_v2"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'club_public');

create policy "club_public_insert_manager_v2"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'club_public'
  and split_part(name, '/', 1) in (
    select c.id::text
    from public.clubs c
    where public.user_can_manage_club(auth.uid(), c.id)
  )
);

create policy "club_public_delete_manager_v2"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'club_public'
  and split_part(name, '/', 1) in (
    select c.id::text
    from public.clubs c
    where public.user_can_manage_club(auth.uid(), c.id)
  )
);
