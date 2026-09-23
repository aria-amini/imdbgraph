# imdbgraph

This is a full-stack TanStack Start application using React 19, Vite+, Drizzle,
Postgres, Tailwind v4, shadcn, and Varlock. Local services are provided by
Docker Compose (Postgres). The dev server runs as a pitchfork daemon (see
`pitchfork.toml`) that auto-starts/stops when entering or leaving the directory;
each jj workspace gets unique ports via `mise-tasks/setup` (run by
`mise run bootstrap`; re-run anytime with `mise run setup`).

Product analytics run through PostHog behind a `/api/ingest` proxy.

## Local URLs

Pitchfork maps registered slugs to `https://<slug>.lvh.ariaamini.com`.
`mise run setup` writes `BASE_URL`, but only the default workspace registers its
slug. A generated worktree URL is not proof that the proxy routes to that
worktree. An unrecognized subdomain can serve the default app with HTTP 200.

Before sharing a worktree URL:

1. Run `pitchfork proxy status`. Confirm that the slug maps to this worktree's
   absolute directory and `dev` daemon. If it does not, register a unique
   single-label slug with
   `pitchfork proxy add <slug> --dir <absolute-worktree-path> --daemon dev`.
2. Start `pitchfork start dev`. If the route needs data, start this worktree's
   services, apply migrations, and load data before testing the route.
3. Request the exact feature URL you will share. Confirm that the response
   contains feature-specific content, not only HTTP 200 or the home page. Use a
   browser when the feature renders only on the client or the user asks for
   visual verification.
4. Share the verified URL of that feature, not an inferred URL.

## Commands

- `vp dev` — start development (usually managed by pitchfork instead)
- `pitchfork list` / `pitchfork logs dev` / `pitchfork tui` — inspect the dev
  daemon
- `vp check` — format, lint, and type-check
- `vp test run` — run Vitest projects
- `vp run test:ui` — Vitest UI for the browser project. Binds `TAILSCALE_IP`
  when set; otherwise auto-detects the tailnet IP, else loopback. Set your own
  `TAILSCALE_IP` to override. The UI trusts the tailnet: clients can write
  snapshots and baselines but cannot execute commands (`allowWrite` on,
  `allowExec` off).
- `vp run e2e` — run Playwright smoke tests against the workspace proxy
- `vp run compose:up` — start local services
- `vp run db:push` — apply the current schema
- `vp run db:migrate` — run migrations
- `vp run dead-code` — find unused exports with fallow

Use `pnpm` through Vite+ (`vp i`, `vp run <script>`). Secrets and environment
values resolve through Varlock; do not commit generated or local secret files.

## Style rules

### Always build `className` with `cn()`

Compose conditional or combined classes with `cn()` from `cn`. Never interpolate
classes with template literals or string concatenation — an oxlint
`no-restricted-syntax` rule rejects template literals in `className`.

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
