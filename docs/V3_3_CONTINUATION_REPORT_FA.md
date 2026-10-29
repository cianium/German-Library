# گزارش ادامه توسعه Lexipfad v3.3

تاریخ: ۲۰۲۶-۱۰-۲۸
نسخه: `3.3.0-mobile-preview`
وضعیت: Source Preview؛ نه Production و نه تأییدشده روی Supabase زنده

## مرحله ۰ — Baseline

- ZIP و handoff جدید به‌عنوان منبع حقیقت بررسی شدند.
- `npm run qa` پیش از تغییر پاس شد.
- هیچ secret، داده، لینک منبع یا migration ساختگی اضافه نشد.
- معماری HTML/CSS/JavaScript، Supabase و Vercel Functions حفظ شد.

## مرحله ۱ — تثبیت Floating Glass Navigation

تغییرها:

- لینک تکراری «مقالات» از منوی SSR حذف شد.
- مقصدهای SSR و static روی ترتیب مصوب خانه، سطوح، کتابخانه، رسانه، مقالات یکسان شدند.
- قانون CSS قدیمی grid چهارمقصدی حذف شد.
- active-state برای roadmap و منتخب‌های ویژه اصلاح شد.
- متن و assertions تست‌ها به پنج مقصد به‌روزرسانی شدند.

فایل‌ها:

- `server/article-navigation.js`
- `assets/site-ui.js`
- `assets/styles.css`
- `tools/p0-security-navigation-qa.mjs`
- `tools/vnext-articles-qa.mjs`
- `tools/p0-ssr-browser-qa.py`

## مرحله ۲ — تجربه عمومی موبایل

- Search و Account به‌صورت مشترک و قابل‌دسترس در Header عمومی قرار گرفتند.
- مقصد Account بعد از رویداد Auth برای Author/Admin/Editor به workspace معتبر تغییر می‌کند.
- Bottom Navigation هنگام باز بودن Keyboard روی فرم‌های عمومی پنهان می‌شود.
- عرض‌های کوچک، Dark Mode، Reduced Transparency و focus state حفظ شدند.
- هیچ route یا قرارداد داده تغییر نکرد.

## مرحله ۳ — Author Studio موبایل

- Navigation اختصاصی: «مقالات من»، «مقاله جدید»، «مشاهده سایت».
- هنگام ورود به Editor، Focus Mode فعال و Header/Footer مزاحم حذف می‌شوند.
- Save/Preview/Back در action dock ثابت و keyboard-aware در دسترس می‌مانند.
- Visual Viewport برای محاسبه inset صفحه‌کلید استفاده می‌شود.
- منطق autosave، optimistic revision، preview، SEO، sanitizer و RLS تغییر نکرد.
- تست مرورگر اکنون Focus Mode و مخفی شدن ناوبری لیست را نیز بررسی می‌کند.

فایل‌ها:

- `article-studio.html`
- `assets/article-studio.js`
- `assets/styles.css`
- `tools/article-studio-mobile-qa.py`

## مرحله ۴ — Admin Studio

- لینک مستقیم Article Studio در Hero اضافه شد.
- برای Admin/Editor متصل، تعداد واقعی مقاله‌های `in_review` با query تحت RLS نمایش داده می‌شود؛ در خطا هیچ عدد ساختگی نشان داده نمی‌شود.
- semantics tabها و وضعیت selected/pressed اصلاح شد.
- هنگام باز بودن modal editor، Header، Main و Mobile Nav پشت dialog از focus و accessibility tree خارج می‌شوند.
- نقش `super_admin` اضافه نشد؛ مدل موجود `admin/editor/author/learner` حفظ شد.

فایل‌ها:

- `admin.html`
- `assets/page-admin.js`

## نتایج آزمون

- `node --check assets/article-studio.js` — PASS
- `node --check assets/page-admin.js` — PASS
- `npm run qa` — PASS؛ صفر خطا/هشدار static و تمام regressionهای mock موفق
- build با placeholderهای غیرواقعی — PASS
- `npm run verify:dist` — PASS
- `npm run qa:studio:browser` — PASS در Chromium و عرض‌های 320، 390، 768 و 1024؛ بدون overflow و خطای JavaScript
- `npm run qa:ssr:browser` — PASS؛ index/detail، پنج مقصد، active-state یکتا، menu interaction و نبود overflow
- screenshot: `docs/screenshots/GL-vnext-article-studio.png`

این تست‌های مرورگر mocked هستند و RLS یا Storage زنده را تأیید نمی‌کنند.

## وضعیت واقعی انتشار و موارد باقی‌مانده

انتشار Production هنوز **No-Go** است تا موارد زیر انجام شوند:

1. اجرای migrationهای vNext و P0 روی Development/Staging و تست زنده نقش‌ها.
2. بررسی اختلاف مهم: handoff از migration امنیتی S1 مالکیت منابع نام می‌برد، اما ZIP v3.3 آن فایل را ندارد. نباید بدون تعیین migration history دیتابیس فایل نسخه دیگری کورکورانه وارد شود.
3. تست واقعی روی iOS Safari و Android Chrome برای Keyboard، Safe Area و blur performance.
4. تست Screen Reader و keyboard-only روی دستگاه/مرورگر واقعی.
5. Rate limit API، self-host SDK، MIME/quota/scan آپلود و account recovery همچنان release gate هستند.
6. Preview Deployment و smoke test واقعی Vercel/Supabase انجام نشده است.

## مرحله پیشنهادی بعد

- ابتدا migration inventory و role matrix زنده در Staging.
- سپس ورود یک Book Package دارای مجوز و آزمایش کامل Cover/PDF/Audio/Transcript.
- بعد از آن، بهبود تدریجی Home/Level/Book Detail با داده واقعی و بدون افزودن LMS، Gamification یا پرداخت.
