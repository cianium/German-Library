# ممیزی کامل و نقشه‌راه اجرایی Lexipfad v3.4

تاریخ ممیزی: ۲۰۲۶-۱۰-۲۹  
مبنای بررسی: شاخه `codex/v3.3-restart`، دیتابیس زنده `German-Library`، Supabase Postgres 17.11 و تنظیمات فعلی Vercel  
وضعیت پیشنهادی محصول: **Production Candidate / Public Beta**، نه نسخه نهایی Production-ready

## ۱. خلاصه مدیریتی

زیرساخت اصلی، Navigation پنج‌مقصدی، SSR مقالات، Storage خصوصی، Author Studio و تفکیک پایه نقش‌ها واقعاً پیاده‌سازی شده‌اند. بااین‌حال چهار مانع برای اعلام نسخه نهایی وجود دارد:

1. دو هشدار سطح Error در Supabase Security Advisor برای Viewهای `published_articles` و `article_redirects` باز است.
2. Sync کتاب‌ها و منابع تراکنشی و دارای کنترل هم‌زمانی نیست؛ خطای میانی یا ویرایش هم‌زمان می‌تواند داده را نیمه‌کاره یا بازنویسی کند.
3. مدل داده هیچ مدرک قابل ممیزی برای Copyright/License نگهداری نمی‌کند.
4. Media Showcase، Footer درخواستی و Super Admin Studio یکپارچه هنوز کامل نیستند.

هیچ آسیب‌پذیری Critical اثبات‌شده‌ای در این ممیزی پیدا نشد؛ اما تا اجرای تست واقعی ماتریس نقش‌ها و رفع/پذیرش رسمی موارد Security Advisor، ادعای «امنیت کامل Production» قابل دفاع نیست.

## ۲. شواهد و محدودیت‌های ممیزی

### موارد تأییدشده

- `npm run qa`: تمام QAهای استاتیک، Content، Backend Sync شبیه‌سازی‌شده، Article، Escape، Ownership و Production Security پاس شدند.
- `npm audit --omit=dev`: صفر آسیب‌پذیری شناخته‌شده در وابستگی‌های Production.
- Supabase زنده: همه جدول‌های اصلی `public` دارای RLS هستند.
- دیتابیس زنده: ۴ کتاب، ۳۶ منبع، ۱ مقاله و ۱ پروفایل دارد.
- محتوای زنده: ۳۳ منبع سطح، ۲ فایل کتاب ویژه و فقط ۱ Podcast در Media وجود دارد.
- تمام ۳۶ منبع منتشرشده هدف دسترسی دارند و `verified_at` آن‌ها ثبت شده است.
- Headerهای CSP، HSTS، `nosniff`، `DENY`، COOP و Permissions Policy در Vercel تعریف شده‌اند.
- نسخه Supabase JS پین شده و Lockfile ثبت شده است.

### موارد تأییدنشده

- `npm run release:check` در این محیط پس از QA در Build متوقف شد: `Missing required production environment variable: SUPABASE_URL`.
- Chromium محلی به دلیل محدودیت sandbox با `SIGTRAP` بسته شد؛ بنابراین این اجرای خاص، Browser QA را تأیید نمی‌کند.
- فقط یک Profile زنده وجود دارد؛ تست واقعی Guest/Learner/Author/Editor/Admin با پنج حساب مستقل اجرا نشده است.
- ابزار `hackingtool` در Preflight وضعیت `blocked` داد: Nuclei، Nmap، FFUF و Subfinder نصب نبودند و Docker در دسترس نبود. Active Pentest و Secret-history scan اجرا نشد.
- Screen Reader، VoiceOver/TalkBack، صفحه‌کلید واقعی موبایل و Contrast Audit دستی اجرا نشده‌اند.

## ۳. ماتریس واقعی نقش‌ها

