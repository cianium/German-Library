-- Run after 20261029_v34_admin_rpc_invoker.sql.
select
  p.oid::regprocedure as function_name,
  not p.prosecdef as security_invoker,
  not has_function_privilege('anon',p.oid,'execute') as anon_cannot_execute,
  has_function_privilege('authenticated',p.oid,'execute') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('admin_set_author','admin_review_author_request')
order by p.proname;

select
  has_column_privilege('authenticated','public.profiles','role','update') as admin_rpc_can_update_role_column,
  has_column_privilege('authenticated','public.author_requests','status','update') as admin_rpc_can_update_request_status,
  has_column_privilege('authenticated','public.role_audit_events','actor_id','insert') as admin_rpc_can_insert_audit,
  exists(select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profile updates by owner or admin') as role_update_rls_exists,
  exists(select 1 from pg_trigger where tgrelid='public.profiles'::regclass and tgname='profiles_role_guard' and not tgisinternal) as role_guard_trigger_exists,
  exists(select 1 from pg_policies where schemaname='public' and tablename='author_requests' and policyname='admins review author requests') as request_review_rls_exists,
  exists(select 1 from pg_policies where schemaname='public' and tablename='role_audit_events' and policyname='admins write role audit') as audit_insert_rls_exists;
