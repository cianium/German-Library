select 'resource bucket is private and MIME-scoped' as check_name,
  exists(
    select 1 from storage.buckets
    where id='resource-files' and public=false and file_size_limit=262144000
      and allowed_mime_types is not null and cardinality(allowed_mime_types)=16
  ) as pass
union all
select 'all FK support indexes exist',
  (select count(*) from pg_indexes where schemaname='public' and indexname in (
    'article_assets_article_id_idx','article_assets_uploaded_by_idx',
    'article_revisions_edited_by_idx','article_slug_history_article_id_idx',
    'author_requests_reviewed_by_idx','role_audit_events_actor_id_idx',
    'role_audit_events_subject_id_idx'
  ))=7;
