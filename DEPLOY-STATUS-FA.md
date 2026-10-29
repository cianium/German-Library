# German Library v3.2.1 — راهنمای انتشار امن

## وضعیت در تاریخ ۱۸ اکتبر ۲۰۲۶

- سورس این بسته: **v3.2.1-p0-preview**.
- QA محلی: تمامی تست‌های `npm run qa` موفق شدند.
- Build و `verify:dist`: با کلید **ساختگی مخصوص تست** موفق شدند. **هیچ کلید واقعی داخل ZIP قرار ندارد.**
- GitHub `cianium/German-Library` در زمان بررسی روی نسخه **7.1.1** بود، نه v3.2.1. انتشار GitHub main بدون آپدیت سورس، نسخه جدید را منتشر نمی‌کند.
- پروژه موجود در Vercel: `german-library` با آدرس `https://german-library.vercel.app` و متغیرهای `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` و `SITE_URL`.
- Supabase `German Library`: چهار Migration نسخه 7.1.1 ثبت شده بودند، و در public جدول‌های `profiles`, `levels`, `courses`, `resources` وجود داشتند. **Migrationهای v3/vNext/P0 هنوز ثبت نشده‌اند.**
- اتصال‌های مستقیم ابزار از این محیط نمی‌توانند پوشه آپلودی روی دیسک محلی را به Vercel منتقل کنند؛ از این رو هیچ Deploy جدیدی در این بررسی ثبت نشده است.

## نصب و انتشار Preview با لپ‌تاپ Windows

1. این ZIP را **Extract All** کنید؛ از اجرای مستقیم فایل CMD داخل ZIP خودداری کنید.
2. Node.js نسخه 20 یا جدیدتر را نصب داشته باشید.
3. `DEPLOY-PREVIEW-WINDOWS.cmd` را اجرا کنید. درصورت درخواست ورود، در Terminal دستور `npx vercel@latest login` را اجرا کنید و دوباره روی فایل کلیک کنید.
4. اسکریپت به پروژه موجود `german-library` لینک می‌شود و نسخه جاری را به **Preview** می‌فرستد؛ نسخه Production و آدرس اصلی سایت را تغییر نمی‌دهد.
5. URL چاپ‌شده در Terminal را باز کنید. صفحات عمومی و منوی موبایل را تست کنید. **صفحات SSR مقالات ممکن است تا تکمیل Schema دیتابیس 503 شوند.**
6. برای تکمیل Article Studio باید طبق README و `docs/P0_SECURITY_AND_NAV_REPORT_FA.md` ابتدا محیط Development/Staging دیتابیس را آماده کنید: Migrationهای قبلی، `20261014_vnext_articles.sql` و سپس `20261015_p0_article_source_read_access.sql`؛ سپس Validation و تست واقعی نقش‌ها انجام شود.
7. **فقط بعد از تأیید کامل Staging**، تغییرات و Migrationها را با پشتیبان و برنامه بازگشت به Production ببرید و سپس همان پوشه تأییدشده را با `npx vercel@latest deploy --prod` منتشر کنید.

## بررسی‌های امنیتی قبل از Production

- اجرای `backend/validation/vnext_articles_check.sql` و `backend/validation/p0_article_access_check.sql`.
- تست واقعی دسترسی مقاله با Guest، Learner، Author صاحب/غیرصاحب و Editor.
- بازبینی دسترسی گسترده Author به منابع مشترک و فایل‌های `resource-files`.
- بازبینی Supabase Security Advisor و سیاست‌های Storage.
- بررسی `SUPABASE_URL` و `SUPABASE_PUBLISHABLE_KEY` واقعی در پروژه Vercel (هرگز Service Role یا Secret Key را در Frontend قرار ندهید).
- تست Autosave، ارسال برای بازبینی، انتشار، خواندن SSR، Sitemap و مسیرهای ناوبری.

این فایل گزارش وضعیت است، نه ادعای انجام انتشار آنلاین.
