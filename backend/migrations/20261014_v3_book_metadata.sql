-- German Library v3 book metadata.
-- Precondition: V7.4 books/media migration already applied.
-- Run after a database backup. No RLS policies, grants, auth roles or buckets are modified.
begin;
alter table public.courses add column if not exists book_type text not null default 'Sonstige';
alter table public.courses add column if not exists skills text[] not null default '{}';
alter table public.courses add column if not exists cover_url text not null default '';
alter table public.courses add column if not exists cover_storage_path text not null default '';
alter table public.courses add column if not exists book_url text not null default '';
alter table public.courses add column if not exists book_storage_path text not null default '';
alter table public.courses add column if not exists provider text not null default '';
-- Existing rows keep a neutral category until classified by the editor.
-- Do not reclassify 'Sonstige' on migration reruns, since it can be an intentional choice.
alter table public.courses drop constraint if exists courses_book_type_check;
alter table public.courses add constraint courses_book_type_check
 check(book_type in ('Lehrwerk','Arbeitsbuch','Grammatik','Wortschatz','Sprechen','Hören','Lesen','Schreiben','Aussprache','Prüfung','Sonstige'));
-- Unrestricted arbitrary URLs or storage paths are not exposed directly by frontend storage code;
-- any stored files are accessed through existing scoped signed URL logic.
create index if not exists courses_book_type_status_idx on public.courses(book_type,status,order_index);
commit;