| نقش | خواندن | نوشتن/مدیریت | موارد ممنوع یا محدود |
|---|---|---|---|
| Guest/Anon | Levelها، کتاب‌ها و منابع Published، Snapshot مقالات Published، فایل‌های متصل به منابع Published | هیچ | Draftها، Profileها، Studio و Admin |
| Learner | امکانات Guest + Profile خودش + تاریخچه درخواست نویسندگی خودش | تغییر `display_name` خودش، ساخت درخواست Author | محتوا، نقش‌ها، فایل‌ها و مقاله‌ها |
| Author | Publishedها + منابع Draft/Archived متعلق به خودش + مقاله‌ها/Revision/Assetهای خودش | ساخت و ویرایش منبع خودش، Upload در `authors/<uid>/...`، نوشتن مقاله و ارسال برای Review | انتشار منبع/مقاله، کتاب، Level، نقش و تنظیمات؛ ویرایش منبع Published ممنوع است |
| Editor | تمام کتاب‌ها، منابع، Levelها و Source مقاله‌ها | ایجاد/ویرایش و انتشار Catalog، Review/Publish مقاله، مدیریت فایل‌ها | مدیریت نقش‌ها و اعطای Author |
| Admin | تمام موارد Editor + Profileها، درخواست‌ها و Audit نقش | اعطا/لغو Author و بررسی درخواست‌ها | تغییر Admin/Editor از UI عمداً فراهم نشده؛ تغییر نقش خودش با RPC ممنوع است |

### ایرادهای نقش و مجوز

- **SEC-R01 — P0:** ماتریس بالا از Policy و کد استخراج شده، اما با حساب‌های واقعی Negative Test نشده است.
- **SEC-R02 — P1:** Frontend تابع `isStaff()` را برای Author هم `true` می‌داند، ولی `private.is_staff()` در دیتابیس فقط Editor/Admin است. رفتار فعلی با Helperهای دیگر جبران شده، اما نام‌گذاری دوگانه مستعد خطای آینده است.
- **SEC-R03 — P1:** مدیریت نقش فقط Author را Toggle می‌کند؛ چرخه رسمی ایجاد/تعلیق Editor، تعلیق کاربر و لغو Session وجود ندارد.
- **SEC-R04 — P2:** صف درخواست Author داخل تب عمومی «ابزارها» دفن شده و جست‌وجو، تاریخچه تصمیم، فیلتر و نمایش Audit مناسب ندارد.

## ۴. یافته‌های امنیتی

### P0 — قبل از هر Release نهایی

#### SEC-01: Viewهای دارای رفتار Security Definer

Supabase Security Advisor دو Error گزارش می‌کند:

- `public.published_articles`
- `public.article_redirects`

این Viewها با مجوز مالک اجرا می‌شوند و RLS فراخواننده را اعمال نمی‌کنند. خروجی فعلی عمداً فقط Snapshot منتشرشده را برمی‌گرداند، بنابراین نشت Draft در بررسی حاضر اثبات نشد؛ بااین‌حال معماری به Privilege مالک View وابسته است.

راه‌حل امن: طراحی یکی از این دو مسیر و تست قبل از Migration:

1. جدول جداگانه `published_article_snapshots` با RLS عمومی و Sync تراکنشی هنگام Publish؛ یا
2. View با `security_invoker=true` همراه Grant ستونی بسیار محدود و تست مستقیم عدم دسترسی به Source مقاله.

تغییر ساده View به `security_invoker` بدون بازطراحی Grantها ممنوع است، چون ممکن است API را بشکند یا Source مقاله را قابل خواندن کند.

مرجع: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

#### SEC-02: نبود تست زنده ماتریس نقش

تست‌های فعلی عمدتاً Mock/Static هستند. باید پنج حساب مستقل ساخته و برای هر Table، RPC، Storage path و Workflow تست Allow/Deny اجرا شود. معیار قبولی: تمام عملیات خارج از Scope با `401/403` یا صفر ردیف رد شوند و هیچ Role فقط با پنهان‌کردن UI محافظت نشود.

### P1 — Hardening امنیتی

#### SEC-03: RPCهای مدیریتی Security Definer

دو RPC برای `authenticated` قابل اجرا هستند:

- `admin_set_author`
- `admin_review_author_request`

هر دو `search_path=''`، کنترل `auth.uid()` و بررسی Admin داخلی دارند و دسترسی Anon نیز لغو شده است؛ بنابراین Bypass مستقیم اثبات نشد. بااین‌حال Advisor هشدار می‌دهد و Negative Test با Learner/Author/Editor لازم است. در صورت حفظ این طراحی، قرارداد امنیتی و تست Regression الزامی است.

مرجع: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

