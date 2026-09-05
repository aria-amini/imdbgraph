# imdbgraph

This is a full-stack TanStack Start application using React 19, Vite+, Drizzle,
Postgres, Tailwind v4, shadcn, and Varlock. Local services are provided by
Docker Compose (Postgres). The dev server runs as a pitchfork daemon (see
`pitchfork.toml`) that auto-starts/stops when entering or leaving the directory;
each jj workspace gets unique ports via `mise-tasks/setup` (run by
`mise run bootstrap`; re-run anytime with `mise run setup`).

Product analytics run through PostHog behind a `/api/ingest` proxy.

## Local URLs

Pitchfork maps each app to `https://<app>.lvh.ariaamini.com` and each additional
worktree to `https://<worktree>.<app>.lvh.ariaamini.com`. Labels derive from
root directory names. `mise run setup` registers the URLs and writes `BASE_URL`.

## Commands

- `vp dev` — start development (usually managed by pitchfork instead)
- `pitchfork list` / `pitchfork logs dev` / `pitchfork tui` — inspect the dev
  daemon
- `vp check` — format, lint, and type-check
- `vp test run` — run Vitest projects
- `vp run e2e` — run Playwright smoke tests against the workspace proxy
- `vp run compose:up` — start local services
- `vp run db:push` — apply the current schema
- `vp run db:migrate` — run migrations
- `vp run dead-code` — find unused exports with fallow

Use `pnpm` through Vite+ (`vp i`, `vp run <script>`). Secrets and environment
values resolve through Varlock; do not commit generated or local secret files.

## Style rules

### Always build `className` with `cn()`

Compose conditional or combined classes with `cn()` from `@/lib/utils` (exported
from `src/lib/utils.ts`). Never interpolate classes with template literals or
string concatenation — an oxlint `no-restricted-syntax` rule rejects template
literals in `className`.

Bad:

```tsx
const className = `flex border-2 ${active ? 'bg-kitchen-yolk' : 'bg-card'} ${
	disabled ? 'opacity-35' : ''
}`
return <Link className={`${className} focus-visible:outline-2`} />
```

Good:

```tsx
const className = cn(
	'flex border-2',
	active ? 'bg-kitchen-yolk' : 'bg-card',
	disabled && 'opacity-35',
)
return <Link className={cn(className, 'focus-visible:outline-2')} />
```
