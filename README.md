# imdbgraph

## Tech

- **TanStack Start** — full-stack meta-framework for React (competitor to
  Next.js)
- **React, TailwindCSS, shadcn** — UI
- **Vite+ (`vp`)** — unified toolchain bundling vitest, oxlint, oxfmt, and
  TypeScript; use `vp` instead of `npm`/`vite`
- **Drizzle, Postgres** — database
- **Varlock** — environment variable management, loaded via
  `varlock run -- <command>`
- **mise** — runtime and tool version manager (`mise.toml`)

## Local Development

Prerequisites:

- [mise](https://mise.jdx.dev/getting-started.html)
- [Docker](https://www.docker.com/)

```sh
# https://mise.jdx.dev/getting-started.html
curl https://mise.run | sh

# activate mise (pick bash or zsh):
#
# bash
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
source ~/.bashrc
#
# zsh
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc

git clone <repo-url>
cd imdbgraph
mise run bootstrap

# dev server
vp dev
```

## Environment Variables

Managed by [varlock](https://varlock.dev); `.env.schema` defines what is
required per environment. Local development points at the Docker service via
`.env.development.local`, regenerated per jj workspace by `mise-tasks/setup`.
The same file sets `BASE_URL` to the workspace's Pitchfork proxy for local E2E
tests.

## Services

- **GitHub** — source control
- **Railway** — hosting and Postgres
- **Cloudflare** — DNS/CDN
- **PostHog** — product analytics
