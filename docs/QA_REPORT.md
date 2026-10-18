> Historical V7.1 baseline below. Current VNext implementation, executed checks, and known gaps: [VNext Articles release report](VNEXT_ARTICLES_RELEASE_FA.md). The available browser test was attempted for this delivery but did not run because the Python Playwright package is unavailable; Supabase migration and live RLS tests also remain pending an isolated development project.

# German Library v7.1 — QA Report

## Automated release checks

Run:

```bash
npm run qa
```

The current release passes with **0 static errors and 0 content-model errors**. The checks cover:

- JavaScript syntax and local asset/page references;
- duplicate HTML IDs;
- `_blank` links requiring `noopener`;
- viewport/manifest/referrer metadata;
- pinned Supabase JS SDK version;
- CSS brace balance, `:focus-visible` and `prefers-reduced-motion` support;
- no secret/service-role key in browser config;
- CEFR/collection/book/resource consistency;
- unique IDs and valid Core Book references;
- Core Book must be Published;
- Published resources require a valid `http/https` URL or Storage path;
- Published resources cannot point to non-Published books;
- no published dead-end access targets in starter content;
- cloud-sync regression test: parent/child archive ordering, offline pending persistence, reconnect retry and preservation of untouched remote entities.

Current starter catalog validation:

- 6 CEFR levels
- 4 book packages
- 35 resources
- 35 Published resources
- 2 Special Books

## Production-build checks

`npm run build` creates a clean `dist/` and fails if `SUPABASE_URL` or a modern `SUPABASE_PUBLISHABLE_KEY` is missing. Backend SQL, docs, source QA tools and local backup files are excluded from the public bundle.

## Link review

Official provider/publisher URLs were rechecked during v7.1 hardening. Three stale Hueber URLs were replaced with current official product pages. Dynamic provider sites can still change after release, so link status remains an operational content-maintenance task.

## Mobile UX acceptance

### Learner

- fixed safe-area-aware bottom navigation exposes primary destinations;
- Level hierarchy is Roadmap → Core Book → Other Books → Skill Practice;
- assets remain grouped inside their Book Package;
- Special Books are separate from CEFR filtering;
- public Published cards have an actual access target.

### Admin

- list management uses mobile cards rather than desktop-only tables;
- editors open as bottom sheets;
- collection choice controls CEFR requirements;
- Special resources require a Special Book;
- invalid/empty Published resources are blocked;
- Core Book cannot be Draft/Archived;
- dirty forms warn before closing;
- pending cloud sync warns before page exit;
- cloud sync sends changed rows rather than blindly archiving/replacing a full remote snapshot.

## Remaining real-environment QA

The current execution environment could not run a trustworthy Chromium headless session (Chromium itself hung even on a trivial local/data page), so **browser E2E is not claimed as passed**.

Before the final production promotion, run a deployed smoke test on:

- Safari on a real iPhone;
- Chrome on a real Android device;
- at least one desktop browser.

Verify keyboard + bottom sheet behavior, safe areas, file picking/upload, slow/offline recovery, login/logout, session expiry, private signed files, long titles/descriptions and actual Supabase RLS behavior.
