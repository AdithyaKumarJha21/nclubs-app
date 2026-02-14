-- Run this in Supabase SQL editor to enable club gallery management.
-- 1) Storage bucket for public club gallery images
insert into storage.buckets (id, name, public)
values ('club-public', 'club-public', true)
on conflict (id) do nothing;

-- 2) Metadata table for gallery images + ordering
create table if not exists public.club_gallery_images (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  bucket text not null default 'club-public',
  path text not null,
  order_index integer not null,
  file_type text not null default 'gallery',
  uploader_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, path)
);

create index if not exists club_gallery_images_club_order_idx
  on public.club_gallery_images (club_id, order_index);

-- 3) Hard limit: max 5 images per club
create or replace function public.enforce_club_gallery_limit()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.club_gallery_images
    where club_id = new.club_id
  ) >= 5 then
    raise exception 'Each club can only have 5 gallery images';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_club_gallery_limit on public.club_gallery_images;
create trigger trg_enforce_club_gallery_limit
before insert on public.club_gallery_images
for each row execute function public.enforce_club_gallery_limit();

-- 4) Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_club_gallery_images_touch_updated_at on public.club_gallery_images;
create trigger trg_club_gallery_images_touch_updated_at
before update on public.club_gallery_images
for each row execute function public.touch_updated_at();

-- 5) Enable RLS
alter table public.club_gallery_images enable row level security;

-- 6) Public read policy
create policy "club_gallery_public_read"
on public.club_gallery_images
for select
using (true);

-- 7) Faculty/President write policies

-- Helper used by RLS: true for admin/faculty/president assigned to a club
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

create policy "club_gallery_manager_insert"
on public.club_gallery_images
for insert
to authenticated
with check (
  public.user_can_manage_club(auth.uid(), club_id)
);

create policy "club_gallery_manager_update"
on public.club_gallery_images
for update
to authenticated
using (public.user_can_manage_club(auth.uid(), club_id))
with check (public.user_can_manage_club(auth.uid(), club_id));

create policy "club_gallery_manager_delete"
on public.club_gallery_images
for delete
to authenticated
using (public.user_can_manage_club(auth.uid(), club_id));

-- 8) Storage policies (bucket: club-public)
create policy "club_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'club-public');

create policy "club_public_insert_manager"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'club-public'
  and split_part(name, '/', 1) in (
    select c.id::text
    from public.clubs c
    where public.user_can_manage_club(auth.uid(), c.id)
  )
);

create policy "club_public_delete_manager"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'club-public'
  and split_part(name, '/', 1) in (
    select c.id::text
    from public.clubs c
    where public.user_can_manage_club(auth.uid(), c.id)
  )
);
