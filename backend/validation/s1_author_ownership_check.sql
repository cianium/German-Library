-- Catalog assertions AFTER 20261027_s1_author_resource_ownership.sql on Staging. Every row must be true.
-- They do NOT replace login-based tests: as an Author try (1) update someone else's resource,
-- (2) set status='published', (3) delete a file outside authors/<your uid>/ — all three must fail.
select 'resources.created_by exists' as check_name, exists(select 1 from information_schema.columns where table_schema='public' and table_name='resources' and column_name='created_by') as pass
union all select 'old broad resource policies removed', not exists(select 1 from pg_policies where schemaname='public' and tablename='resources' and policyname like 'resource managers%')
union all select 'new resource policies installed', (select count(*) from pg_policies where schemaname='public' and tablename='resources' and policyname like 'resources % staff or own%' or policyname='resources select own or staff')=3
union all select 'old storage author policies removed', not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'resource managers%')
union all select 'author storage policies are path-scoped', not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'resource files % own or staff' and coalesce(qual,'')||coalesce(with_check,'') not like '%authors/%');
