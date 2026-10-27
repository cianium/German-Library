# Changelog

## Unreleased — S1/S2 fixes + Roadmap
- **S2:** breadcrumb on `resource.html` now escapes the book title (stored HTML injection); duplicate course crumb removed (B2). Regression test `tools/escape-qa.mjs`.
- **S1:** new migration `20261027_s1_author_resource_ownership.sql` (+ `backend/validation/s1_author_ownership_check.sql`, `tools/s1-author-qa.mjs`): Authors limited to their own draft resources and `authors/<uid>/` Storage paths; publishing is Editor/Admin only. Client uploads use the author prefix; the Published option is hidden for Authors. **Not applied to any database — run on Staging with real Author/Editor logins first.**
- **Bug hunt:**
  - SSR articles double-escaped entities (`&amp;` rendered literally, `?a=1&amp;b=2` links broke); `api/article.js` now decodes once before escaping (`tools/article-sanitize-qa.mjs`).
  - After a failed Cloud hydrate an admin edit could push the stale fallback catalogue over the database (every row looked "changed"); sync is now refused until a successful reload.
  - `localStorage` quota/private-mode errors no longer break saving in demo mode.
  - `/articles` added to the sitemap.
- **Admin (S1 follow-up):** resources now carry `createdBy` (mapped from `created_by`, never written back). Authors only see their own resources, and can't open published ones for editing; this avoids silent demotion to Draft and a stuck failed sync.
- **Admin:** EPUB uploads were rejected by `validateUpload` despite the book form accepting them — fixed; the mobile admin nav is now `inert` while an editor dialog is open.
- **UI:** roadmap page now highlights the «سطح» nav item instead of «خانه».
- **New:** `roadmap.html` — interactive per-level path (A1–C2) built from the existing catalog, with next-step highlight and device-local progress (`gl_roadmap_v1`); linked from home, build and sitemap.

## Unreleased — Lexipfad brand
- Renamed the product to **Lexipfad** in every page, SSR template, manifest and title; replaced the “GL” mark with the supplied logo (light/dark wordmark, cream tile for the symbol).
- Added favicon set, Apple touch icon, PWA icons (incl. maskable) and a 1200×630 OG image under `assets/brand/`; manifest now installable (PNG icons).
- Re-themed accent tokens to the logo palette (orange/amber, contrast-checked); removed the old SVG favicon.
- Added `brand/originals/`, `tools/build-brand-assets.py`, `docs/BRAND_GUIDE.md`. No behaviour, schema or security changes.

## v3.2.1-p0-preview — Article source privacy and SSR navigation
- Added additive Supabase P0 RLS patch limiting raw article reads to owners and reviewers; public reviewed snapshots stay accessible. **Not applied to live DB.**
- Aligned SSR article list/detail navigation to four V7.5 primary destinations through a shared server helper.
- Fixed empty canonical/cover/OG URL fallback in article renderer.
- Added explicit SQL validation, navigation/security regression QA and Chromium SSR mobile smoke QA.
- No changes to underlying learning catalog, roles, media upload workflow or Article Studio content model.


## v3.2.0-preview — V7.5 navigation & mobile authoring polish
- Restored exactly four learner navigation destinations; Articles is discoverable from Extras.
- Added mobile table builder, internal content link picker, link edit/unlink, image alt/caption edit, H4 and underline.
- Fixed article metadata loss when reopening drafts and the SEO image-alt false positive.
- Added offline mocked browser checks at 320/390/768/1024 px; no Supabase production migration.


## v3.1.0 — VNext Article Studio & SEO Platform
- Replaced public four-destination navigation with five requested destinations and article active states.
- Added crawlable Vercel-rendered article directory, article pages, canonical/OG/Twitter metadata, JSON-LD, sitemap, 404 and slug redirects.
- Added learner self-signup and a secure author application queue with Admin approval/rejection, alongside the Author/Editor workflow, own-article Studio, autosave, revision recovery, private preview and live SEO checklist.
- Added additive RLS migration for article snapshots, revision history, private draft asset policies, resource permissions and Admin-only audited Author assignment.
- Added QA for raw HTML security and article routes.
- Not live-tested or deployed: the Supabase migration, Vercel Functions and Production data/security were not changed.

## v3.0.0 — German Library v3
Based on the V7.4 books/media/featured source.
- Rebuilt public bottom navigation around Levels, Supplemental, Home, Books.
- Added Levels index page and categorized horizontal book shelves with featured books at top.
- Extended admin book editor and local data normalization with category, skills, cover, download and uploaded book file metadata.
- Added metadata migration for existing Supabase courses; reused existing RLS and signed storage infrastructure.
- Added a version-specific QA script and release checklist.
- Retained original resources, course assets and all original catalog entries.
