-- v3.3 production hardening. Apply after 20261027_s1_author_resource_ownership.sql.
-- Idempotent, non-destructive: narrows accepted Storage MIME types and adds FK indexes.
begin;

update storage.buckets
set public=false,
    file_size_limit=262144000,
    allowed_mime_types=array[
      'application/pdf','application/epub+zip',
      'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg',
      'video/mp4','video/webm',
      'text/plain','text/vtt','application/x-subrip',
      'image/jpeg','image/png','image/webp'
    ]
where id='resource-files';

create index if not exists article_assets_article_id_idx on public.article_assets(article_id);
create index if not exists article_assets_uploaded_by_idx on public.article_assets(uploaded_by);
create index if not exists article_revisions_edited_by_idx on public.article_revisions(edited_by);
create index if not exists article_slug_history_article_id_idx on public.article_slug_history(article_id);
create index if not exists author_requests_reviewed_by_idx on public.author_requests(reviewed_by);
create index if not exists role_audit_events_actor_id_idx on public.role_audit_events(actor_id);
create index if not exists role_audit_events_subject_id_idx on public.role_audit_events(subject_id);

commit;
