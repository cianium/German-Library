-- v3.4 P0: replace owner-privileged public article views with RLS-backed
-- publication tables and SECURITY INVOKER views.
--
-- Apply after 20261015_p0_article_source_read_access.sql.
-- Test on Staging with Guest, Learner, owning Author, other Author and Editor
-- before Production. This migration is additive and preserves the public view API.
begin;

create table if not exists public.article_publications(
  article_id uuid primary key references public.articles(id) on delete cascade,
  snapshot jsonb not null,
  synced_at timestamptz not null default now(),
  check(jsonb_typeof(snapshot)='object'),
  check(nullif(btrim(snapshot->>'slug'),'') is not null)
);

create table if not exists public.article_public_redirects(
  old_slug text primary key,
  article_id uuid not null references public.article_publications(article_id) on delete cascade,
  slug text not null,
  synced_at timestamptz not null default now(),
  check(old_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check(old_slug<>slug)
);

create index if not exists article_public_redirects_article_idx
  on public.article_public_redirects(article_id);

alter table public.article_publications enable row level security;
alter table public.article_public_redirects enable row level security;

revoke all on table public.article_publications,public.article_public_redirects
  from public,anon,authenticated;
grant select on table public.article_publications,public.article_public_redirects
  to anon,authenticated;

drop policy if exists "public reads article publications" on public.article_publications;
create policy "public reads article publications"
  on public.article_publications for select to anon,authenticated using(true);

drop policy if exists "public reads article redirects" on public.article_public_redirects;
create policy "public reads article redirects"
  on public.article_public_redirects for select to anon,authenticated using(true);

create or replace function private.sync_article_publication()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  public_slug text;
begin
  if new.published_snapshot is not null and new.status<>'archived' then
    public_slug := new.published_snapshot->>'slug';
    if public_slug is null or public_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
      raise exception 'Published article snapshot has an invalid slug';
    end if;

    insert into public.article_publications(article_id,snapshot,synced_at)
    values(new.id,new.published_snapshot,now())
    on conflict(article_id) do update
      set snapshot=excluded.snapshot,synced_at=excluded.synced_at;

    delete from public.article_public_redirects where article_id=new.id;
    insert into public.article_public_redirects(old_slug,article_id,slug,synced_at)
    select h.old_slug,new.id,public_slug,now()
    from public.article_slug_history h
    where h.article_id=new.id and h.old_slug<>public_slug
    on conflict(old_slug) do update
      set article_id=excluded.article_id,
          slug=excluded.slug,
          synced_at=excluded.synced_at;
  else
    delete from public.article_publications where article_id=new.id;
  end if;
  return new;
end
$$;

revoke all on function private.sync_article_publication()
  from public,anon,authenticated;

drop trigger if exists articles_sync_publication on public.articles;
create trigger articles_sync_publication
after insert or update of published_snapshot,status on public.articles
for each row execute function private.sync_article_publication();

-- Backfill the currently approved public state before switching the views.
insert into public.article_publications(article_id,snapshot,synced_at)
select id,published_snapshot,now()
from public.articles
where published_snapshot is not null and status<>'archived'
on conflict(article_id) do update
  set snapshot=excluded.snapshot,synced_at=excluded.synced_at;

insert into public.article_public_redirects(old_slug,article_id,slug,synced_at)
select h.old_slug,p.article_id,p.snapshot->>'slug',now()
from public.article_slug_history h
join public.article_publications p on p.article_id=h.article_id
where h.old_slug<>(p.snapshot->>'slug')
on conflict(old_slug) do update
  set article_id=excluded.article_id,
      slug=excluded.slug,
      synced_at=excluded.synced_at;

create or replace view public.published_articles
with (security_barrier=true,security_invoker=true)
as
select article_id as id,
  snapshot->>'slug' as slug,
  snapshot->>'title' as title,
  snapshot->>'excerpt' as excerpt,
  snapshot->>'body_html' as body_html,
  snapshot->>'category' as category,
  snapshot->'tags' as tags,
  snapshot->>'locale' as locale,
  snapshot->'levels' as levels,
  snapshot->'skills' as skills,
  snapshot->'related_resource_ids' as related_resource_ids,
  snapshot->>'author_name' as author_name,
  snapshot->>'seo_title' as seo_title,
  snapshot->>'focus_query' as focus_query,
  snapshot->>'meta_description' as meta_description,
  snapshot->>'canonical_url' as canonical_url,
  snapshot->>'og_image_url' as og_image_url,
  snapshot->>'cover_url' as cover_url,
  snapshot->>'mobile_cover_url' as mobile_cover_url,
  snapshot->>'cover_alt' as cover_alt,
  coalesce((snapshot->>'featured')::boolean,false) as featured,
  snapshot->>'published_at' as published_at,
  snapshot->>'updated_at' as updated_at
from public.article_publications;

create or replace view public.article_redirects
with (security_barrier=true,security_invoker=true)
as
select old_slug,slug from public.article_public_redirects;

revoke all on public.published_articles,public.article_redirects
  from public,anon,authenticated;
grant select on public.published_articles,public.article_redirects
  to anon,authenticated;

comment on table public.article_publications is
  'Reviewed public article snapshots only. Source drafts remain in public.articles behind ownership RLS.';
comment on table public.article_public_redirects is
  'Public redirects derived from reviewed article publication state.';
comment on view public.published_articles is
  'SECURITY INVOKER compatibility view over RLS-backed public article snapshots.';
comment on view public.article_redirects is
  'SECURITY INVOKER compatibility view over RLS-backed public article redirects.';

commit;

-- Rollback outline (Staging only): drop the sync trigger/function and the two
-- publication tables, then recreate the previous owner-privileged views from
-- 20261014_vnext_articles.sql. Never run rollback without a backup.
