# imdbgraph Follow-Up Plan

## Goal

Modernize this older TanStack Start app using the current template at
`/home/aria-amini/dotfiles/apps/tanstack`.

## Decisions

- Implement candidates 1 through 6.
- Do not add a repository abstraction yet.
- Do not add versioned dataset publication yet.
- Keep Drizzle inside the existing focused query modules.
- Use Varlock for environment contracts.
- Keep Playwright URL-only without a managed web server.

## Completed

- Derived `Show` and `Episode` types from Drizzle.
- Added Zod validation for ratings input and suggestions responses.
- Extracted chart data transformation from `Graph`.
- Extracted scraper parsing and filtering helpers.
- Preserved scraper ordering: ratings IDs, episode show IDs, then titles.
- Preserved scraper transaction and rollback behavior.
- Added scraper stream cleanup on failure.
- Recreated show indexes after scraper table replacement.
- Preserved show column defaults after table replacement.
- Added `.env.schema` and server-only Varlock access.
- Removed `@aamini/config`, `@aamini/lib`, and direct `dotenv` usage.
- Inlined Vite+, Tailwind, React compiler, Nitro, lint, format, and test setup.
- Added the Vite+ browser Playwright provider.
- Moved visual page coverage into headless Vitest browser tests.
- Kept Playwright E2E tests headless and URL-only for smoke coverage.
- Added focused unit tests for chart data and scraper filters.
- Isolated database seed fixtures per test file.
- Added scraper filter coverage for headers, missing values, and malformed rows.

## Review Status

The first adversarial review found four issues. All four received fixes:

- Missing show indexes after ingestion.
- Leaked source and reader streams on ingestion failure.
- Invalid optional PostHog environment handling.
- Lost show column defaults after table replacement.

A final adversarial review was requested but aborted when the user changed the
task to create this plan. Run it before treating the work as fully reviewed.

## Validation

Passing:

- `vp test run --project unit` — 3 tests passed.
- `vp build` — passed before the final SQL-only fix.
- `vp check --no-fmt` — zero errors and four existing accessibility warnings
  when the local environment supplies `DATABASE_URL`.
- `jj diff` and `jj status` inspected.

Blocked:

- Browser tests need the Playwright Chromium executable.
- Database tests need Docker space and the `postgres:17` image.
- Plain checks fail when the local required database environment is absent.

## Next Steps

1. Run `vp build` after the final scraper SQL changes.
2. Install Chromium, then run `vp test run --project browser`.
3. Free Docker storage or provide `postgres:17`, then run the server tests.
4. Review the large `pnpm-lock.yaml` update before committing.
5. Add a direct publication rollback test if the database suite becomes available.
6. Consider the scraper pipeline split further only after the focused tests grow.
7. Revisit repository adapters only when a second database implementation exists.
8. Revisit versioned dataset publication only after a real locking or rollback need.

## Useful Commands

```bash
vp check
vp test run --project unit
vp test run --project browser
vp test run --project server
vp build
varlock load --agent
jj diff
jj status
```

Do not commit until the final review and blocked test suites receive a clear
result.
