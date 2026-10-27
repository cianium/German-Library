<div align="center">

# Lexipfad

<sub>Formerly “German Library”. The repository, package name and CI badge still use the old technical name.</sub>

**Lexipfad — a mobile-first German learning path and resource library for CEFR A1–C2.**

[![Source QA and Build](https://github.com/cianium/German-Library/actions/workflows/ci.yml/badge.svg)](https://github.com/cianium/German-Library/actions/workflows/ci.yml)
![Status](https://img.shields.io/badge/Status-Development%20Preview-E5A50A)
![Version](https://img.shields.io/badge/Source-3.2.1--p0--preview-147D8B)

**Books & learning resources · Articles · Content management · Multi-device experience**

</div>

> **Release status:** This repository is currently a **source/preview build**, not a verified production release. The P0 article-access SQL patch exists in source, but its application to any real Supabase database and live role-based access verification are **not confirmed**. Do not use a passing CI run as evidence that deployed database permissions are secure.

## What this project does

German Library helps German learners find curated learning materials by **CEFR level (A1–C2)**, book category, and learning objective. The codebase includes a browser-first catalog, content-management interfaces, an article authoring workflow, and Vercel server-rendered article endpoints.

| Area | Included in source | Important boundary |
| :--- | :--- | :--- |
| Learning catalog | Levels, books, book-linked media, supplemental resources | The starter catalog is example content; access rights to third-party resources must be respected |
| Public interface | Mobile-first pages, navigation, responsive layouts | Check physical browsers before declaring release-ready |
| Administration | Content editing, status and sync-related workflows | Live Supabase Auth, Storage and permission checks still required |
| Article platform | SSR directory/article routes, SEO metadata, author/editor flows and preview | Live RLS migration and permission matrix must be verified on Staging |
| Quality checks | Static/source QA, mocked backend/SSR tests, build and dist inspection | Mocked tests do **not** validate a live database or deployed security |

## Technology

- **Frontend:** HTML, CSS and JavaScript (mobile-first).
- **Server-rendered articles:** Vercel Functions and server-side navigation.
- **Backend services (when configured):** Supabase Auth, PostgreSQL/RLS and private Storage.
- **Build and QA:** Node.js (20+) and Python 3.
- **Deployment configuration:** `vercel.json`, with a separate static GitHub Pages deployment history.

## Run locally (source preview)

Requirements: Node.js 20+ and Python 3.

```bash
git clone https://github.com/cianium/German-Library.git
cd German-Library
python3 -m http.server 8080
```

Open **http://localhost:8080** to view the static pages. This local static server does **not** execute Vercel article routes (`/articles`, `/articles/:slug`, `/sitemap.xml`), nor does it provision Supabase. Local demo behavior is **not** a production authentication or access-control test.

## Quality checks

```bash
npm run qa
```

This runs the repository's static checks, content validation and **mocked** backend/article security regression checks.

To assemble and inspect a **non-deployable CI test artifact** without using real Supabase credentials:

```bash
SUPABASE_URL=https://ci-placeholder.supabase.co \
SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_placeholder_not_a_real_key \
SITE_URL=https://example.invalid \
npm run build

npm run verify:dist
```

These intentionally fake public values satisfy build-time configuration checks only. **Do not deploy that artifact.** A production deployment requires its own reviewed environment, approved public configuration, staged database migration, and live verification.

Additional browser tests (require appropriate local tooling/Playwright + Chromium):

```bash
npm run qa:ssr:browser
npm run qa:studio:browser
```

The GitHub Actions workflow runs **source QA + placeholder build + dist verification**. It does **not** run real Supabase migrations, live permission tests, or these separate browser suites.

## Security & staging release gate

Before enabling a real deployment, follow the documented migration order and verify RLS **in an authorized Development/Staging Supabase project**, including the P0 patch `backend/migrations/20261015_p0_article_source_read_access.sql`. Validate permissions for guest, learner, owning author, non-owning author, and editor/admin against both raw article rows and published snapshots.

Do not apply a patch blindly to Production. Back up data, check migration history, and complete positive/negative access tests in Staging first. The patch being committed to GitHub is **not** proof it is deployed.

- [P0 security and SSR navigation report (FA)](docs/P0_SECURITY_AND_NAV_REPORT_FA.md)
- [Supabase setup and staged verification](docs/SUPABASE_SETUP.md)
- [QA and historical technical audits](docs/TECHNICAL_AUDIT.md)
- [Release checklist (FA)](docs/RELEASE_CHECKLIST_FA.md)

## Architecture and repository guide

| Path | Responsibility |
| :--- | :--- |
| `assets/` | Shared UI, browser code, client-facing pages and styles |
| `data/` | Public fallback catalog content |
| `api/` | Vercel article and sitemap functions |
| `server/` | Shared server-side presentation helpers |
| `backend/migrations/` | Versioned database migrations **requiring explicit deployment** |
| `backend/validation/` | SQL validation scripts for staging checks |
| `tools/` | Source QA, mocked tests and optional browser checks |
| `docs/` | Product scope, security and delivery reports |

## Roadmap

- [ ] Verify live P0 permissions and draft/published-article boundaries in Staging.
- [ ] Complete responsive and accessibility testing in real mobile browsers.
- [ ] Validate Auth, Storage, and the article publish/review flow end-to-end.
- [ ] Improve the secure article media workflow.
- [ ] Publish a tested release with aligned versioning, migration instructions and rollback steps.

## Versioning and historical releases

The current `package.json` source version is **`3.2.1-p0-preview`**. GitHub also contains an older release **titled `v7.1.1` with tag `v1.1.1`**. Those identifiers refer to different versioning contexts; the old tag must not be silently moved or rewritten.

Read the [Changelog](CHANGELOG.md) and [GitHub Releases and publishing policy](docs/RELEASES.md). A CI-green badge does **not** mean the project is production-ready.

## Contributions and licensing

Suggestions and reproducible bug reports are welcome through GitHub Issues. Please verify the status and current architecture before proposing changes. This public repository's contents are **not automatically licensed for reuse**; no open-source license is assumed until one is expressly added by the maintainer. For third-party learning materials, link to official publisher resources or use assets you are authorized to share.

**Maintained by [Kian Khayat](https://github.com/cianium).**

## Repository maintenance status

See [repository health — 2026-10-25](docs/REPOSITORY_HEALTH_2026-10-25.md) for the current staging, permissions and release evidence checklist.
