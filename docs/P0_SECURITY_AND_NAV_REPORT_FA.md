# German Library — گزارش تحویل P0: امنیت و تثبیت ناوبری

**تاریخ:** ۱۵ اکتبر ۲۰۲۶  
**مبدأ:** `German-Library-v3.2-Mobile-Article-Studio-Preview(1).zip` / `3.2.0-preview`  
**نسخه خروجی:** `3.2.1-p0-preview`  
**وضعیت:** اصلاحات سورس و تست‌های محلی تکمیل شدند؛ Migration روی Supabase واقعی **اعمال نشده** و انتشار Production **انجام نشده** است.

## ۱. یافته امنیتی P0

**مسئله:** در `backend/migrations/20261014_vnext_articles.sql`، policy `authenticated article access` به هر حساب واردشده اجازه می‌داد رکورد کامل مقاله را بخواند، مشروط به اینکه `published_snapshot` آن موجود باشد. این رکورد می‌تواند شامل `body_html` و metadata در حال بازنویسی باشد که هنوز Editor تأیید نکرده است؛ بنابراین دیدن نسخه عمومیِ snapshot امن بود اما خواندن مستقیم از REST جدول `articles` امن نبود.

**اصلاح افزایشی:** `backend/migrations/20261015_p0_article_source_read_access.sql`

- سیاست سراسری خواندن رکورد برای کاربران واردشده حذف و با سیاست مبتنی بر مالکیت مقاله یا نقش Editor/Admin جایگزین شد.
- Policy بی‌اثر/پرریسکِ خواندن مستقیم جدول توسط `anon` حذف شد و `SELECT` جدول خام از `anon` گرفته شد.
- خواندن محتوای تأییدشده همچنان از **view با فیلدهای محدود** `published_articles` انجام می‌شود. این view به‌صورت عمدی، تحت owner database اجرا می‌شود و فقط آخرین `published_snapshot` را در اختیار کاربران قرار می‌دهد. تبدیل سادهٔ آن به `security_invoker` بدون تغییر معماری امکان‌پذیر نیست، چون مهمان به جدول زیرین grant ندارد. از افزودن فیلدهای خام به این View باید اکیداً خودداری شود.
- هیچ API جدید با service-role ایجاد نشده و دسترسی User، Author و Editor به UI از طریق همین الگوی قبلی حفظ شده است.

**رفتار مورد انتظار پس از اجرای Migration:**

| سناریو | خواندن `articles` (رکورد خام) | خواندن `published_articles` |
|---|---|---|
| مهمان | ممنوع | snapshot منتشرشده مجاز |
| Learner واردشده | ممنوع | snapshot منتشرشده مجاز |
| Author صاحب مقاله | رکورد خودش مجاز | snapshot منتشرشده مجاز |
| Author دیگر | ممنوع | snapshot منتشرشده مجاز |
| Editor / Admin | مجاز جهت بازبینی | snapshot منتشرشده مجاز |

**هشدار:** این جدول رفتار مورد انتظارِ کد اصلاح‌شده است، نه نتیجه آزمون زنده دیتابیس.

## ۲. ناوبری SSR و URL

**مسئله:** `api/articles.js` و `api/article.js` مستقل از `assets/site-ui.js` نوار پایین پنج‌مقصدی ایجاد می‌کردند، درحالی‌که ناوبری عمومی V7.5 چهارمقصدی بود. در عرض‌های کوچک، نوار بزرگ‌تر از طرح اصلی می‌شد.

**اصلاح:** تابع مشترک SSR در `server/article-navigation.js` به هر دو endpoint اضافه شده است:

`سطح → مکمل → خانه → کتابخانه`

ورودی «مقالات» در منوی ثانویه و Breadcrumb باقی مانده است. Article Studio و Admin Navigation تغییری نکرده‌اند. فایل مشترک خارج از پوشه `api` قرار گرفت تا خودش به‌اشتباه به‌عنوان Vercel Function شناسایی نشود.

**اصلاح جانبی SEO:** `api/article.js` وقتی Canonical/OG/Cover خالی بود، به‌جای نبود URL ممکن بود Origin اصلی را تولید کند. اکنون رشته خالی واقعاً خالی محسوب می‌شود و canonical استاندارد مقاله به `/articles/{slug}` برمی‌گردد.

## ۳. راهنمای اعمال روی Supabase Development

