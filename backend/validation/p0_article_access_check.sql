-- Read-only assertions AFTER the P0 patch is applied to a test/staging database.
-- Every row below should be true. These catalog assertions are not substitutes
-- for login-based positive/negative tests with real Learner/Author/Editor users.
select 'raw article RLS enabled' as check_name, relrowsecurity as pass
from pg_class where oid='public.articles'::regclass
union all
select 'anon has no raw article select grant', not has_table_privilege('anon','public.articles','select')
union all
select 'anon can access curated published view', has_table_privilege('anon','public.published_articles','select')
union all
select 'authenticated can access curated published view', has_table_privilege('authenticated','public.published_articles','select')
union all
select 'original public raw read policy removed', not exists (
  select 1 from pg_policies where schemaname='public' and tablename='articles' and policyname='public read published articles'
)
union all
select 'original broad signed-in read policy removed', not exists (
  select 1 from pg_policies where schemaname='public' and tablename='articles' and policyname='authenticated article access'
)
union all
select 'owner-and-reviewer article read policy installed', exists (
  select 1 from pg_policies where schemaname='public' and tablename='articles'
  and policyname='article source readable by author and reviewers' and cmd='SELECT'
  and qual like '%can_manage_resources%' and qual like '%can_review_articles%'
  and qual not like '%published_snapshot%'
)
union all
select 'published view exposes no editable article source fields', not exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='published_articles'
    and column_name in ('published_snapshot','reviewer_feedback','status','revision','submitted_at','author_id')
);

-- Additionally execute the authenticated browser test matrix in docs/P0_SECURITY_AND_NAV_REPORT_FA.md.
