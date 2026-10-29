# چک‌لیست انتشار German Library v7.1

## وضعیت فعلی

کد frontend، مدل محتوا، Admin mobile-first، validation، build production، baseline security headers و QA خودکار آماده‌اند. این نسخه برای اتصال به backend واقعی و staging آماده است.

## قبل از Production — الزامی

- [x] یک Supabase project اختصاصی برای German Library انتخاب/ایجاد شود.
- [ ] `backend/supabase-schema.sql` روی همان پروژه اعمال شود.
- [ ] در صورت نیاز `backend/seed.sql` اجرا شود.
- [ ] Admin user ساخته و role آن از trusted SQL/tool به `admin` تغییر کند.
- [ ] open sign-up برای Auth در صورت عدم نیاز غیرفعال شود.
- [ ] Security Advisor و Performance Advisor بدون issue بحرانی بررسی شوند.
- [x] Migration `20261029_v34_public_article_snapshots.sql` روی پروژه آزمایشی اصلی اجرا و Validation متناظر آن کاملاً پاس شد.
- [x] Viewهای `published_articles` و `article_redirects` در Advisor دیگر `security_definer_view` گزارش نمی‌شوند.
- [x] RPCهای مدیریت نقش `SECURITY INVOKER` هستند و مجوز آن‌ها با RLS و Grant ستون‌محور کنترل می‌شود.
- [ ] ماتریس Guest/Learner/Author مالک/Author غیرمالک/Editor/Admin برای Source، Snapshot، Redirect و Storage مثبت/منفی تست شود.
- [ ] `backend/post-deploy-check.sql` بدون inconsistency اجرا شود.
- [ ] Publishable key و Project URL در Hosting تنظیم شوند؛ Secret/Service Role هرگز در frontend قرار نگیرد.
- [ ] Preview deployment ساخته شود.
- [ ] smoke test واقعی روی iPhone Safari + Android Chrome + Desktop انجام شود.
- [x] تست Chromium خودکار روی viewportهای 320 تا 1440، Admin، Author Studio و SSR پاس شد.
- [ ] Upload، private signed file، Draft/Published/Archived، logout/session expiry و network failure تست شوند.
- [ ] سپس همان build تست‌شده به Production promote شود.

## بعد از انتشار

- لینک‌های خارجی دوره‌ای بررسی شوند؛ سایت‌های ناشر ممکن است URL را تغییر دهند.
- قبل از تغییر schema، backup گرفته شود و Advisors دوباره اجرا شوند.
- Admin فقط برای افراد لازم ایجاد شود.
- قابلیت جدید فقط وقتی اضافه شود که رسیدن کاربر به منبع مناسب را سریع‌تر/واضح‌تر کند.

## Scope محافظت‌شده

German Library یک Resource Library + Roadmap است، نه LMS. Progress/Streak/Gamification/Quiz Engine/AI Tutor در v1 ضروری نیستند.
