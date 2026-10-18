# Changelog

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
