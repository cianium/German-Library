# گزارش مرحله ۰ v3.4 — پایه امنیت و Build

تاریخ: ۲۰۲۶-۱۰-۲۹  
وضعیت: **روی پروژه آزمایشی اصلی Supabase اعمال و اعتبارسنجی شد؛ انتشار Frontend انجام نشده**

## انجام‌شده

- `.env.example` بدون Secret اضافه شد.
- دستورهای `build:local` و `release:check:local` اضافه شدند؛ `.env.local` با قابلیت داخلی Node بارگذاری می‌شود.
- Migration جدید، داده عمومی مقالات را از جدول Source جدا می‌کند:
  - `article_publications`: فقط Snapshot بازبینی‌شده؛
  - `article_public_redirects`: فقط Redirect عمومی؛
  - هر دو جدول RLS دارند و برای Anon/Authenticated فقط `SELECT` مجاز است؛
  - Viewهای سازگار `published_articles` و `article_redirects` اکنون در Migration هدف `security_invoker` هستند؛
  - هیچ Grant عمومی تازه‌ای روی `articles` ایجاد نمی‌شود.
- Trigger همگام‌سازی Snapshot، Backfill، Policyها و Rollback outline اضافه شدند.
- Validation SQL برای RLS، Grantها، View options، نبود Write عمومی، Count parity و عدم نمایش ستون‌های Source اضافه شد.
- QA استاتیک برای جلوگیری از بازگشت Viewهای Owner-privileged توسعه یافت.
- RPCهای عمومی مدیریت نقش از `SECURITY DEFINER` به `SECURITY INVOKER` تبدیل
  شدند؛ مجوزهای حداقلی ستون‌محور و سه Policy مخصوص Admin جایگزین bypass شدند.
- Policyهای UPDATE پروفایل ادغام و Trigger خصوصی `profiles_role_guard` اضافه شد؛
  تلاش مستقیم کاربر عادی برای ارتقای نقش خودش در تست زنده رد شد.
- صفحه رسانه به چهار Shelf افقی فیلم، سریال، پادکست و مقاله تبدیل شد.
- فوتر عمومی به شش لینک در دو ستون سه‌ردیفی و جایگاه امن و config-driven برای
  Instagram/Telegram تبدیل شد؛ URL ساختگی در Bundle قرار نمی‌گیرد.
- race condition نمایش زودهنگام Admin قبل از اتصال handlerها رفع شد.
- Setup و Release Checklist با ترتیب Migration و Gateهای Staging به‌روزرسانی شدند.

## فایل‌های تغییرکرده

- `.env.example`
- `package.json`
- `README.md`
- `backend/migrations/20261029_v34_public_article_snapshots.sql`
- `backend/validation/v34_public_article_snapshots_check.sql`
- `tools/p0-security-navigation-qa.mjs`
- `tools/qa.py`
- `docs/SUPABASE_SETUP.md`
- `docs/RELEASE_CHECKLIST_FA.md`

## تست‌ها

| تست | نتیجه |
|---|---|
| `npm run qa` | Pass؛ صفر خطا و هشدار Static |
| `build:local` بدون Env | Fail-closed مطابق انتظار؛ Bundle ناقص ساخته نشد |
| `build:local` با مقادیر کاملاً ساختگی CI | Pass |
| `npm run verify:dist` | Pass؛ صفر خطا |
| `git diff --check` | Pass |
| ثبت Migration در Supabase | Pass؛ `20261029083358_v34_public_article_snapshots` |
| Validation زنده RLS/Grant/View | Pass؛ تمام شرط‌ها true و mismatchها صفر |
| Security Advisor | Pass برای این Patch؛ دو Error نوع `security_definer_view` حذف شدند |
| چرخه تراکنشی Publish/Review/Redirect/Archive/Republish | Pass؛ تست در پایان Rollback شد |
| اجرای واقعی با نقش‌های `anon` و `authenticated` | Pass؛ Read عمومی مجاز و Write/Source غیرمجاز |
| Admin RPC Invoker/RLS | Pass؛ Admin مجاز و Caller غیرمجاز رد شد؛ تست Rollback شد |
| Direct self-promotion | Pass؛ Update مستقیم Role برای Learner رد و Rollback شد |
| Browser QA کامل | Pass؛ 56 + 64 + 50 page/viewport check |
| Author Studio و SSR Chromium | Pass؛ بدون overflow یا JavaScript error |

## وضعیت اجرای Supabase

Migration در تاریخ ۲۰۲۶-۱۰-۲۹ روی پروژه آزمایشی `ykxvgtugtvmtwdackzlc`
اعمال شد. کاربر صریحاً اعلام کرد این پروژه آزمایشی است و اجرای بدون Backup را
پذیرفت. Supabase CLI محلی به‌علت Home فقط‌خواندنی قابل استفاده نبود؛ اعمال و
اعتبارسنجی با اتصال رسمی Supabase انجام شد.

Security Advisor اکنون فقط Warning مربوط به Leaked Password Protection را
گزارش می‌کند. این قابلیت طبق مستندات رسمی فقط در پلن Pro و بالاتر فعال است و
از SQL پروژه قابل تغییر نیست؛ پس باید پس از ارتقای پلن از Auth Dashboard فعال شود.

## باقی‌مانده مرحله ۰

- تکمیل Role Matrix با حساب‌های واقعی Learner، Author مالک/غیرمالک، Editor و Admin.
- فعال‌سازی Leaked Password Protection پس از ارتقای پلن و تنظیم CAPTCHA.
- اجرای Secret-history scan و Active Pentest در محیط دارای ابزار.
- Browser/Accessibility QA واقعی.
- آماده‌سازی بسته استقرار مستقل از Vercel برای هاست نهایی ایرانی.