#### SEC-04: Leaked Password Protection غیرفعال

محافظت HaveIBeenPwned در Supabase Auth فعال نیست. باید فعال و با ثبت‌نام/تغییر رمز آزمایش شود.

مرجع: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

#### SEC-05: CAPTCHA و ضدسوءاستفاده Auth در Client وجود ندارد

Signup و Reset هیچ `captchaToken` ارسال نمی‌کنند. Rate limitهای Supabase باید بازبینی و CAPTCHA برای Signup/Reset/Author Request یکپارچه شود. درخواست Author فقط یک Pending هم‌زمان را محدود می‌کند، اما بعد از Reject می‌تواند بی‌وقفه تکرار شود؛ Cooldown دیتابیسی لازم است.

#### SEC-06: اعتبارسنجی فایل به Metadata مرورگر متکی است

پسوند، `file.type`، اندازه و MIME Bucket بررسی می‌شوند؛ اما Magic-byte/Content inspection وجود ندارد. فایل با Metadata جعلی می‌تواند Upload شود. برای فایل‌های منتشرشدنی، Sniffing سروری، Quarantine و در صورت نیاز Malware scan لازم است.

#### SEC-07: تصاویر خارجی مقاله می‌توانند Tracking ایجاد کنند

مقاله‌ها تصویر HTTPS از هر Origin را می‌پذیرند و CSP نیز `img-src https:` دارد. Editor باید Domain/License را بررسی کند. مسیر بهتر: Asset promotion به Storage کنترل‌شده و محدودکردن CSP به Originهای مجاز.

#### SEC-08: Sanitizer اختصاصی نیازمند Fuzz Test است

Client از DOMParser و Server از Parser مبتنی بر Token/Regex استفاده می‌کند. تست‌های XSS فعلی پاس شده‌اند، اما Sanitizer دومنظوره سفارشی سطح حمله و اختلاف رفتار ایجاد می‌کند. باید Corpus شامل HTML ناقص، Entityهای چندلایه، SVG/MathML، URLهای مبهم و Unicode اجرا شود؛ سپس در صورت امکان یک Sanitizer استاندارد و پین‌شده جایگزین شود.

#### SEC-09: Active Pentest و Secret-history scan انجام نشده

به علت Preflight مسدود ابزار امنیتی، Nuclei/Nmap/FFUF و TruffleHog/Gitleaks اجرا نشدند. این مورد «یافته آسیب‌پذیری» نیست، یک شکاف در Coverage است و باید در Staging مجاز اجرا شود.

### نقاط قوت امنیتی

- Service Role در Frontend استفاده نمی‌شود و Build فقط `sb_publishable_` را می‌پذیرد.
- RLS روی تمام جدول‌های اصلی فعال است.
- Author به ردیف و Storage folder خودش محدود است و نمی‌تواند Publish کند.
- Profile فقط Grant ستونی `UPDATE(display_name)` دارد؛ Policy به‌تنهایی امکان ارتقای Role نمی‌دهد.
- Article publish به Trigger و نقش Editor/Admin وابسته است.
- Article Source و Published Snapshot از هم جدا شده‌اند.
- Storage خصوصی است و Signed URL کوتاه‌عمر تولید می‌شود.
- APIهای عمومی فقط GET/HEAD را می‌پذیرند و Request ID دارند.
- CSP اجرای Inline script و Plugin/Object را می‌بندد.

## ۵. یافته‌های معماری و فنی

### P0/P1

