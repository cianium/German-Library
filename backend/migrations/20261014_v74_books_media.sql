-- German Library V7.4: book library, optional CEFR for independent books/media,
-- editorial picks on books, independent media section.
-- Apply ONCE after backing up the existing database. No RLS policies/grants are changed.
begin;

do $$
begin
  if not exists(select 1 from information_schema.columns
                where table_schema='public' and table_name='courses' and column_name='featured') then
    alter table public.courses add column featured boolean not null default false;
    -- Preserve old Special Books as featured editorial picks on first migration.
    update public.courses set featured=true where collection='special';
  end if;
end $$;

alter table public.courses drop constraint if exists courses_collection_check;
alter table public.courses drop constraint if exists courses_collection_level_check;
alter table public.resources drop constraint if exists resources_collection_check;
alter table public.resources drop constraint if exists resources_collection_level_check;

alter table public.courses add constraint courses_collection_check
  check(collection in ('level','library','special'));
alter table public.courses add constraint courses_collection_level_check
  check((collection='level' and level_code is not null)
    or collection='library'
    or (collection='special' and level_code is null));
alter table public.resources add constraint resources_collection_check
  check(collection in ('level','library','special','media'));
alter table public.resources add constraint resources_collection_level_check
  check((collection='level' and level_code is not null)
    or collection in ('library','media')
    or (collection='special' and level_code is null));

create or replace function public.validate_resource_course_context()
returns trigger language plpgsql set search_path='' as $$
declare c_level text; c_collection text; c_status text;
begin
  if new.course_id is not null then
    select level_code,collection,status into c_level,c_collection,c_status
      from public.courses where id=new.course_id;
    if c_collection is null then raise exception 'Unknown course_id: %',new.course_id; end if;
    if c_collection<>new.collection then raise exception 'Resource collection mismatches book'; end if;
    if c_level is distinct from new.level_code then raise exception 'Resource level mismatches book'; end if;
    if new.status='published' and c_status<>'published' then
      raise exception 'Published resource requires published book';
    end if;
  elsif new.collection in ('library','special') then
    raise exception 'Book asset must reference a book';
  end if;
  if new.collection='media' then
    if new.course_id is not null then raise exception 'Independent media cannot reference book'; end if;
    if new.type not in ('Film','Series','Podcast','Article') then
      raise exception 'Invalid independent media type';
    end if;
  end if;
  return new;
end $$;

create or replace function public.validate_course_core_context()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.is_core and (new.collection not in ('level','library') or new.level_code is null) then
    raise exception 'Core Book requires CEFR level';
  end if;
  if new.is_core and new.status<>'published' then raise exception 'Core Book must be published'; end if;
  if new.status<>'published' and exists(select 1 from public.resources r
    where r.course_id=new.id and r.status='published') then
    raise exception 'Book with published assets must remain published';
  end if;
  if exists(select 1 from public.resources r where r.course_id=new.id and
    (r.collection<>new.collection or r.level_code is distinct from new.level_code)) then
    raise exception 'Book context mismatches child assets';
  end if;
  return new;
end $$;
-- Existing security-definer helpers, grants, RLS and storage policies remain intact.
-- Restrict direct RPC execution of trigger helpers (triggers still run normally).
revoke all on function public.validate_resource_course_context() from public,anon,authenticated;
revoke all on function public.validate_course_core_context() from public,anon,authenticated;

drop index if exists public.one_core_course_per_level;
create unique index one_core_course_per_level on public.courses(level_code)
  where collection in ('level','library') and is_core=true and status<>'archived';

create index if not exists courses_featured_status on public.courses(featured,status);
create index if not exists resources_featured_status on public.resources(featured,status);
commit;
