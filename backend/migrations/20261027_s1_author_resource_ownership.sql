-- S1 release gate: authors may manage only their own draft resources and files.
-- Apply after 20261015_p0_article_source_read_access.sql, first on staging after backup.
-- This file is committed but has not been applied to a live project by this build.
begin;

alter table public.resources
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists resources_created_by_idx on public.resources(created_by);

update storage.buckets
set public=false,
    file_size_limit=262144000,
    allowed_mime_types=array[
      'application/pdf','application/epub+zip',
      'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg',
      'video/mp4','video/webm',
      'text/plain','text/vtt','application/x-subrip',
      'image/jpeg','image/png','image/webp'
    ]
where id='resource-files';

create or replace function private.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role in ('admin','editor')
  );
$$;
revoke all on function private.is_editor_or_admin() from public,anon;
grant execute on function private.is_editor_or_admin() to authenticated;

drop policy if exists "authenticated resource manager access" on public.resources;
drop policy if exists "resource managers insert resources" on public.resources;
drop policy if exists "resource managers update resources" on public.resources;
drop policy if exists "resources select own or staff" on public.resources;
drop policy if exists "resources insert staff or own draft" on public.resources;
drop policy if exists "resources update staff or own draft" on public.resources;

create policy "resources select own or staff"
on public.resources for select to authenticated using(
  status='published'
  or (select private.is_editor_or_admin())
  or (created_by=(select auth.uid()) and (select private.can_manage_resources()))
);
create policy "resources insert staff or own draft"
on public.resources for insert to authenticated with check(
  (select private.is_editor_or_admin())
  or (
    created_by=(select auth.uid())
    and (select private.can_manage_resources())
    and status in ('draft','archived')
  )
);
create policy "resources update staff or own draft"
on public.resources for update to authenticated using(
  (select private.is_editor_or_admin())
  or (
    created_by=(select auth.uid())
    and (select private.can_manage_resources())
    and status<>'published'
  )
) with check(
  (select private.is_editor_or_admin())
  or (
    created_by=(select auth.uid())
    and (select private.can_manage_resources())
    and status in ('draft','archived')
  )
);

-- Authors are confined to authors/<uid>/...; editors/admins retain bucket-wide access.
drop policy if exists "resource managers read resource files" on storage.objects;
drop policy if exists "resource managers upload resource files" on storage.objects;
drop policy if exists "resource managers update resource files" on storage.objects;
drop policy if exists "resource managers delete resource files" on storage.objects;
drop policy if exists "resource files read own or staff" on storage.objects;
drop policy if exists "resource files insert own or staff" on storage.objects;
drop policy if exists "resource files update own or staff" on storage.objects;
drop policy if exists "resource files delete own or staff" on storage.objects;

create policy "resource files read own or staff"
on storage.objects for select to authenticated using(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or (
      (select private.can_manage_resources())
      and name like 'authors/'||(select auth.uid())::text||'/%'
    )
  )
);
create policy "resource files insert own or staff"
on storage.objects for insert to authenticated with check(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or (
      (select private.can_manage_resources())
      and name like 'authors/'||(select auth.uid())::text||'/%'
    )
  )
);
create policy "resource files update own or staff"
on storage.objects for update to authenticated using(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or (
      (select private.can_manage_resources())
      and name like 'authors/'||(select auth.uid())::text||'/%'
    )
  )
) with check(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or (
      (select private.can_manage_resources())
      and name like 'authors/'||(select auth.uid())::text||'/%'
    )
  )
);
create policy "resource files delete own or staff"
on storage.objects for delete to authenticated using(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or (
      (select private.can_manage_resources())
      and name like 'authors/'||(select auth.uid())::text||'/%'
    )
  )
);

commit;