- **ARCH-01 — P0:** Sync Catalog تراکنشی نیست. Level، Course و Resource در چند درخواست Upsert می‌شوند؛ شکست میانی می‌تواند بخشی از تغییر را ثبت کند.
- **ARCH-02 — P0:** Course/Resource فاقد `revision` یا ETag هستند. دو Editor می‌توانند بدون Conflict Detection تغییر هم را بازنویسی کنند.
- **ARCH-03 — P0:** مدل Copyright ناقص است. فیلدهای `license_status`, `rights_holder`, `license_source`, `proof_storage_path`, `allowed_territories`, `expires_at` و `reviewed_by` وجود ندارند. انتشار قانونی از روی داده قابل اثبات نیست.
- **ARCH-04 — P1:** Assetهای کتاب فقط با `course_id` وصل می‌شوند. Track، Disc/Unit، Sequence، Transcript pair، زبان Transcript و Variant تعریف نشده است.
- **ARCH-05 — P1:** `related_resource_ids` مقاله آرایه رشته‌ای Polymorphic است و FK ندارد؛ حذف/تغییر شناسه می‌تواند رابطه مرده بسازد.
- **ARCH-06 — P1:** Source CSS حاصل چند نسل طراحی است: `:root` شش بار، `.admin-editor` هفت بار و چندین Selector کلیدی ۴ تا ۶ بار تعریف شده‌اند. ترتیب فایل به‌جای Token contract رفتار را تعیین می‌کند.
- **ARCH-07 — P1:** بسیاری از HTML/JSهای Source تک‌خطی یا Minified هستند؛ Review، Merge و Debug دشوار شده است. Minification باید Build artifact باشد، نه Source.
- **ARCH-08 — P1:** Header، Navigation و Footer میان ۱۸ HTML، `site-ui.js` و SSR APIها تکرار شده و Drift واقعی رخ داده است.
- **ARCH-09 — P1:** `page-admin.js` یک ماژول بزرگ با UI، Validation، State، Upload، Sync، Import و Role management است. مرزهای مسئولیت وجود ندارند.

### P2

- **ARCH-10:** Public pageها هم SDK حدود ۲۱۸KB، fallback content حدود ۲۱KB و Backend client را بار می‌کنند؛ سپس Catalog را دوباره از Supabase می‌گیرند.
- **ARCH-11:** Assetهای اصلی به‌جز Vendor fingerprint ندارند و با `max-age=0` سرو می‌شوند؛ Cache مؤثر CSS/JS از دست می‌رود.
- **ARCH-12:** SSR فهرست مقاله حداکثر ۱۰۰ رکورد می‌گیرد و فیلتر را در حافظه انجام می‌دهد؛ Pagination ندارد.
- **ARCH-13:** هر Article Detail برای حداکثر ۸ رابطه، درخواست جدا به Supabase می‌فرستد؛ N+1 request ایجاد می‌شود.
- **ARCH-14:** `document.execCommand` در Article Studio Deprecated است و رفتار آن در مرورگرهای موبایل یکنواخت نیست.
- **ARCH-15:** Import JSON محدودیت اندازه، Versioned schema و گزارش Diff دقیق ندارد؛ فایل بسیار بزرگ می‌تواند UI ادمین را قفل کند.
- **ARCH-16:** Health endpoint فقط دسترسی به View مقاله را می‌سنجد و وضعیت Storage/Auth/Catalog را پوشش نمی‌دهد.
- **ARCH-17:** Build script `.env.local` را خودکار Load نمی‌کند و `.env.example` وجود ندارد؛ Fresh clone به‌سادگی قابل Build نیست.
- **ARCH-18:** Log ساختاریافته فقط برای خطاهای API وجود دارد؛ Metric، Alert و Audit عملیاتی برای Publish/Sync/Upload وجود ندارد.
- **ARCH-19:** `safeLevel()` ورودی نامعتبر را بی‌صدا A2 می‌کند؛ URL اشتباه به‌جای 404/پیام خطا محتوای A2 نشان می‌دهد.

## ۶. Design System و UI/UX بر اساس ui-ux-pro-max

### وضعیت فعلی

پروژه Mobile-first است، Tap targetهای اصلی نزدیک ۴۴px هستند، Focus visible، Safe Area، Reduced Motion، Reduced Transparency، Dark Mode و RTL/LTR تا حد خوبی لحاظ شده‌اند. مهاجرت به React/Tailwind یا shadcn برای این پروژه توجیه ندارد و خلاف حفظ معماری HTML/CSS/JS است.

### شکاف‌های Design System

