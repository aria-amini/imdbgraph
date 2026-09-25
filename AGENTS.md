# imdbgraph

imdbgraph.org is a full-stack application that scrapes imdb data and visualizes
the ratings data for all episodes of a TV show. More details in @PRODUCT.md

## Tech

- TanStack Start
- React 19
- Vite+ (oxlint, oxfmt, typescript, pnpm)
- Drizzle, Postgres
- Tailwind v4, shadcn
- Varlock
- PostHog (Product analytics run through PostHog behind a `/api/ingest` proxy)
- mise (CLI helpers and package management)
- Pitchfork (Manages dev server daemons per worktree)

## Local Resources

- `mise run bootstrap` setup resources for a workspace including setting up the
  local database and s3/minio instance and a local dev server using Pitchfork.
  `mise run setup` registers one proxy slug per workspace: `imdbgraph` for the
  default workspace, `imdbgraph-<workspace>` otherwise (for example
  `https://imdbgraph-setup-polish.lvh.ariaamini.com`). It writes the slug URL to
  `BASE_URL` in `.env.development.local`.

## Commands

- `pitchfork list` / `pitchfork logs dev` / `pitchfork tui` — inspect the dev
  daemon
- `vp check` — format, lint, and type-check
- `vp run test` — run all Vitest projects
- `vp run test:{browser,server,unit}`
- `vp run e2e` — run Playwright E2E smoke tests against the local proxy
- `vp run compose:up` — start local services
- `vp run compose:reset` - wipe data
- `vp run db:push` — apply the current schema
- `vp run db:migrate` — run migrations
- `vp run dead-code` — find unused exports with fallow
