-- S1 hardening: Authors may only manage THEIR OWN draft resources and files.
-- Apply AFTER 20261014_vnext_articles.sql and 20261015_p0_article_source_read_access.sql,
-- first on Development/Staging, after a backup. Not applied to any live database.
--
-- Before: any Author could insert/update EVERY resource (including setting status='published'
--         or rewriting source_url of public resources) and delete ANY object in resource-files.
-- After:  Admin/Editor unchanged. Author: own rows only (created_by), never 'published',
--         own Storage folder only (authors/<uid>/...). Publishing is an Editor/Admin action.
--
-- Rollback: re-create the policies "resource managers *" from 20261014_vnext_articles.sql
--           (drop the policies created below first). The created_by column is harmless to keep.
begin;

alter table public.resources add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
create index if not exists resources_created_by_idx on public.resources(created_by);

-- Policy helpers (same style as existing private.* helpers).
create or replace function private.is_editor_or_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin','editor'));
$$;
revoke all on function private.is_editor_or_admin() from public,anon;
grant execute on function private.is_editor_or_admin() to authenticated;

drop policy if exists "authenticated resource manager access" on public.resources;
drop policy if exists "resource managers insert resources" on public.resources;
drop policy if exists "resource managers update resources" on public.resources;

create policy "resources select own or staff" on public.resources for select to authenticated using(
  status='published'
  or (select private.is_editor_or_admin())
  or (created_by=(select auth.uid()) and (select private.can_manage_resources()))
);
create policy "resources insert staff or own draft" on public.resources for insert to authenticated with check(
  (select private.is_editor_or_admin())
  or (created_by=(select auth.uid()) and (select private.can_manage_resources()) and status in ('draft','archived'))
);
create policy "resources update staff or own draft" on public.resources for update to authenticated using(
  (select private.is_editor_or_admin())
  or (created_by=(select auth.uid()) and (select private.can_manage_resources()) and status<>'published')
) with check(
  (select private.is_editor_or_admin())
  or (created_by=(select auth.uid()) and (select private.can_manage_resources()) and status in ('draft','archived'))
);

-- Storage: Authors are confined to authors/<uid>/...; Editors/Admins keep the whole bucket.
drop policy if exists "resource managers read resource files" on storage.objects;
drop policy if exists "resource managers upload resource files" on storage.objects;
drop policy if exists "resource managers update resource files" on storage.objects;
drop policy if exists "resource managers delete resource files" on storage.objects;

create policy "resource files read own or staff" on storage.objects for select to authenticated using(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or ((select private.can_manage_resources()) and name like 'authors/'||(select auth.uid())::text||'/%')
  )
);
create policy "resource files insert own or staff" on storage.objects for insert to authenticated with check(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or ((select private.can_manage_resources()) and name like 'authors/'||(select auth.uid())::text||'/%')
  )
);
create policy "resource files update own or staff" on storage.objects for update to authenticated using(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or ((select private.can_manage_resources()) and name like 'authors/'||(select auth.uid())::text||'/%')
  )
) with check(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or ((select private.can_manage_resources()) and name like 'authors/'||(select auth.uid())::text||'/%')
  )
);
create policy "resource files delete own or staff" on storage.objects for delete to authenticated using(
  bucket_id='resource-files' and (
    (select private.is_editor_or_admin())
    or ((select private.can_manage_resources()) and name like 'authors/'||(select auth.uid())::text||'/%')
  )
);

commit;
