-- Read-only post-migration checks. Run in the Development Supabase SQL editor.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
  ('articles','article_revisions','article_slug_history','article_assets','role_audit_events','author_requests')
order by c.relname;

select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename in
  ('articles','article_revisions','article_slug_history','article_assets','role_audit_events','author_requests','resources')
order by tablename, policyname;

select p.role, count(*) as accounts
from public.profiles p
group by p.role
order by p.role;

select
  has_table_privilege('anon','public.articles','select') as anon_can_read_raw_article_rows,
  has_table_privilege('anon','public.published_articles','select') as anon_can_read_public_view,
  has_column_privilege('authenticated','public.profiles','role','update') as browser_can_update_role,
  has_column_privilege('authenticated','public.profiles','display_name','update') as user_can_update_own_display_name,
  has_function_privilege('anon','public.admin_set_author(uuid,boolean)','execute') as anon_can_assign_author,
  has_function_privilege('authenticated','public.admin_set_author(uuid,boolean)','execute') as authenticated_can_call_admin_rpc,
  has_function_privilege('anon','public.admin_review_author_request(uuid,boolean,text)','execute') as anon_can_review_author_request,
  has_function_privilege('authenticated','public.admin_review_author_request(uuid,boolean,text)','execute') as authenticated_can_call_review_rpc,
  has_table_privilege('anon','public.author_requests','select') as anon_can_read_author_requests,
  has_table_privilege('authenticated','public.author_requests','update') as browser_can_review_requests;

select status,count(*) as author_requests from public.author_requests group by status order by status;

select count(*) as published_without_snapshot
from public.articles
where status='published' and published_snapshot is null;

select count(*) as public_articles
from public.published_articles;

select count(*) as slug_history_conflicts
from public.article_slug_history h
join public.articles a on a.slug=h.old_slug and a.id<>h.article_id;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id='article-drafts';

-- Expected: RLS enabled everywhere; raw articles, direct role updates, and author requests denied to anon/browser;
-- only authenticated can call the role/review RPCs (each still checks Admin);
-- no published row without a snapshot; draft bucket is private and limited to approved image MIME types.
