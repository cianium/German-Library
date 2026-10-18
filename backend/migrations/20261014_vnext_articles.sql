-- German Library VNext articles: additive schema, author permissions and reviewed publishing.
-- Apply after the V7.4 and v3 migrations. Back up the database first.
begin;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in ('learner','author','editor','admin'));
alter table public.profiles add column if not exists display_name text not null default '' check(length(display_name)<=80);
grant update(display_name) on public.profiles to authenticated;
create policy "users update own display name" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));

create or replace function private.can_manage_resources()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin','editor','author'));
$$;
create or replace function private.can_review_articles()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin','editor'));
$$;
create or replace function private.can_publish_articles()
returns boolean language sql stable security definer set search_path='' as $$ select private.can_review_articles(); $$;
create or replace function private.can_manage_roles()
returns boolean language sql stable security definer set search_path='' as $$ select private.is_admin(); $$;
revoke all on function private.can_manage_resources(),private.can_review_articles(),private.can_publish_articles(),private.can_manage_roles() from public,anon;
grant execute on function private.can_manage_resources(),private.can_review_articles(),private.can_publish_articles(),private.can_manage_roles() to authenticated;

-- Authors may manage resources, but never levels/books or role/settings/infrastructure.
drop policy if exists "staff resources insert" on public.resources;
drop policy if exists "staff resources update" on public.resources;
drop policy if exists "authenticated resource access" on public.resources;
create policy "authenticated resource manager access" on public.resources for select to authenticated using(
  status='published' or private.can_manage_resources()
);
create policy "resource managers insert resources" on public.resources for insert to authenticated with check(private.can_manage_resources());
create policy "resource managers update resources" on public.resources for update to authenticated using(private.can_manage_resources()) with check(private.can_manage_resources());
drop policy if exists "staff resource files read" on storage.objects;
create policy "resource managers read resource files" on storage.objects for select to authenticated using(bucket_id='resource-files' and private.can_manage_resources());
drop policy if exists "staff resource files insert" on storage.objects;
drop policy if exists "staff resource files update" on storage.objects;
drop policy if exists "staff resource files delete" on storage.objects;
create policy "resource managers upload resource files" on storage.objects for insert to authenticated with check(bucket_id='resource-files' and private.can_manage_resources());
create policy "resource managers update resource files" on storage.objects for update to authenticated using(bucket_id='resource-files' and private.can_manage_resources()) with check(bucket_id='resource-files' and private.can_manage_resources());
create policy "resource managers delete resource files" on storage.objects for delete to authenticated using(bucket_id='resource-files' and private.can_manage_resources());