- Tokenها Flat و چندبار Override شده‌اند؛ ساختار Primitive → Semantic → Component وجود ندارد.
- بیش از صد Color literal/rgba در CSS دیده می‌شود و Stateها Contract واحد ندارند.
- Button/Input/Card/Badge/Dialog/Table حالت‌های Default/Hover/Focus/Active/Disabled/Loading/Error مستند و یکپارچه ندارند.
- Dark Mode از `prefers-color-scheme` برای اولین بازدید استفاده نمی‌کند و همیشه Light شروع می‌شود.
- Admin ترکیبی از فارسی و English (`Title`, `Collection`, `Upload`, `Status`) است و Cognitive load ایجاد می‌کند.
- Loadingها عمدتاً متن ساده‌اند؛ Skeleton/Progress و `aria-busy` منسجم نیست.
- Footer و Header در SSR Articles با صفحات Static یکسان نیستند.
- Screen-reader announcement برای عملیات طولانی Sync/Upload کامل و یکپارچه نیست.

### معماری پیشنهادی بدون Rewrite

```text
assets/design-tokens.css
  primitives: palette, spacing, type, radius, shadow, motion
  semantic: bg/surface/text/border/action/success/warning/danger
  components: nav/card/button/input/dialog/admin/editor/footer

assets/styles/
  base.css
  components.css
  public-pages.css
  author-studio.css
  admin-studio.css
  utilities.css
```

Build فعلی می‌تواند این فایل‌ها را Bundle کند. HTML/CSS/JavaScript حفظ می‌شود و فقط Source قابل نگهداری می‌گردد.

## ۷. ممیزی صفحه‌به‌صفحه

| صفحه/بخش | وضعیت | مشکلات و کار لازم |
|---|---|---|
| Home | نسبی | Navigation خوب؛ باید «قدم بعدی» واضح‌تر، Loading/Error state و اولویت Guidance ارزیابی کاربر شود |
| Levels | نسبی | شمارنده‌ها کلی‌اند؛ ورودی Level نامعتبر باید خطا بدهد؛ مسیر هر Level باید Outcome و زمان تقریبی داشته باشد |
| Level Detail | نسبی | Book/Practice نمایش داده می‌شود؛ Empty state سطح‌های کم‌محتوا و تفکیک Essential/Recommended باید روشن‌تر شود |
| Roadmap | نسبی | Progress فقط LocalStorage و دستگاه‌محور است؛ Export/Reset و توضیح Privacy لازم است؛ نباید به LMS تبدیل شود |
| Books | خوب/نسبی | Horizontal shelf وجود دارد؛ دسته‌ها و Featured باید با داده واقعی و Empty state بررسی شوند |
| Book Detail | نسبی | Package وجود دارد؛ Audio/Video/Transcript pairing، ترتیب Track و وضعیت License ناقص است |
| Resources | نسبی | Filter و Search وجود دارد؛ URL state، Clear filters، Result announcement و Pagination آینده لازم است |
| Resource Detail | خوب/نسبی | Signed URL و Context وجود دارد؛ Expiry/Retry واضح نیست و Download/Open semantics یکسان نیست |
| Media | ناقص | یک Flat grid و کنترل تکراری Tab+Select دارد؛ فقط یک Podcast موجود است؛ Rail افقی Film/Series/Podcast و CTA یک‌کلیکی ساخته نشده |
| Special | نیازمند تصمیم IA | با Featured کتابخانه هم‌پوشانی دارد؛ یا به Curated Picks تبدیل شود یا در Library ادغام گردد |
| Articles Index | خوب/نسبی | SSR است؛ Limit 100، Filter در حافظه، Footer متفاوت و نبود Pagination مشکل آینده است |
| Article Detail | نسبی | SEO/Snapshot خوب؛ N+1 روابط، Sanitizer سفارشی، Remote image privacy و Footer متفاوت باقی است |
| Login | نسبی | جریان روشن است؛ CAPTCHA/Rate-limit/MFA policy و خطاهای Auth باید تست شوند |
| Signup | نسبی | Learner پیش‌فرض درست است؛ CAPTCHA و Password protection ناقص است |
| Reset Password | نسبی | پیام ضد-enumeration مناسب است؛ Redirect allowlist و Recovery session باید زنده تست شود |
| Author Request | نسبی | مالکیت و Admin approval درست است؛ Cooldown، History UX و Abuse protection ناقص است |
| Author Studio | نزدیک به کامل | Save/Preview/SEO/Review و Keyboard handling وجود دارد؛ `execCommand`، Asset upload/promotion، Mobile real-device و Conflict UX نیازمند کار است |
| Article Preview | نسبی | Role gate باید با Author دیگر Negative Test شود؛ Skip link ندارد و خطا/Loading باید بازبینی شود |
| Super Admin | ناقص | Catalog قابل مدیریت است؛ Review Queue، Authors، Settings، License review، Audit و Link health پنل مستقل ندارند؛ Sync تراکنشی نیست |
| 404 | قابل قبول | Skip link ندارد؛ Navigation/Footer و پیشنهاد مسیر برگشت باید با Shell مشترک یکسان شود |

