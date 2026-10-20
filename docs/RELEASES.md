# GitHub releases and publishing policy — German Library

**Current source version:** `3.2.1-p0-preview` (as recorded in `package.json` on 2026-10-20).

**Status:** Preview/source only. No documented execution of the current P0 security migration against an authorized live database, no independently verified Production rollout, and no live role-based security acceptance.

## Historical GitHub Release

As of 2026-10-20, the repository has one GitHub Release:

| Git tag | Displayed Release title | Published (UTC) | Current interpretation |
| :--- | :--- | :--- | :--- |
| `v1.1.1` | `v7.1.1` | 2026-10-17 00:32 | Historical release; inconsistent tag/title, not the current preview |

**Do not retag or delete the historical release.** The current GitHub integration does not expose metadata editing for Release objects. A maintainer should inspect the original commit and notes, then optionally rename the *display title* (not the tag) to:

`German Library — Historical v7.1.1 snapshot (tag v1.1.1)`

Suggested introductory disclaimer:

> This is a historical source snapshot. Its Git tag is `v1.1.1` while the original displayed title was `v7.1.1`. Current repository source is `3.2.1-p0-preview`; no live Supabase migration or Production readiness is implied. See the current README and security report before deploying.

Preserve the original body below the clarification and retain historical tags, dates and assets.

## Release gate for future versions

1. Record a **single version source of truth** in `package.json`; align release title, new tag and `CHANGELOG.md` when publishing a genuinely new release.
2. Confirm security migrations in **Development/Staging**, never from GitHub CI against Production. Keep appropriate backups and migration history.
3. Run live role-permission tests for unpublished and published snapshots. Verify Auth, private Storage and author/editor workflows.
4. Run `npm run qa`, `npm run build`, `npm run verify:dist`, and optional browser suites against an appropriately configured Preview environment.
5. Document limitations, real test evidence, rollback steps and relevant deployment environment without exposing secrets or personal account data.
6. Mark incomplete builds **pre-release**. Do not call a build Production-ready based only on mocked QA or GitHub Pages status.

## CI limitations

`.github/workflows/ci.yml` uses intentionally fake Supabase *publishable* configuration and a non-resolvable example domain. It only tests that sources and build output satisfy static/mock checks. The job must not execute SQL, send writes to a live Supabase instance, or upload the build artifact for deployment.

**Different hosts, different features:** GitHub Pages can host static pages, but **Vercel** is used by this repository's configuration for `/articles`, `/articles/:slug`, and `/sitemap.xml`. A successful GitHub Pages deployment is not verification of those serverless functions.
