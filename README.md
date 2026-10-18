# German Library v3.2.1-p0-preview — Security & SSR Navigation Patch

**این نسخه Source-only است، Production نیست.** پچ امنیتی جدید `backend/migrations/20261015_p0_article_source_read_access.sql` باید **پس از** Migration مقالات vNext روی Supabase Development اجرا و با حساب‌های واقعی آزمایش شود. بدون اجرای SQL، مشکل دسترسی به نسخه در حال ویرایش حل نشده است. مسیرهای SSR مقالات چهارمقصدی و هماهنگ با V7.5 شده‌اند؛ SEO URL خالی هم اصلاح شده است. گزارش کامل: `docs/P0_SECURITY_AND_NAV_REPORT_FA.md`.

تست‌ها: `npm run qa`، `npm run qa:ssr:browser` و `npm run qa:studio:browser`. Build آزمایشی جای تست دیتابیس واقعی را نمی‌گیرد.

---

# German Library v3.2.0-preview — Article Studio Mobile Increment

**این بسته یک توسعه افزایشی است و جایگزین کامل نیازمندی‌های V7.5 نیست.**
- ناوبری عمومی چهارمقصدی V7.5 با Articles زیر Extras؛ پنل مدیریت تغییر نکرده است.
- جدول‌ساز، ویرایش لینک داخلی/خارجی، Alt و Caption جداگانه و ویرایش تصویر موجود.
- اصلاح باگ حفظ متادیتا هنگام باز کردن مقاله و بهبود SEO تصویر.
- دستور تست: `npm run qa`؛ تست UI با Chromium و Playwright: `npm run qa:studio:browser`.
- مستندات تغییرات و محدودیت‌ها: `docs/VNEXT_MOBILE_STUDIO_DELTA_FA.md`.
- آپلود امن تصاویر در Editor، Structured Editor Engine و Live Supabase/RLS QA **هنوز انجام نشده است**.
- برای ساخت Production باید `SUPABASE_URL`، `SUPABASE_PUBLISHABLE_KEY` و `SITE_URL` واقعی و امن را تنظیم کنی؛ `dist/` آزمایشی در فایل ZIP تحویلی قرار ندارد.

---

# German Library v3 (Source release)

This v3 release is derived from German Library V7.4.0; it **is not** the older V7.3 release.

## What's in v3.1
- Five destinations: **سطح → مکمل → خانه → مقالات → کتابخانه**.
- Books-only library: categories and featured shelf; all published books regardless of level.
- Admin book editor: stable ID, book type, skills, optional CEFR, featured flag, cover URL/upload, book URL/upload, provider, status, core selection.
- Book assets: audio, podcast, video, transcript are still editable inside a book.
- Dedicated levels directory; independent media in Supplemental tab.
- Calm teal/blue-green light and deep-slate dark palette.
- Vercel server-rendered Articles directory and individual article pages, with raw SEO metadata, JSON-LD, sitemap, 404, and slug redirects.
- Supabase Article Studio workflow, private preview, revision history, optimistic concurrency, SEO checklist, and Admin-only Author assignment with audit.
- Additive Article and role migration: `backend/migrations/20261014_vnext_articles.sql`.

## Run locally on Termux
Extract to a clean directory and run `python -m http.server 8080`; visit `http://127.0.0.1:8080/index.html`. **Never serve an old `dist` directory.** Offline mode uses sample content and a local Demo admin only on localhost. Live authentication/uploads need Supabase.

## Article routes

Article HTML and `/sitemap.xml` run as Vercel Functions. `python -m http.server` does not execute these routes. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SITE_URL` in Vercel. The publishable key is safe for browser use; no service-role key is required by the article renderer.

## Supabase release order
1. Back up Production database and storage.
2. In Development, apply `backend/migrations/20261014_v74_books_media.sql` if missing, then `backend/migrations/20261014_v3_book_metadata.sql`.
3. Apply `backend/migrations/20261014_vnext_articles.sql` **then** `backend/migrations/20261015_p0_article_source_read_access.sql` in Development; run both `backend/validation/vnext_articles_check.sql` and `backend/validation/p0_article_access_check.sql` and live positive/negative role tests.
4. Set public Supabase URL, publishable key and `SITE_URL` in Vercel; never expose service-role keys.
5. Deploy Preview and verify existing Staff, book uploads and sync, plus article login, autosave, RLS, publishing, raw HTML, canonical, redirects and sitemap.
6. Only after successful Preview testing, plan a separate Production migration and deployment. No live Supabase migration or Production deployment was performed in this build.

## QA
`npm run qa` then `npm run build` then `npm run verify:dist`. The mocked Function and raw-HTML checks run in `tools/vnext-articles-qa.mjs`. Local browser QA: `python3 tools/v3-browser-qa.py` (requires Python Playwright and Chromium); it does not verify live Supabase.

## Article platform boundaries

The editor currently uses browser `contenteditable` with allow-list serialization. Cover and inline images require stable public HTTPS URLs. Private draft bucket policies and asset metadata are prepared, but in-editor uploads, crop/focal-point tools, draft-to-public asset promotion, scheduled publishing, and live Supabase tests are not implemented.

## Known constraints
- Level/category changes on existing books with dependent files are blocked to preserve referential integrity; move assets first.
- Cover upload uses existing private Supabase Storage; public viewing requires the current bucket signed-download rules.
- External links are structurally validated but not automatically health-checked.
- Migration is not automatically executed on any live database.