## ۸. Footer و Media مورد درخواست

### Footer هدف

- یک Shell مشترک برای Static و SSR.
- شش لینک ضروری در Grid دو ستون × سه ردیف.
- حذف لینک‌های تکراری و کم‌اهمیت.
- Instagram و Telegram با SVG accessible و label متنی.
- URL شبکه‌ها باید توسط مالک محصول ارائه شود؛ لینک ساختگی ممنوع است.
- Copyright/Privacy کوتاه و نسخه محصول در سطر پایانی.

پیشنهاد شش لینک: سطوح، نقشه راه، کتابخانه، رسانه، مقالات، همکاری نویسندگی. «تمرین مهارت‌ها» از داخل Level قابل دسترسی باشد و «ویژه» در Library ادغام شود.

### Media Showcase هدف

- Hero کوتاه + Search.
- Railهای مستقل Podcast، Film و Series با `scroll-snap`.
- هر Rail: عنوان، توضیح کوتاه، «مشاهده همه» و Empty state.
- Card: Cover، نوع، Level، مدت، Provider، وضعیت رایگان/پولی و CTA واحد.
- CTA خارجی مستقیم به منبع معتبر؛ فایل خصوصی مستقیم به `resource.html` برای Signed URL و کنترل دسترسی.
- دسته/نوع در URL Query ذخیره شود تا Back/Share درست کار کند.
- داده نمایشی یا Download link ساختگی ممنوع است.

## ۹. Super Admin Studio هدف

Navigation پیشنهادی، بدون Dashboard نمایشی:

1. **انتشار:** صف مقاله‌ها و منابع آماده Review، درخواست اصلاح، انتشار و Audit.
2. **کتاب‌ها:** Book Package، Assetها، ترتیب، Transcript pairing و License status.
3. **رسانه:** Podcast/Film/Series، Cover، CTA و Link health.
4. **نویسندگان:** درخواست‌ها، نقش، وضعیت، تاریخچه تصمیم و Audit.
5. **تنظیمات ضروری:** Footer/social URLs، SITE metadata و Feature toggles محدود.

Overview فقط باید موارد نیازمند اقدام را نشان دهد: Pending review، لینک Broken، License منقضی، Sync failed. نمودار و داده نمایشی اضافه نشود.

## ۱۰. نقشه‌راه اجرایی

### فاز ۰ — Release Blockers و Baseline

خروجی:

- ثبت این سند به‌عنوان Backlog مرجع.
- ساخت `.env.example` و مسیر قابل تکرار Build محلی بدون ثبت Secret.
- اجرای Role Matrix روی Staging با پنج حساب.
- تصمیم معماری و Migration امن برای دو View.
- فعال‌سازی Leaked Password Protection و CAPTCHA.
- اجرای Gitleaks/TruffleHog، Nuclei و تست TLS روی Staging مجاز.

Gate خروج: صفر Security Advisor Error یا Risk acceptance مستند؛ تمام تست‌های Deny پاس؛ Build و Browser QA سبز.

### فاز ۱ — Data Integrity و معماری Catalog

خروجی:

- RPC تراکنشی برای تغییر Catalog یا API server-side محدود.
- ستون `revision` و Optimistic concurrency برای Course/Resource/Level.
- Conflict UI به‌جای Last-write-wins.
- مدل License/Copyright و جلوگیری از Publish بدون تأیید مجوز برای فایل‌های Copyrighted.
- مدل `book_assets` یا افزودن `asset_group`, `track_no`, `pair_id`, `language`, `variant`.
- تبدیل Related article IDs به Join table دارای FK.

Gate خروج: خطای وسط Sync هیچ Partial write نسازد؛ دو Editor نتوانند بی‌هشدار تغییر هم را overwrite کنند.

### فاز ۲ — Design System و Shell مشترک

خروجی:

