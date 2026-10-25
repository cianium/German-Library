# German Library — repository health (2026-10-25)

## Verified source-side strengths

- Well-maintained README describing product, CEFR catalog, QA, architecture, security and release limitations.
- Build/QA scripts and `ci.yml` present; recent main CI and Pages publication workflows were reported passing.
- Content catalog, article authoring and server endpoints present in source.

## Release blockers requiring staging evidence

- Confirm P0 Supabase RLS/article-access SQL patch applied to the actual intended database.
- Test guest, learner, author, editor and admin access to API and Storage with real tokens.
- Verify backend privilege boundaries, published article visibility and unauthorized actions.
- Verify Vercel routing and runtime environment for SSR article pages.
- Review third-party books and media for access and redistribution rights.
- Validate mobile, keyboard and accessibility behavior on devices.

## Versioning clarity

A historical GitHub release tag `v1.1.1` exists. The source package identifies `3.2.1-p0-preview`. These are different artifacts/identifiers; do not infer that the older tagged release corresponds to the current preview. Publish explicit `source commit → staging deploy → release tag` traceability before a new release.

## Ready-to-release conditions

Live role matrix passes, source-side CI is green, deployment smoke tests are recorded, licenses are checked and rollback procedures are documented.
