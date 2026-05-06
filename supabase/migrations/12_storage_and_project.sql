-- =============================================================
-- FI Teamspace — Part 12: storage buckets + project info fields
--
-- Adds public storage buckets `avatars` and `project-logos` for
-- file uploads, plus project social/website/logo columns on profiles.
-- =============================================================

-- -------------------------------------------------------------
-- Profile columns: project social links + logo
-- -------------------------------------------------------------
alter table public.profiles
  add column if not exists project_logo_url   text,
  add column if not exists project_website    text,
  add column if not exists project_linkedin   text,
  add column if not exists project_twitter    text,
  add column if not exists project_instagram  text;

-- -------------------------------------------------------------
-- Storage buckets
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('project-logos', 'project-logos', true)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Storage policies
-- Public read; authenticated users may write objects whose path
-- starts with their auth.uid() (folder = uid). Each user can only
-- upload to their own subfolder.
-- -------------------------------------------------------------

-- AVATARS
drop policy if exists avatars_select on storage.objects;
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;

create policy avatars_select on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_insert on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- PROJECT LOGOS
drop policy if exists logos_select on storage.objects;
drop policy if exists logos_insert on storage.objects;
drop policy if exists logos_update on storage.objects;
drop policy if exists logos_delete on storage.objects;

create policy logos_select on storage.objects
  for select using (bucket_id = 'project-logos');

create policy logos_insert on storage.objects
  for insert with check (
    bucket_id = 'project-logos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy logos_update on storage.objects
  for update using (
    bucket_id = 'project-logos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy logos_delete on storage.objects
  for delete using (
    bucket_id = 'project-logos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