- Token سه‌لایه و Split CSS.
- Component state matrix و Accessibility contract.
- Generator/Partial مشترک برای Header/Nav/Footer در Static و SSR.
- Footer دو ستون × سه ردیف و Social icons پس از دریافت URL واقعی.
- حذف Overrideهای نسخه‌ای و فرمت‌کردن Sourceها.
- Fingerprint و Cache مناسب Assetها.

Gate خروج: Visual regression در 320/390/768/1024/1440، Light/Dark، RTL/LTR و Reduced Motion پاس شود.

### فاز ۳ — Public Discovery UX

خروجی:

- تکمیل Home، Levels، Level و Book Detail با Guidance-first hierarchy.
- Media rails افقی و دسته‌بندی مستقل.
- URL-based filters، Clear state و Result announcements.
- Grouping دقیق Assetهای Book Package.
- یکپارچه‌سازی Special با Curated Picks.
- اصلاح Level نامعتبر و Error/Empty/Offline states.

Gate خروج: کاربر موبایل در حداکثر سه تعامل به منبع مناسب Level/Skill برسد؛ تست کاربردپذیری با حداقل پنج کاربر هدف.

### فاز ۴ — Author Studio

خروجی:

- جایگزینی تدریجی `execCommand` با Editor مدل‌دار سبک یا API Selection استاندارد.
- Upload تصویر Draft و Promotion کنترل‌شده هنگام Publish.
- Autosave/Conflict recovery و Draft status شفاف.
- Preview دقیق موبایل/دسکتاپ و Checklist انتشار.
- Real-device keyboard، TalkBack/VoiceOver و offline recovery.

Gate خروج: Author بتواند فقط با گوشی مقاله بسازد، Preview کند، ذخیره کند و برای Review بفرستد؛ متن در قطع اتصال از دست نرود.

### فاز ۵ — Super Admin Studio

خروجی:

- IA پنج‌بخشی پیشنهادی.
- صف Review یکپارچه، Authors، License، Link health و Settings ضروری.
- Import دارای Size limit، Schema version، Dry run و Diff.
- Audit قابل جست‌وجو برای Role/Publish/License.
- عملیات Bulk محدود، قابل Undo/Archive و همراه Confirmation.

Gate خروج: Admin بتواند Book Package، Media، Author request و Publish را روی موبایل بدون ورود UUID دستی مدیریت کند.

### فاز ۶ — Production Verification و Release

خروجی:

- E2E کامل Browser → API → RLS/Storage → Response.
- Accessibility audit WCAG 2.2 AA.
- Performance budget و Lighthouse روی صفحات عمومی.
- مانیتور Health/Auth/Storage و Alert خطا.
- Backup/Restore drill و Rollback release.
- Release note، Migration runbook و وضعیت واقعی Deployment.

Gate خروج: صفر P0/P1 باز، صفر خطای Console، Role Matrix سبز، Security Advisor بدون Error، Restore و Rollback آزمایش‌شده.

## ۱۱. ترتیب Issueها برای اجرا

1. `SEC-01` View architecture + Role Matrix.
2. `ARCH-01/02` تراکنش و Concurrency Catalog.
3. `ARCH-03` مدل License/Copyright.
4. Leaked password، CAPTCHA، RPC negative tests و pentest coverage.
5. Token/CSS refactor و Shell مشترک.
6. Footer و Media Showcase.
7. Book Asset pairing و Related FK.
8. Author Studio editor/assets.
9. Super Admin IA و Review queues.
10. Accessibility، Performance، Observability و Release drill.

## ۱۲. Definition of Done مشترک

هر Issue فقط زمانی Done است که:

- کد و Migration کوچک و قابل Rollback باشد.
- Unit/Static test و در صورت UI، Browser test داشته باشد.
- برای مجوز، یک Positive و حداقل یک Negative test نقش داشته باشد.
- Light/Dark، RTL/LTR، 320px و Keyboard بررسی شود.
- Loading/Empty/Error/Offline state تعریف شود.
- متن و لینک ساختگی وارد Production نشود.
- فایل Copyrighted بدون License record قابل Publish نباشد.
- فایل‌های تغییرکرده، تست‌ها، مشکلات باقی‌مانده و وضعیت Deployment در گزارش مرحله ثبت شوند.

