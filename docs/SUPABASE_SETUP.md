# Supabase Setup — German Library v7.1

## 1. Use a dedicated project

Use a Supabase project dedicated to German Library. Reusing an unrelated production database increases blast radius and makes RLS/storage maintenance harder.

## 2. Database schema

Apply `backend/supabase-schema.sql` through trusted migration/SQL tooling. The schema supports:

- `collection='level'`: requires A1–C2 `level_code`.
- `collection='special'`: requires `level_code IS NULL` and resources must belong to a Special Book.
- at most one active Core Book per CEFR level;
- a Core Book must be Published;
- a Published resource must have an `http/https` URL or a Storage path;
- a Published resource cannot belong to a non-Published book;
- a book cannot change collection/level in a way that invalidates its child resources.

All Data API tables have RLS enabled. Browser grants are explicitly reduced to the operations the app needs.

## 3. Starter content

Optionally apply `backend/seed.sql`. It seeds the curated starter catalog using official provider/publisher links.

## 4. Runtime keys

Use the project URL plus a modern **publishable key** (`sb_publishable_...`). Never expose a Supabase secret key or legacy `service_role` key in HTML/JavaScript.

Production build variables:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SITE_URL=https://your-domain.example
```

`npm run build` writes these public client values into `dist/assets/runtime-config.js` and does not modify the source config.

## 5. Staff access

Create staff users with Supabase Auth. New users receive `learner` by default. Promote the first trusted user through SQL/admin tooling, for example:

```sql
update public.profiles
set role='admin'
where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');
```

Use `editor` for content editors who do not need a future user-management role. There is intentionally no browser policy that lets users promote themselves.

If only staff should have accounts, disable open sign-ups after creating/inviting the required users.

## 6. Private Storage

The schema creates a private `resource-files` bucket. Upload/write access is staff-only. Public access is limited to objects referenced by Published resource records and is delivered through short-lived signed URLs.

Do not make the bucket public. Do not place secret keys in the browser to bypass RLS.

## 7. Verification after applying schema

Run:

```text
backend/post-deploy-check.sql
```

Then use Supabase Security/Performance Advisors and verify:

- anonymous users can read only Published courses/resources;
- anonymous users cannot insert/update content;
- learner accounts cannot edit content;
- editor/admin accounts can manage content;
- private files for Published resources can be opened;
- unpublished/private objects are not accessible publicly;
- upload, replacement/removal and signed URL behavior work on mobile;
- session expiry/re-login works cleanly.

## 8. Migration note

The schema contains compatibility changes for the prior v6/v7 model, but a fresh dedicated production database is preferred for the first public release. Always back up an existing production database before applying migrations.


## P0 Security Patch — 2026-10-15

پس از Migration اصلی مقالات (`backend/migrations/20261014_vnext_articles.sql`) باید `backend/migrations/20261015_p0_article_source_read_access.sql` اجرا شود. این Patch دسترسی به رکورد خام نسخه‌های تأییدنشده را برای کاربران واردشده محدود می‌کند. سپس `backend/validation/p0_article_access_check.sql` را اجرا کرده و ماتریس واقعی نقش‌ها را مطابق `docs/P0_SECURITY_AND_NAV_REPORT_FA.md` آزمایش کن. وجود سورس Patch به معنی تغییر دیتابیس جاری نیست.
