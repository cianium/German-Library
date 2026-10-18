-- German Library v7.1 — production schema (hardened)
-- Curated resource access; Level Books + Special Books; mobile-first Admin.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'learner' check(role in ('learner','editor','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,role) values(new.id,'learner') on conflict(id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,role) select id,'learner' from auth.users on conflict(id) do nothing;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin','editor'));
$$;
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin');
$$;

create table if not exists public.levels(
  code text primary key check(code in ('A1','A2','B1','B2','C1','C2')),
  title_fa text not null,
  title_en text not null,
  description text not null default '',
  sort_order int not null default 1
);

create table if not exists public.courses(
  id text primary key,
  collection text not null default 'level',
  level_code text references public.levels(code) on delete restrict,
  title text not null,
  description text not null default '',
  is_core boolean not null default false,
  order_index int not null default 1,
  status text not null default 'draft' check(status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources(
  id text primary key,
  collection text not null default 'level',
  level_code text references public.levels(code) on delete restrict,
  course_id text references public.courses(id) on delete set null,
  title text not null,
  description text not null default '',
  type text not null default 'Website',
  skill text not null default 'Extra Practice',
  priority text not null default 'recommended' check(priority in ('essential','recommended','extra')),
  provider text not null default '',
  source_url text not null default '',
  source_storage_path text not null default '',
  pricing text not null default 'unknown' check(pricing in ('free','paid','unknown')),
  featured boolean not null default false,
  duration_minutes numeric(8,1) not null default 0 check(duration_minutes>=0),
  link_status text not null default 'unknown' check(link_status in ('unknown','ok','broken')),
  verified_at timestamptz,
  order_index int not null default 1,
  status text not null default 'draft' check(status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- v6 -> v7 migration
alter table public.courses add column if not exists collection text not null default 'level';
alter table public.resources add column if not exists collection text not null default 'level';
alter table public.courses alter column level_code drop not null;
alter table public.resources alter column level_code drop not null;
alter table public.resources add column if not exists source_storage_path text not null default '';
alter table public.resources add column if not exists featured boolean not null default false;
alter table public.resources add column if not exists duration_minutes numeric(8,1) not null default 0;
alter table public.resources add column if not exists link_status text not null default 'unknown';
alter table public.resources add column if not exists verified_at timestamptz;

-- Collection invariants.
do $$ begin
  if not exists(select 1 from pg_constraint where conname='courses_collection_check') then
    alter table public.courses add constraint courses_collection_check check(collection in ('level','special'));
  end if;
  if not exists(select 1 from pg_constraint where conname='courses_collection_level_check') then
    alter table public.courses add constraint courses_collection_level_check check((collection='level' and level_code is not null) or (collection='special' and level_code is null));
  end if;
  if not exists(select 1 from pg_constraint where conname='resources_collection_check') then
    alter table public.resources add constraint resources_collection_check check(collection in ('level','special'));
  end if;
  if not exists(select 1 from pg_constraint where conname='resources_collection_level_check') then
    alter table public.resources add constraint resources_collection_level_check check((collection='level' and level_code is not null) or (collection='special' and level_code is null));
  end if;
  if not exists(select 1 from pg_constraint where conname='resources_published_access_check') then
    alter table public.resources add constraint resources_published_access_check
      check(status<>'published' or nullif(btrim(source_url),'') is not null or nullif(btrim(source_storage_path),'') is not null);
  end if;
  if not exists(select 1 from pg_constraint where conname='resources_url_scheme_check') then
    alter table public.resources add constraint resources_url_scheme_check
      check(btrim(source_url)='' or btrim(source_url) ~* '^https?://');
  end if;
end $$;

-- Copy legacy media fields if present.
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='resources' and column_name='media_url') then
    execute 'update public.resources set source_url=media_url where coalesce(source_url,'''')='''' and coalesce(media_url,'''')<>''''';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='resources' and column_name='media_storage_path') then
    execute 'update public.resources set source_storage_path=media_storage_path where coalesce(source_storage_path,'''')='''' and coalesce(media_storage_path,'''')<>''''';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='resources' and column_name='duration_seconds') then
    execute 'update public.resources set duration_minutes=round((duration_seconds::numeric/60.0),1) where duration_minutes=0 and duration_seconds>0';
  end if;
end $$;

-- Legacy rows are CEFR rows unless explicitly migrated later.
update public.courses set collection='level' where collection is null or collection not in ('level','special');
update public.resources set collection='level' where collection is null or collection not in ('level','special');

-- One Core Book per CEFR level; Special Books can never be Core.
drop index if exists one_core_course_per_level;
create unique index one_core_course_per_level on public.courses(level_code) where collection='level' and is_core=true and status<>'archived';

create index if not exists resources_level_order on public.resources(level_code,order_index);
create index if not exists resources_course_order on public.resources(course_id,order_index);
create index if not exists resources_status on public.resources(status);
create index if not exists resources_collection on public.resources(collection,status);
create index if not exists courses_collection on public.courses(collection,status);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
drop trigger if exists resources_updated_at on public.resources;
create trigger resources_updated_at before update on public.resources for each row execute function public.set_updated_at();

-- Resource must match its Book Package context.
create or replace function public.validate_resource_course_context()
returns trigger language plpgsql set search_path='' as $$
declare c_level text; c_collection text; c_status text;
begin
  if new.course_id is not null then
    select level_code,collection,status into c_level,c_collection,c_status from public.courses where id=new.course_id;
    if c_collection is null then raise exception 'Unknown course_id: %',new.course_id; end if;
    if c_collection<>new.collection then raise exception 'Resource collection % does not match course collection %',new.collection,c_collection; end if;
    if c_collection='level' and c_level<>new.level_code then raise exception 'Resource level % does not match course level %',new.level_code,c_level; end if;
    if c_collection='special' and new.level_code is not null then raise exception 'Special resource must not have level_code'; end if;
    if new.status='published' and c_status<>'published' then raise exception 'Published resource requires a published Book'; end if;
  elsif new.collection='special' then
    raise exception 'Special resource must reference a Special Book';
  end if;
  return new;
end $$;
drop trigger if exists validate_resource_course_level on public.resources;
drop trigger if exists validate_resource_course_context on public.resources;
create trigger validate_resource_course_context before insert or update on public.resources for each row execute function public.validate_resource_course_context();

-- Special Books cannot be marked Core.
create or replace function public.validate_course_core_context()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.collection='special' and new.is_core then raise exception 'Special Book cannot be Core'; end if;
  if new.is_core and new.status<>'published' then raise exception 'Core Book must be published'; end if;
  if new.status<>'published' and exists(select 1 from public.resources r where r.course_id=new.id and r.status='published') then
    raise exception 'Book with Published resources must remain published';
  end if;
  if exists(
    select 1 from public.resources r where r.course_id=new.id and (
      r.collection<>new.collection
      or (new.collection='level' and r.level_code is distinct from new.level_code)
      or (new.collection='special' and r.level_code is not null)
    )
  ) then
    raise exception 'Book context does not match one or more child resources';
  end if;
  return new;
end $$;
drop trigger if exists validate_course_core_context on public.courses;
create trigger validate_course_core_context before insert or update on public.courses for each row execute function public.validate_course_core_context();

-- RLS + least-privilege grants
alter table public.profiles enable row level security;
alter table public.levels enable row level security;
alter table public.courses enable row level security;
alter table public.resources enable row level security;

-- Start from no browser privileges, then grant only what the app uses.
revoke all on table public.profiles,public.levels,public.courses,public.resources from anon,authenticated;

grant select on public.levels,public.courses,public.resources to anon,authenticated;
grant insert,update on public.levels,public.courses,public.resources to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "own profile select" on public.profiles;
drop policy if exists "staff profiles select" on public.profiles;
drop policy if exists "admin profiles update" on public.profiles;
drop policy if exists "profile access" on public.profiles;
create policy "profile access" on public.profiles for select to authenticated
using((select auth.uid())=id or private.is_staff());

drop policy if exists "read levels" on public.levels;
create policy "read levels" on public.levels for select to anon using(true);
drop policy if exists "authenticated read levels" on public.levels;
create policy "authenticated read levels" on public.levels for select to authenticated using(true);
drop policy if exists "read published courses" on public.courses;
create policy "read published courses" on public.courses for select to anon using(status='published');
drop policy if exists "authenticated course access" on public.courses;
create policy "authenticated course access" on public.courses for select to authenticated
using(status='published' or private.is_staff());
drop policy if exists "read published resources" on public.resources;
create policy "read published resources" on public.resources for select to anon using(status='published');
drop policy if exists "authenticated resource access" on public.resources;
create policy "authenticated resource access" on public.resources for select to authenticated
using(status='published' or private.is_staff());

drop policy if exists "staff levels all" on public.levels;
drop policy if exists "staff levels insert" on public.levels;
create policy "staff levels insert" on public.levels for insert to authenticated with check(private.is_staff());
drop policy if exists "staff levels update" on public.levels;
create policy "staff levels update" on public.levels for update to authenticated using(private.is_staff()) with check(private.is_staff());
drop policy if exists "staff courses all" on public.courses;
drop policy if exists "staff courses insert" on public.courses;
create policy "staff courses insert" on public.courses for insert to authenticated with check(private.is_staff());
drop policy if exists "staff courses update" on public.courses;
create policy "staff courses update" on public.courses for update to authenticated using(private.is_staff()) with check(private.is_staff());
drop policy if exists "staff resources all" on public.resources;
drop policy if exists "staff resources insert" on public.resources;
create policy "staff resources insert" on public.resources for insert to authenticated with check(private.is_staff());
drop policy if exists "staff resources update" on public.resources;
create policy "staff resources update" on public.resources for update to authenticated using(private.is_staff()) with check(private.is_staff());

-- Trigger helpers should not be callable as public RPC endpoints.
revoke all on function public.handle_new_user() from public,anon,authenticated;
revoke all on function public.set_updated_at() from public,anon,authenticated;
revoke all on function public.validate_resource_course_context() from public,anon,authenticated;
revoke all on function public.validate_course_core_context() from public,anon,authenticated;
revoke all on function private.is_staff() from public,anon,authenticated;
revoke all on function private.is_admin() from public,anon,authenticated;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Private Storage; public can sign/read only files referenced by Published resources.
insert into storage.buckets(id,name,public,file_size_limit)
values('resource-files','resource-files',false,262144000)
on conflict(id) do update set public=false,file_size_limit=262144000;

drop policy if exists "authenticated resource files read" on storage.objects;
drop policy if exists "published resource files read" on storage.objects;
create policy "published resource files read" on storage.objects for select to anon,authenticated using(
  bucket_id='resource-files'
  and storage.allow_any_operation(array['object.get_authenticated_info','object.get_authenticated'])
  and exists(
    select 1 from public.resources r
    where r.status='published' and r.source_storage_path=storage.objects.name
  )
);
drop policy if exists "staff resource files read" on storage.objects;
create policy "staff resource files read" on storage.objects for select to authenticated using(bucket_id='resource-files' and private.is_staff());
drop policy if exists "staff resource files insert" on storage.objects;
create policy "staff resource files insert" on storage.objects for insert to authenticated with check(bucket_id='resource-files' and private.is_staff());
drop policy if exists "staff resource files update" on storage.objects;
create policy "staff resource files update" on storage.objects for update to authenticated using(bucket_id='resource-files' and private.is_staff()) with check(bucket_id='resource-files' and private.is_staff());
drop policy if exists "staff resource files delete" on storage.objects;
create policy "staff resource files delete" on storage.objects for delete to authenticated using(bucket_id='resource-files' and private.is_staff());

-- Retire exposed v7.1 helper RPCs after all table and Storage policies have moved.
drop function if exists public.is_staff();
drop function if exists public.is_admin();

-- First admin:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');
