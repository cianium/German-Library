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

## v3.4 Public Article Snapshot Hardening — 2026-10-29

پس از P0 و Migrationهای مالکیت/Production Hardening، فایل
`backend/migrations/20261029_v34_public_article_snapshots.sql` را اجرا کن. این Migration قرارداد فعلی Viewهای `published_articles` و
`article_redirects` را حفظ می‌کند، ولی داده عمومی را به جدول‌های RLS-backed
منتقل و هر دو View را `security_invoker` می‌کند.

سپس `backend/validation/v34_public_article_snapshots_check.sql`، Security
Advisor و ماتریس Guest/Learner/Author مالک/Author غیرمالک/Editor/Admin را اجرا
کن. به‌خصوص تأیید کن که کاربران عمومی فقط Snapshot بازبینی‌شده را می‌بینند و
از `articles` به Source تازه و منتشرنشده دسترسی ندارند.

این Migration در ۲۰۲۶-۱۰-۲۹ با پذیرش صریح ریسک اجرای بدون Backup روی پروژه
آزمایشی `ykxvgtugtvmtwdackzlc` اعمال شد. Validation زنده، Advisor، تست نقش‌های
عمومی و چرخه تراکنشی انتشار پاس شدند. برای محیط Production واقعی همچنان Backup
و محیط پیش‌نمایش مستقل توصیه می‌شود.

Migration تکمیلی `20261029_v34_admin_rpc_invoker.sql` نیز روی همین پروژه اعمال
شد. RPCهای مدیریت نقش API قبلی خود را حفظ می‌کنند، اما دیگر owner-privileged
نیستند؛ دسترسی Update/Insert آن‌ها با Grant ستون‌محور و RLS مخصوص Admin کنترل
می‌شود. Security Advisor پس از اجرا هیچ Warning تابع privileged عمومی ندارد.
Follow-up با نام `20261029_v34_admin_role_guard.sql` نیز Policyهای permissive
پروفایل را ادغام و تغییر مستقیم Role توسط Owner غیرAdmin را با Trigger خصوصی
مسدود می‌کند. تست زندهٔ self-promotion رد شد و Admin اصلی پس از Rollback محفوظ ماند.

## Hosting portability

Frontend باید فقط از `SUPABASE_URL`، `SUPABASE_PUBLISHABLE_KEY` و `SITE_URL`
در زمان Build استفاده کند. هیچ Secret یا `service_role` نباید روی هاست یا داخل
Bundle عمومی قرار گیرد. این قرارداد اجازه می‌دهد خروجی روی Vercel یا یک هاست
ایرانی سازگار با فایل استاتیک/Node میزبانی شود؛ قابلیت SSR مقالات پیش از انتخاب
هاست باید با امکانات Node/Serverless همان سرویس تطبیق داده شود.
