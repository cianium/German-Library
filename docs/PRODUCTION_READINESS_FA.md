# وضعیت آمادگی Production — Lexipfad v3.3

تاریخ ارزیابی: ۲۹ اکتبر ۲۰۲۶

## نتیجه

سورس فعلی یک **Production Candidate** است: build، تست‌های امنیتی/ساختاری و تست‌های مرورگر محلی پاس شده‌اند. این عبارت به معنی انتشار زنده نیست. تا زمانی که migration روی Staging اعمال، RLS با حساب‌های واقعی آزمایش و Preview واقعی Vercel تأیید نشود، وضعیت انتشار **Blocked** باقی می‌ماند.

## Hardening انجام‌شده

- Supabase JS نسخه `2.117.2` دقیقاً در lockfile قفل و از همان origin سرو می‌شود؛ وابستگی اجرایی به CDN حذف شد.
- حداقل Node به `22` ارتقا یافت.
- CSP فقط اسکریپت‌های same-origin را می‌پذیرد؛ HSTS، DNS-prefetch و cross-domain policy سخت‌تر شدند.
- APIهای مقاله، فهرست مقاله، sitemap و health فقط `GET/HEAD` می‌پذیرند، `405`/`Allow` صحیح و `X-Request-ID` دارند.
- خطاهای server-side بدون URL، کلید یا متن حساس به‌صورت ساخت‌یافته ثبت می‌شوند.
- health endpoint مسیر کامل Function → Supabase REST → response را بررسی می‌کند و جزئیات داخلی را افشا نمی‌کند.
- جریان درخواست لینک و ثبت رمز عبور جدید با پیام ضد user-enumeration اضافه شد؛ Redirect URL/SMTP باید در پروژه زنده تأیید شود.
- migration مالکیت Resource اضافه شد: Author فقط ردیف خودش را می‌بیند/ویرایش می‌کند، نمی‌تواند Publish کند و فقط به `authors/<uid>/...` دسترسی Storage دارد.
- bucket خصوصی باقی مانده و MIME/سقف فایل محدود شده است. اعتبارسنجی client نیز پسوند، MIME و سقف نوع فایل را کنترل می‌کند.
- CI روی Node 22، نصب قفل‌شده، QA، Chromium mobile/SSR، build و dist verification اجرا می‌شود.

## دستور انتشار کنترل‌شده

1. از پایگاه داده Production backup قابل بازیابی بگیر و ابتدا یک Staging هم‌ساخت بساز.
2. migrationهای موجود را به ترتیب اجرا کن؛ آخرین گیت این نسخه `backend/migrations/20261028_v33_production_hardening.sql` است.
3. `backend/validation/s1_author_ownership_check.sql` و `backend/validation/v33_production_hardening_check.sql` را اجرا کن؛ همه سطرها باید `pass=true` باشند.
4. با دو حساب Author و یک Editor چهار negative/positive test انتهای فایل validation را واقعاً اجرا کن.
5. در Supabase، Redirect URLهای Auth، SMTP واقعی، سیاست رمز عبور، CAPTCHA و rate limit ثبت‌نام/ورود را تنظیم و تست کن.
6. در Vercel متغیرهای `SUPABASE_URL`، `SUPABASE_PUBLISHABLE_KEY` و `SITE_URL` را برای Preview و Production جدا تنظیم کن. Secret/service-role هرگز نباید وارد Frontend شود.
7. یک Preview بساز و این مسیرها را end-to-end تست کن: `/health`، ورود، ثبت‌نام، درخواست نویسندگی، ساخت/Preview/ارسال مقاله، review/publish، ساخت Book Package، upload/download signed URL و sitemap.
8. برای `/api/*` و endpointهای Auth در Vercel Firewall/Supabase Auth rate limit عملیاتی تعریف کن. rate limit درون حافظه برای Functionهای توزیع‌شده قابل اتکا نیست و عمداً اضافه نشده است.
9. فایل‌های دارای Copyright و مجوز انتشار را موردبه‌مورد تأیید کن. هیچ منبع نمونه‌ای مجوز واقعی را اثبات نمی‌کند.
10. پس از تأیید Preview، همان artifact را Promote کن؛ سپس smoke test و مانیتورینگ خطا/latency را اجرا کن.

## گیت‌های باز پیش از Go-live

- اجرای migration و تست RLS روی Supabase زنده؛ نتیجه باید در گزارش Rollout ثبت شود.
- Preview/Promotion واقعی Vercel و آزمون دامنه، HTTPS، headerها و health؛ نتیجه باید در گزارش Rollout ثبت شود.
- تنظیم SMTP/CAPTCHA/Redirect URL و سناریوی بازیابی حساب در Supabase Auth.
- تعریف WAF/rate limit و alert برای خطای Function و failure health.
- اگر Authorهای غیرقابل‌اعتماد اجازه upload فایل عمومی خواهند داشت، اسکن malware/magic-byte پیش از Publish لازم است. کنترل MIME فعلی جای اسکن محتوا را نمی‌گیرد.
- ممیزی حقوق نشر و هزینه/سهمیه Storage برای فایل‌های تا ۲۵۰ MiB.

## Rollback

- Frontend/Functions: deployment قبلی Vercel را Promote کن.
- Database: ابتدا policyهای این migration را drop و policyهای `resource managers *` از migration قبلی را بازسازی کن. ستون `created_by` را برای جلوگیری از از‌دست‌رفتن داده حذف نکن.
- در رخداد امنیتی upload را موقتاً در سطح Storage policy/WAF ببند، sessionهای مشکوک را revoke و audit logها را با `X-Request-ID` تطبیق بده.

## تست‌های ثبت‌شده

- `npm run qa`: PASS، صفر خطا و هشدار.
- `npm run release:check`: PASS؛ build و `dist` verification صفر خطا.
- Article Studio mobile Chromium: PASS در عرض‌های 320/390/768/1024.
- SSR article Chromium: PASS در عرض‌های 320/390/768/1024.
- v3 responsive/admin/auth recovery: PASS، 50 بررسی صفحه/viewport.
- v7.4 responsive/admin: PASS، 64 بررسی صفحه/viewport.

این تست‌ها local/mocked هستند و جایگزین RLS و E2E زنده نیستند.
