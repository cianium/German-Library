# گزارش تحویل German Library VNext — Article Studio

تاریخ: ۱۴ اکتبر ۲۰۲۶  
پایه: German Library v3.0.0 (مشتق از V7.4)  
وضعیت: کد محلی تکمیل شده؛ Migration و انتشار Production اجرا نشده است.

## معماری انتخاب‌شده

مقاله‌های عمومی با Vercel Functions و Supabase PostgREST به شکل HTML کامل رندر می‌شوند. این انتخاب نیاز به بازسازی وب‌سایت استاتیک ندارد و پس از انتشار، Build مجدد لازم نیست. Cache فهرست و مقاله ۶۰ ثانیه و Cache Sitemap پنج دقیقه است. صفحهٔ مقاله از View محدودشدهٔ `published_articles` می‌خواند که آخرین نسخهٔ تأییدشده را ارائه می‌دهد، نه ویرایش‌های در حال انجام را.

Trade-off: اجرای مسیرها به Vercel Functions و متغیرهای Supabase نیاز دارد؛ `python -m http.server` این APIها را اجرا نمی‌کند. اگر Supabase آماده نباشد، فهرست 503 و مقالهٔ ناموجود 404 می‌دهد. هیچ مقالهٔ نمونه‌ای برای نمایش ساخته نشده است.

## اجراشده در کد

- نوار پایین دقیقاً پنج مقصد دارد: سطح، مکمل، خانه، مقالات، کتابخانه؛ خانه در مرکز است. Active State، Desktop Navigation و Footer هم به‌روز شده‌اند.
- `/articles` فهرست SSR با جست‌وجو، دسته، سطح و مهارت دارد. بخش Featured فقط با دادهٔ واقعی نمایش داده می‌شود.
- `/articles/{slug}` شامل H1 واحد، breadcrumb، canonical، Open Graph، Twitter Card، BlogPosting/BreadcrumbList JSON-LD، تاریخ واقعی، نویسنده، HTML پاک‌سازی‌شده، کاور desktop/mobile و مسیر یادگیری بعدی است.
- Sitemap فقط مقاله‌های دارای snapshot انتشار را اضافه می‌کند؛ Preview noindex، تغییر Slug دارای 301 و Slug ناشناخته HTTP 404 است.
- استودیو از Draft، In Review، Needs Changes، Published و Archived پشتیبانی می‌کند. ذخیرهٔ خودکار/دستی، نسخه‌ها، بازیابی نسخه، Preview خصوصی، SEO checklist و کنترل تعارض نسخه دارد.
- RLS نویسنده را به مقاله‌های خودش محدود می‌کند؛ Review/Publish/Archive دیگران برای Admin و Editor است. انتصاب Author فقط از RPC ادمین همراه Audit مجاز است.
- Author می‌تواند منابع آموزشی و پیوست‌های کتاب/رسانه را مدیریت کند؛ دسترسی مدیریت Book، Level، نقش یا تنظیمات امنیتی به او داده نشده است.
- نوع خارجی `Article` در Resources حفظ شده و به مقالهٔ داخلی تبدیل یا تکثیر نشده است.

## Migration و Environment

برای ثبت‌نام عمومی، Supabase Auth باید اجازهٔ sign-up داشته باشد؛ تأیید ایمیل، Site URL و نرخ درخواست‌ها را مطابق دامنهٔ نهایی تنظیم کن. حساب تازه فقط Learner می‌شود.


Migration افزایشی: `backend/migrations/20261014_vnext_articles.sql`؛ جدول و سیاست‌های امن درخواست نویسندگی نیز داخل همین migration است. فایل Production را تغییر نداده است. آن را پس از Migrationهای V7.4 و v3 ابتدا در Supabase Development بررسی و اجرا کنید. سپس `backend/validation/vnext_articles_check.sql` را اجرا کنید و ماتریس نقش‌ها را با Admin، Editor، Author، Learner و Guest آزمایش کنید.

متغیرهای Vercel:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (فقط publishable key؛ renderer به service-role نیاز ندارد)
- `SITE_URL` (دامنهٔ canonical نهایی)

تصویرها در این نسخه باید URL عمومی پایدار HTTPS داشته باشند. Migration، Bucket خصوصی Draft و سیاست‌های مالکیت را آماده می‌کند، اما UI آپلود عکس و تبدیل امن Draft asset به فایل عمومی هنگام Publish به آن متصل نشده است.

## تست‌های اجراشده

- `node --check` اسکریپت‌های ویرایشگر، Preview و Vercel Functions.
- `npm run qa`: Static، Content، backend sync، V7.4، v3 و VNext؛ همه PASS.
- `npm run build` و `npm run verify:dist`: PASS با مقادیر آزمایشیِ غیرواقعی برای config؛ کلید یا سرویس واقعی در دسترس نبود.
- آزمون افزودهٔ `tools/vnext-articles-qa.mjs`: ترتیب ۵ مقصد، Permission gates، HTML خام SEO، حذف payload آزمایشی XSS، 404، 301 و Sitemap؛ PASS با fetch شبیه‌سازی‌شده.

## محدودیت‌های باقی‌مانده

- Migration روی Supabase واقعی یا محیط Development اجرا نشده؛ RLS، درخواست/تأیید Author و Storage تست زنده نشده‌اند.
- انتشار Vercel و بررسی شبکه‌ای Functionها روی دامنهٔ واقعی انجام نشده است.
- آپلود عکس از گالری/دوربین، Drag & Drop، Clipboard upload، progress/retry، crop/focal point و انتقال Draft asset به Bucket عمومی در UI وجود ندارد.
- ویرایشگر Vanilla از `contenteditable` و allow-list serialization استفاده می‌کند؛ Tiptap اضافه نشده و Undo/Redo به پشتیبانی مرورگر وابسته است. جدول در Sanitizer پشتیبانی می‌شود اما Toolbar ساخت جدول ندارد.
- TOC، citation manager، hreflang، پروفایل عمومی نویسنده و نمایش Audit History پیاده نشده‌اند.
- تست iOS/Android، Screen Reader و نقش‌های زنده به‌علت نبود credentials و Playwright نصب‌شده اجرا نشد.

## ترتیب انتشار

۱. Migrationهای V7.4 و v3 را در Development تأیید کنید. ۲. Migration جدید را اجرا کنید. ۳. SQL validation و تست منفی role/storage را تکمیل کنید. ۴. متغیرهای دامنه را در Vercel تنظیم کنید و Preview بسازید. ۵. HTML خام، Canonical، Redirect، Sitemap، privacy فایل و Authorization نویسنده را بررسی کنید. ۶. پس از قبولی این موارد، انتشار Production را جداگانه انجام دهید.