create table if not exists public.articles(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check(length(btrim(title)) between 8 and 180),
  excerpt text not null default '' check(length(excerpt)<=320),
  body_html text not null default '' check(octet_length(body_html)<=250000),
  category text not null default 'General' check(length(category)<=60),
  tags text[] not null default '{}' check(cardinality(tags)<=5),
  locale text not null default 'de' check(locale in ('de','fa','en')),
  levels text[] not null default '{}' check(levels <@ array['A1','A2','B1','B2','C1','C2']::text[]),
  skills text[] not null default '{}' check(skills <@ array['Hören','Lesen','Schreiben','Sprechen','Grammatik','Wortschatz','Aussprache','Prüfung','Extra Practice']::text[]),
  related_resource_ids text[] not null default '{}' check(cardinality(related_resource_ids)<=8),
  author_id uuid not null references auth.users(id) on delete restrict,
  author_name text not null check(length(btrim(author_name)) between 2 and 80),
  status text not null default 'draft' check(status in ('draft','in_review','needs_changes','published','archived')),
  reviewer_feedback text not null default '',
  seo_title text not null default '' check(length(seo_title)<=70),
  focus_query text not null default '' check(length(focus_query)<=80),
  meta_description text not null default '' check(length(meta_description)<=180),
  canonical_url text not null default '' check(canonical_url='' or canonical_url ~* '^https://'),
  og_image_url text not null default '' check(og_image_url='' or og_image_url ~* '^https://'),
  cover_url text not null default '' check(cover_url='' or cover_url ~* '^https://'),
  mobile_cover_url text not null default '' check(mobile_cover_url='' or mobile_cover_url ~* '^https://'),
  cover_alt text not null default '',
  featured boolean not null default false,
  published_snapshot jsonb,
  revision integer not null default 1 check(revision>0),
  published_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articles_public_idx on public.articles(published_at desc) where published_snapshot is not null and status <> 'archived';
create index if not exists articles_author_status_idx on public.articles(author_id,status,updated_at desc);
create index if not exists articles_featured_idx on public.articles(featured,published_at desc) where published_snapshot is not null and status <> 'archived';

create table if not exists public.article_revisions(
  id bigint generated always as identity primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  revision integer not null,
  edited_by uuid not null references auth.users(id) on delete restrict,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(article_id,revision)
);
create index if not exists article_revisions_article_idx on public.article_revisions(article_id,revision desc);

create table if not exists public.article_slug_history(
  old_slug text primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace view public.article_redirects with (security_barrier=true) as
select h.old_slug,a.published_snapshot->>'slug' as slug from public.article_slug_history h
join public.articles a on a.id=h.article_id
where a.published_snapshot is not null and a.status<>'archived';
revoke all on public.article_redirects from public,authenticated;
grant select on public.article_redirects to anon,authenticated;

create table if not exists public.article_assets(
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','image/avif')),
  bytes bigint not null check(bytes>0 and bytes<=10485760),
  width integer,
  height integer,
  alt_text text not null default '',
  caption text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.role_audit_events(
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  subject_id uuid not null references auth.users(id) on delete restrict,
  old_role text not null,
  new_role text not null,
  created_at timestamptz not null default now()
);

create or replace function private.guard_article_workflow()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and not private.can_review_articles() then
    if new.author_id is distinct from old.author_id then raise exception 'Article ownership cannot be changed'; end if;
    if new.published_snapshot is distinct from old.published_snapshot or new.published_at is distinct from old.published_at then raise exception 'Only editorial review can change the public article snapshot'; end if;
    if new.featured is distinct from old.featured then raise exception 'Only an Editor or Admin can feature an article'; end if;
  end if;
  if exists(select 1 from public.article_slug_history h where h.old_slug=new.slug and h.article_id is distinct from new.id) then
    raise exception 'This slug was used previously; choose a different slug';
  end if;
  return new;
end $$;
drop trigger if exists articles_workflow_guard on public.articles;
create trigger articles_workflow_guard before insert or update on public.articles for each row execute function private.guard_article_workflow();

create or replace function public.capture_article_revision()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if new.revision=old.revision then new.revision:=old.revision+1; end if;
    if old.published_at is not null and old.slug is distinct from new.slug then
      insert into public.article_slug_history(old_slug,article_id) values(old.slug,old.id) on conflict(old_slug) do update set article_id=excluded.article_id;
    end if;
  end if;
  if new.status='in_review' and (tg_op='INSERT' or old.status is distinct from 'in_review') then new.submitted_at:=now(); end if;
  if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published' or old.status='in_review' or old.status='needs_changes') then
    if not private.can_publish_articles() then raise exception 'Only an Editor or Admin can publish articles'; end if;
    new.published_at:=coalesce(new.published_at,now());
    new.published_snapshot:=jsonb_build_object(
      'slug',new.slug,'title',new.title,'excerpt',new.excerpt,'body_html',new.body_html,
      'category',new.category,'tags',new.tags,'locale',new.locale,'levels',new.levels,'skills',new.skills,
      'related_resource_ids',new.related_resource_ids,'author_name',new.author_name,
      'seo_title',new.seo_title,'focus_query',new.focus_query,'meta_description',new.meta_description,'canonical_url',new.canonical_url,'og_image_url',new.og_image_url,
      'cover_url',new.cover_url,'mobile_cover_url',new.mobile_cover_url,'cover_alt',new.cover_alt,
      'featured',new.featured,'published_at',new.published_at,'updated_at',now()
    );
  end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists articles_capture_revision on public.articles;
create trigger articles_capture_revision before insert or update on public.articles for each row execute function public.capture_article_revision();
create or replace function public.record_article_revision()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.article_revisions(article_id,revision,edited_by,snapshot)
  values(new.id,new.revision,coalesce((select auth.uid()),new.author_id),to_jsonb(new)-'published_snapshot');
  return new;
end $$;
drop trigger if exists articles_record_revision on public.articles;
create trigger articles_record_revision after insert or update on public.articles for each row execute function public.record_article_revision();

alter table public.articles enable row level security;
alter table public.article_revisions enable row level security;
alter table public.article_slug_history enable row level security;
alter table public.article_assets enable row level security;
alter table public.role_audit_events enable row level security;
revoke all on table public.articles,public.article_revisions,public.article_slug_history,public.article_assets,public.role_audit_events from anon,authenticated;
grant select on public.articles to authenticated;
grant insert,update on public.articles to authenticated;
grant select on public.article_revisions to authenticated;
grant select on public.article_slug_history to authenticated;
grant select,insert,update,delete on public.article_assets to authenticated;
grant select on public.role_audit_events to authenticated;

-- Public reads expose only the last reviewed snapshot, never in-progress editor fields.
create or replace view public.published_articles with (security_barrier=true) as
select id,
  published_snapshot->>'slug' as slug,
  published_snapshot->>'title' as title,
  published_snapshot->>'excerpt' as excerpt,
  published_snapshot->>'body_html' as body_html,
  published_snapshot->>'category' as category,
  published_snapshot->'tags' as tags,
  published_snapshot->>'locale' as locale,
  published_snapshot->'levels' as levels,
  published_snapshot->'skills' as skills,
  published_snapshot->'related_resource_ids' as related_resource_ids,
  published_snapshot->>'author_name' as author_name,
  published_snapshot->>'seo_title' as seo_title,
  published_snapshot->>'focus_query' as focus_query,
  published_snapshot->>'meta_description' as meta_description,
  published_snapshot->>'canonical_url' as canonical_url,
  published_snapshot->>'og_image_url' as og_image_url,
  published_snapshot->>'cover_url' as cover_url,
  published_snapshot->>'mobile_cover_url' as mobile_cover_url,
  published_snapshot->>'cover_alt' as cover_alt,
  coalesce((published_snapshot->>'featured')::boolean,false) as featured,
  published_snapshot->>'published_at' as published_at,
  published_snapshot->>'updated_at' as updated_at
from public.articles
where published_snapshot is not null and status<>'archived';
revoke all on public.published_articles from public,authenticated;
grant select on public.published_articles to anon,authenticated;

create policy "public read published articles" on public.articles for select to anon using(published_snapshot is not null and status<>'archived');
create policy "authenticated article access" on public.articles for select to authenticated using(
  (published_snapshot is not null and status<>'archived') or (author_id=(select auth.uid()) and private.can_manage_resources()) or private.can_review_articles()
);
create policy "authors create own article drafts" on public.articles for insert to authenticated with check(
  author_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('author','editor','admin'))
  and status in ('draft','in_review','needs_changes') and featured=false and published_snapshot is null
);
create policy "authors edit own articles" on public.articles for update to authenticated using(
  (author_id=(select auth.uid()) and private.can_manage_resources()) or private.can_review_articles()
) with check(
  (author_id=(select auth.uid()) and private.can_manage_resources() and status in ('draft','in_review','needs_changes','published'))
  or private.can_review_articles()
);
create policy "authors read own revisions" on public.article_revisions for select to authenticated using(
  exists(select 1 from public.articles a where a.id=article_id and (a.author_id=(select auth.uid()) or private.can_review_articles()))
);
create policy "write article revisions through trigger only" on public.article_revisions for insert to authenticated with check(edited_by=(select auth.uid()) and exists(select 1 from public.articles a where a.id=article_id and (a.author_id=(select auth.uid()) or private.can_review_articles())));
create policy "read previous article slugs" on public.article_slug_history for select to authenticated using(private.can_review_articles());
create policy "article owner asset access" on public.article_assets for select to authenticated using(
  (uploaded_by=(select auth.uid()) and private.can_manage_resources() and exists(select 1 from public.articles a where a.id=article_id and a.author_id=(select auth.uid()))) or private.can_review_articles()
);
create policy "article owner asset upload" on public.article_assets for insert to authenticated with check(
  uploaded_by=(select auth.uid()) and private.can_manage_resources() and exists(select 1 from public.articles a where a.id=article_id and a.author_id=(select auth.uid()))
);
create policy "article owner asset update" on public.article_assets for update to authenticated using((uploaded_by=(select auth.uid()) and private.can_manage_resources()) or private.can_review_articles()) with check(
  (uploaded_by=(select auth.uid()) and private.can_manage_resources() and exists(select 1 from public.articles a where a.id=article_id and a.author_id=(select auth.uid()))) or private.can_review_articles()
);
create policy "article owner asset delete" on public.article_assets for delete to authenticated using(
  (uploaded_by=(select auth.uid()) and private.can_manage_resources() and exists(select 1 from public.articles a where a.id=article_id and a.author_id=(select auth.uid()))) or private.can_review_articles()
);
create policy "admin reads role audit" on public.role_audit_events for select to authenticated using(private.can_manage_roles());

create or replace function public.admin_set_author(target_user_id uuid, make_author boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; old_value text; next_value text;
begin
  actor := (select auth.uid());
  if actor is null or not private.can_manage_roles() then raise exception 'Admin authorization required'; end if;
  if actor=target_user_id then raise exception 'Administrators cannot change their own role here'; end if;
  select role into old_value from public.profiles where id=target_user_id for update;
  if old_value is null then raise exception 'User profile not found'; end if;
  if old_value in ('admin','editor') then raise exception 'This operation only assigns or revokes Author'; end if;
  next_value := case when make_author then 'author' else 'learner' end;
  if old_value is distinct from next_value then
    update public.profiles set role=next_value where id=target_user_id;
    insert into public.role_audit_events(actor_id,subject_id,old_role,new_role) values(actor,target_user_id,old_value,next_value);
  end if;
  return jsonb_build_object('ok',true,'role',next_value,'message',case when make_author then 'نقش Author اعطا شد؛ رخداد ثبت شد.' else 'نقش Author لغو شد؛ رخداد ثبت شد.' end);
end $$;
revoke all on function public.admin_set_author(uuid,boolean) from public,anon;
grant execute on function public.admin_set_author(uuid,boolean) to authenticated;

-- Learners may request Author access; only an Admin review RPC can grant the role.
create table if not exists public.author_requests(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check(length(btrim(message)) between 30 and 1600),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text not null default '' check(length(review_note)<=1000)
);
create index if not exists author_requests_user_history_idx on public.author_requests(user_id,created_at desc);
create index if not exists author_requests_pending_idx on public.author_requests(created_at) where status='pending';
create unique index if not exists author_requests_one_pending_per_user on public.author_requests(user_id) where status='pending';
alter table public.author_requests enable row level security;
revoke all on table public.author_requests from public,anon,authenticated;
grant select on public.author_requests to authenticated;
grant insert(user_id,message) on public.author_requests to authenticated;
create policy "applicants and admins read author requests" on public.author_requests for select to authenticated using(user_id=(select auth.uid()) or private.can_manage_roles());
create policy "learners request author access" on public.author_requests for insert to authenticated with check(
  user_id=(select auth.uid()) and status='pending' and reviewed_at is null and reviewed_by is null
  and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='learner')
);

create or replace function public.admin_review_author_request(request_id uuid, approve boolean, response text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; request_row public.author_requests%rowtype; old_value text; next_status text;
begin
  actor := (select auth.uid());
  if actor is null or not private.can_manage_roles() then raise exception 'Admin authorization required'; end if;
  select * into request_row from public.author_requests where id=request_id for update;
  if request_row.id is null then raise exception 'Author request not found'; end if;
  if request_row.status <> 'pending' then raise exception 'Author request has already been reviewed'; end if;
  if approve then
    select role into old_value from public.profiles where id=request_row.user_id for update;
    if old_value is distinct from 'learner' then raise exception 'Applicant is no longer eligible for Author role'; end if;
    update public.profiles set role='author' where id=request_row.user_id;
    insert into public.role_audit_events(actor_id,subject_id,old_role,new_role) values(actor,request_row.user_id,old_value,'author');
    next_status := 'approved';
  else next_status := 'rejected'; end if;
  update public.author_requests set status=next_status,reviewed_at=now(),reviewed_by=actor,review_note=left(coalesce(response,''),1000) where id=request_id;
  return jsonb_build_object('ok',true,'status',next_status,'message',case when approve then 'درخواست تأیید شد و نقش Author ثبت شد.' else 'درخواست رد شد.' end);
end $$;
revoke all on function public.admin_review_author_request(uuid,boolean,text) from public,anon;
grant execute on function public.admin_review_author_request(uuid,boolean,text) to authenticated;

-- Draft images stay private; publication uses stable external/public URLs until a dedicated
-- publish-time asset promotion flow is configured.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('article-drafts','article-drafts',false,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/avif'];
create policy "authors upload to own article draft folder" on storage.objects for insert to authenticated with check(
  bucket_id='article-drafts' and (storage.foldername(name))[1]=(select auth.uid())::text and private.can_manage_resources()
  and exists(select 1 from public.articles a where a.id::text=(storage.foldername(name))[2] and a.author_id=(select auth.uid()))
);
create policy "authors read own article draft files" on storage.objects for select to authenticated using(
  bucket_id='article-drafts' and (((storage.foldername(name))[1]=(select auth.uid())::text and private.can_manage_resources()) or private.can_review_articles())
  and exists(select 1 from public.articles a where a.id::text=(storage.foldername(name))[2] and (a.author_id=(select auth.uid()) or private.can_review_articles()))
);
create policy "authors update own article draft files" on storage.objects for update to authenticated using(
  bucket_id='article-drafts' and (((storage.foldername(name))[1]=(select auth.uid())::text and private.can_manage_resources()) or private.can_review_articles())
  and exists(select 1 from public.articles a where a.id::text=(storage.foldername(name))[2] and (a.author_id=(select auth.uid()) or private.can_review_articles()))
) with check(bucket_id='article-drafts' and (((storage.foldername(name))[1]=(select auth.uid())::text and private.can_manage_resources()) or private.can_review_articles())
  and exists(select 1 from public.articles a where a.id::text=(storage.foldername(name))[2] and (a.author_id=(select auth.uid()) or private.can_review_articles())));
create policy "authors delete own article draft files" on storage.objects for delete to authenticated using(
  bucket_id='article-drafts' and (((storage.foldername(name))[1]=(select auth.uid())::text and private.can_manage_resources()) or private.can_review_articles())
  and exists(select 1 from public.articles a where a.id::text=(storage.foldername(name))[2] and (a.author_id=(select auth.uid()) or private.can_review_articles()))
);

revoke all on function public.capture_article_revision(),public.record_article_revision() from public,anon,authenticated;
revoke all on function private.guard_article_workflow() from public,anon,authenticated;
commit;
