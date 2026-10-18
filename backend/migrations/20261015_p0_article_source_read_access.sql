-- P0 security hotfix: keep the editorial source private to its author and reviewers.
-- Apply AFTER 20261014_vnext_articles.sql, first in Development/Staging.
-- The public published_articles / article_redirects views are intentionally
-- restricted, projected snapshot views. They must not expose draft fields.
-- Do not switch them to security_invoker without designing a replacement public
-- read path: anon intentionally has no SELECT grant on the underlying table.
begin;

-- The original anon row policy was ineffective without a table SELECT grant,
-- but removing it reduces the risk of future grant changes exposing source rows.
revoke all on table public.articles from anon;
drop policy if exists "public read published articles" on public.articles;

-- Previously any signed-in learner could read an entire article row whenever
-- published_snapshot was set, including edits awaiting editorial approval.
drop policy if exists "authenticated article access" on public.articles;
create policy "article source readable by author and reviewers"
on public.articles for select to authenticated
using (
  (author_id = (select auth.uid()) and (select private.can_manage_resources()))
  or (select private.can_review_articles())
);

comment on view public.published_articles is
  'Intentional security-definer projection: public reads only reviewed published_snapshot keys. Do not add working-draft fields.';
comment on view public.article_redirects is
  'Intentional security-definer projection: only redirects for publicly visible reviewed snapshots.';

commit;
