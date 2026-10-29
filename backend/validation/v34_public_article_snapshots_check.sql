-- Run after 20261029_v34_public_article_snapshots.sql on Staging.
-- Every boolean result below must be true and both mismatch counts must be zero.

select
  c.relname,
  coalesce(c.reloptions,'{}'::text[]) @> array['security_invoker=true'] as security_invoker,
  coalesce(c.reloptions,'{}'::text[]) @> array['security_barrier=true'] as security_barrier
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('published_articles','article_redirects')
order by c.relname;

select
  c.relname,
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon',c.oid,'select') as anon_select,
  has_table_privilege('authenticated',c.oid,'select') as authenticated_select,
  not has_table_privilege('anon',c.oid,'insert')
    and not has_table_privilege('anon',c.oid,'update')
    and not has_table_privilege('anon',c.oid,'delete') as anon_cannot_write,
  not has_table_privilege('authenticated',c.oid,'insert')
    and not has_table_privilege('authenticated',c.oid,'update')
    and not has_table_privilege('authenticated',c.oid,'delete') as authenticated_cannot_write
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('article_publications','article_public_redirects')
order by c.relname;

select
  not has_table_privilege('anon','public.articles','select') as anon_cannot_read_article_source,
  not has_function_privilege('anon','private.sync_article_publication()','execute') as anon_cannot_call_sync,
  not has_function_privilege('authenticated','private.sync_article_publication()','execute') as authenticated_cannot_call_sync;

select count(*) as publication_mismatch_count
from (
  (select id,published_snapshot from public.articles
   where published_snapshot is not null and status<>'archived'
   except
   select article_id,snapshot from public.article_publications)
  union all
  (select article_id,snapshot from public.article_publications
   except
   select id,published_snapshot from public.articles
   where published_snapshot is not null and status<>'archived')
) mismatches;

select count(*) as view_mismatch_count
from (
  select article_id from public.article_publications
  except
  select id from public.published_articles
) mismatches;

select
  count(*) filter(where column_name in ('revision','reviewer_feedback','submitted_at','published_snapshot'))=0
    as public_view_excludes_source_columns
from information_schema.columns
where table_schema='public' and table_name='published_articles';
