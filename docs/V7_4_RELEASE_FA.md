# German Library V7.4.0 — Books, Levels, Media & Featured

## محتوای واقعی این نسخه

- **کتابخانه کتاب‌ها (`books.html`)** همه Book Packageها را، چه با Level و چه بدون Level، نمایش می‌دهد. محتوای درس، کار، صوت و متن کتاب داخل `course.html` همان کتاب می‌ماند.
- **صفحات سطوح A1–C2 (`level.html`)** کتاب اصلی، کتاب‌های سطح، مسیر پیشنهادی بر پایه منابع موجود، تمرین مهارت‌ها و منابع تکمیلی را نمایش می‌دهند. خطای توقف رندر به‌دلیل لینک منقضی‌شدهٔ Bottom Navigation اصلاح شده است.
- **رسانه و مطالعه (`media.html`)** فقط فیلم، سریال، پادکست و مقاله مستقل را با فیلتر نوع، سطح و جست‌وجو نمایش می‌دهد. رسانهٔ مربوط به کتاب داخل بسته کتاب است.
- **ویژه (`special.html`)** نشان editorial `featured` را از کتاب‌ها و منابع، از جمله رسانه‌ها و فایل کتاب‌های دارای نشان، می‌خواند. از دسته‌بندی کتابخانه/سطح/رسانه مستقل است.
- **Admin**: افزودن کتابِ بدون سطح، اضافه‌کردن رسانه با سطح اختیاری، featured on/off برای کتاب و منبع، ویرایش عنوان/توضیح و کتاب اصلی هر سطح، مدیریت فایل/لینک و تمرین‌ها. Formها با labelهای مرتبط، وضعیت محلی و Sync موجود کار می‌کنند.
- **Design tokens**: تم روشن سفید/آبی-سبز ملایم؛ تیره سبز-نفتی/Slate؛ با CSS مشترک و ناوبری موبایل.

## Supabase migration — مهم

نسخه v7.4 نیازمند اجرای SQL زیر **روی همان Supabase موجود، قبل از انتشار فرانت‌اند جدید** است:

`backend/migrations/20261014_v74_books_media.sql`

این migration ستون `public.courses.featured` را اضافه می‌کند، مقدار اولیه کتاب‌های قدیمی Special را حفظ می‌کند، collectionهای `library` و `media` و Level اختیاری آن‌ها را مجاز می‌کند و triggers تطبیق کتاب/فایل و رسانه را تقویت می‌کند. تراکنشی است و هیچ RLS، grant یا کلید مخفی را تغییر نمی‌دهد.

قبل از اجرا backup بگیر و SQL را در Staging امتحان کن. **دوباره `backend/supabase-schema.sql` قدیمی را روی پایگاه ارتقایافته اجرا نکن**؛ constraints قدیمی می‌توانند برگردند. `seed.sql` قدیمی را نیز روی Production دارای محتوا دوباره اجرا نکن. اجرای migration روی دیتابیس واقعی در این محیط انجام نشده است.

## تفاوت محیط محلی و Production

در Termux اجرای Python HTTP server از ریشه Source، همراه با Supabase تنظیم‌نشده، پیش‌نمایش محلی بر پایه Catalog و LocalStorage می‌دهد. محتوای واردشده در Demo فقط روی همان مرورگر ذخیره می‌شود. در Production، تغییرات Admin پس از Migration با Supabase Sync می‌شوند.

در شروع، ۴ کتاب و ۳۵ Resource در Catalog نمونه موجود است. **بخش رسانه جدید در محتوای نمونه موردی ندارد**؛ لازم است مدیر فیلم، سریال، پادکست و مقاله مستقل معتبر اضافه کند. B1 تا C2 همچنان Core Book ندارند؛ صفحه‌شان تمرین‌های موجود را نشان می‌دهد، نه مراحل ساختگی.

## تست‌ها

- `npm run qa`: Static, Content, Backend Sync، تست‌های V7.4 IA/Model
- `python tools/v74-browser-qa.py`: بارگذاری مستقیم سورس HTML/JS/CSS در Chromium، ۶۴ حالت صفحه/عرض ۳۲۰–۱۲۸۰ و عملیات Admin آزمایشی. به دلیل محدودیت شبکه در محیط تست، navigation واقعی HTTP، احراز هویت Supabase و موبایل واقعی تست نشده‌اند.
- `npm run release:check`: Production Build و بررسی Bundle با Publishable Key آزمایشی؛ خود استقرار و کلید واقعی باید جداگانه تأیید شوند.

## پیش‌نیاز Production

- Backup و Migration روی Supabase موجود + post-migration read/write / RLS smoke tests
- چک Auth/Admin واقعی و Storage/private file URL
- نسخه Preview در Vercel و تأیید دستگاه اندروید/iOS، آدرس‌ها، لینک‌ها و فوتر
- بررسی و تکمیل محتوای B1–C2

## کارهایی که **انجام نشده‌اند**

آزمایش Supabase زنده، Deploy واقعی Vercel، آپلود محتوای آموزشی تازه، تأیید دستی تمام لینک‌های خارجی، تست خودکار Screen Reader و تست دستگاه iOS/Android. File Manager جامع، Bulk Upload، تاریخچه تغییرات و Role Management نیز هنوز خارج از Scope این نسخه‌اند.
