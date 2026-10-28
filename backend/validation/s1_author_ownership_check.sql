-- Run after 20261027_s1_author_resource_ownership.sql on staging.
-- Every row must return pass=true. Also perform authenticated negative tests described below.
select 'resources.created_by exists' as check_name,
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='resources' and column_name='created_by'
  ) as pass
union all
select 'resource bucket is private and MIME-scoped',
  exists(
    select 1 from storage.buckets
    where id='resource-files' and public=false and file_size_limit=262144000
      and allowed_mime_types is not null and cardinality(allowed_mime_types)=16
  )
union all
select 'old broad resource policies removed',
  not exists(
    select 1 from pg_policies
    where schemaname='public' and tablename='resources' and policyname like 'resource managers%'
  )
union all
select 'new resource policies installed',
  (select count(*) from pg_policies
   where schemaname='public' and tablename='resources'
     and policyname in (
       'resources select own or staff',
       'resources insert staff or own draft',
       'resources update staff or own draft'
     ))=3
union all
select 'old broad storage policies removed',
  not exists(
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname like 'resource managers%'
  )
union all
select 'author storage policies are path-scoped',
  (select count(*) from pg_policies
   where schemaname='storage' and tablename='objects'
     and policyname in (
       'resource files read own or staff',
       'resource files insert own or staff',
       'resource files update own or staff',
       'resource files delete own or staff'
     )
     and (coalesce(qual,'')||coalesce(with_check,'')) like '%authors/%')=4;

-- Required staging tests with two distinct author accounts:
-- 1. Author B cannot update Author A's resource.
-- 2. An author cannot change a resource status to published.
-- 3. An author cannot read/update/delete a file outside authors/<their uid>/.
-- 4. An editor can review/publish and manage all resource-files paths.
