# German Library — v3.2 Mobile Studio Increment (Preview)

## مبنا و محدوده

این Patch از `German-Library-Organic-Mobile-Editor-Preview` گرفته شده و **بازنویسی محصول** نیست. ساختار کتاب‌ها، Learning Roadmap، Book Package، پنل Admin، احراز هویت و Migrationهای Supabase تغییر نکرده‌اند. قابلیت‌های افزوده‌شده در Editor فعلی (contenteditable) پیاده شده‌اند و **هنوز موتور Tiptap/ProseMirror نیستند**.

## تغییرات واقعی

1. ناوبری عمومی مطابق V7.5 به چهار مقصد Levels → Extras → Home → Books برگشت. مقالات از ورودی مشخص در Extras در دسترس‌اند؛ Admin nav جداگانه و پنج‌گزینه‌ای دست‌نخورده است.
2. Table Builder موبایل: جدول با ۲ تا ۴ ستون و ۲ تا ۶ ردیف به‌اضافهٔ سطر عنوان، ذخیره در همان HTML فعلی و اسکرول افقی در موبایل.
3. رسانه URL: تصویر آموزشی همراه Alt مستقل از Caption، ویرایش تصویر موجود و جایگزینی URL/Alt/Caption بدون حذف کردن تصویر.
4. Link Manager: جست‌وجوی کتاب‌ها، Resourceها و مقاله‌های منتشرشده، درج لینک داخلی، ویرایش متن و URL پیوند موجود، حذف پیوند بدون حذف متن؛ همان URLهای HTTPS مجازند.
5. Toolbar: Underline و H4 اضافه شد؛ HTML هنگام Paste قبل از درج از Sanitizer فعلی عبور می‌کند.
6. چک Image SEO با Alt خالی به‌درستی هشدار می‌دهد (صرف حضور Attribute کافی نیست).
7. باگ حفظ داده: `loadList` اکنون همهٔ فیلدهای ویرایشی شامل `tags`, `related_resource_ids`, `focus_query`, `canonical_url`, `og_image_url` را می‌خواند؛ بنابراین بازکردن و ذخیره یک مقاله قبلی، این مقادیر را ناخواسته خالی نمی‌کند.
8. رفع سرریز Grid در Desktop Editor و نگه داشتن هدف لمس تصویر حتی وقتی URL تصویر در دسترس نیست.

## تست

- `npm run qa`: مجموعه QA قبلی همراه با تست ناوبری چهارمقصدی قبول شد.
- `python3 tools/article-studio-mobile-qa.py`: تست مرورگر با Auth و DB شبیه‌سازی‌شده: جدول، تصویر و ویرایش Alt/Caption، لینک داخلی و حذف لینک، SEO و عرض‌های ۳۲۰/۳۹۰/۷۶۸/۱۰۲۴ بدون خطای JS و overflow.
- `npm run build && npm run verify:dist` فقط با `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SITE_URL` نمونه قابل اجراست؛ اجرای موفق روی مقادیر نمونه **به معنی تأیید Production نیست**.

## انجام‌نشده و دلیل

- آپلود واقعی عکس از گالری و Crop: نیازمند جریان خصوصیِ Author draft، بررسی mime/size، دسترسی Storage، Promotion به Public در لحظه Publish و تست RLS روی Supabase واقعی. URL موقت/signed برای انتشار عمومی کافی نیست. تا قبل از کامل شدن کل مسیر، دکمهٔ Upload جعلی یا ناامن ارائه نشده است.
- مهاجرت موتور Editor به Tiptap و تغییر مدل سند: نیازمند migration/round-trip و تست عکس، جدول، لینک، فارسی و German IME.
- سئوی پیشرفته مانند Redirect مدیریت Slug، Schema Live، بررسی لینک شکسته و محتوای تکراری هنوز کامل نیست.
- مدل چندسطحی کتاب، جست‌وجوی یکپارچه و دیتای واقعی A1–C2 همچنان نیازمند فازهای جداگانه‌اند.
- دسترسی به پایگاه داده واقعی، تست Mobile Safari و استقرار Production انجام نشده است.

## مسیر پیشنهادی بعدی

بخش بعدی باید **Article Media Pipeline** در Supabase Development باشد و پس از آزمایش منفی/مثبت نقش‌ها و انتشار عمومی ادامه پیدا کند؛ سپس ارتقای موتور Structured Editor، SEO داخلی و مدیریت Revision. هر تغییر در SQL باید Migration بازبینی‌شده و نسخه پشتیبان داشته باشد.