1. از دیتابیس پشتیبان تهیه کن و نخست محیط Development یا Staging را انتخاب کن. به Production مستقیماً مهاجرت نکن.
2. در پروژه‌ای که Migrationهای قبلی V7.4، v3 و `20261014_vnext_articles.sql` **قبلاً اعمال شده‌اند**، فقط Patch جدید `backend/migrations/20261015_p0_article_source_read_access.sql` را به‌ترتیب اجرا کن.
3. اگر پروژه Supabase تازه است، پس از `backend/supabase-schema.sql` و migrationهای قبلی به ترتیب مذکور، **حتماً** Patch P0 را نیز اجرا کن.
4. `backend/validation/vnext_articles_check.sql` و `backend/validation/p0_article_access_check.sql` را اجرا کن. تمام ستون‌های `pass` در فایل دوم باید `true` باشند.
5. با پنج حساب/نقش واقعی (Guest، Learner، Author مالک، Author غیرمالک، Editor) REST requests مثبت/منفی بزن. **ضروری:** مقاله‌ای را که `published_snapshot` دارد باز کن و سپس نسخه منتشرنشده آن را ویرایش کن؛ Learner و Author غیرمالک نباید `body_html` نسخه جدید را از `/rest/v1/articles` ببینند ولی از `published_articles` فقط نسخه قدیمی را ببینند.
6. سپس Create Draft، Autosave، Submit for Review، Request Changes، Approve/Publish، Archive، Revision History و Author Preview را تست کن. Author مالک باید همچنان قادر به ذخیره مقاله خودش باشد؛ Editor باید بتواند آن را بخواند و منتشر کند.
7. Supabase Security Advisors و Performance Advisors، مسیرهای Storage خصوصی و Logهای خطا را بررسی کن. فقط پس از این مرحله اجازه Deploy Preview داده می‌شود.

CLI رسمی Supabase در محیط تحویل حاضر نصب نبود؛ Patch با سبک Migrationهای موجود نوشته شد ولی به Migration Registry هیچ دیتابیس واقعی اضافه نشده است. برای مدیریت رسمی migration در محیط توسعه خودت از Supabase CLI همان محیط و `supabase migration new` طبق نسخه نصب‌شده استفاده کن یا محتوا را در pipeline رسمی مهاجرت وارد کن. **Patch را دوبار به‌عنوان Migration مستقل اجرا نکن.**

## ۴. آزمون‌های اجراشده

| آزمون | نتیجه و محدوده |
|---|---|
| `npm run qa` | PASS — Static/Content/Backend mock/V7.4/v3/VNext/P0 |
| `npm run qa:ssr:browser` | PASS — Chromium mock، فهرست و جزئیات، ۳۲۰/۳۹۰/۷۶۸/۱۰۲۴، بدون overflow، بازشدن منو |
| `npm run release:check` | PASS — با `SUPABASE_URL` و Publishable Key کاملاً ساختگی؛ Production را تأیید نمی‌کند |
| `node --check api/article.js api/articles.js server/article-navigation.js` | PASS |
| تست Postgres واقعی | **انجام نشده**؛ داده دسترسی Development ارائه نشده بود |
| تست امنیتی REST با نقش‌های واقعی | **انجام نشده**؛ نیازمند Supabase staging و حساب‌های آزمایشی |
| تست Safari و اندروید واقعی | **انجام نشده** |

## ۵. محدودیت‌های باقی‌مانده و اولویت بعدی

- تا پیش از اجرای Migration در محیط واقعی، **آسیب‌پذیری در نسخه Deploy شده احتمالی همچنان برطرف‌نشده محسوب می‌شود**؛ تغییر کد Frontend به‌تنهایی RLS را تغییر نمی‌دهد.
- هنوز نیازمند بررسی Storage و سیاست‌های مالکیت فایل، بررسی سیاست‌های گسترده مدیریت منابع توسط Authors، و تست‌های Session/Role واقعی هستیم.
- Article Media Pipeline، آپلود مستقیم عکس، مدیریت امن publish-time asset، Structured Editor و Server Pagination جزو این Patch نبودند.
- برای انتشار عمومی، گذر از Staging، اجرای Security Advisor و آزمون نقش‌ها **Release Gate الزامی** است.

## ۶. اسناد مرجع

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Views: https://supabase.com/docs/guides/database/views
- Supabase Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase breaking change مربوط به Grantهای صریح: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
