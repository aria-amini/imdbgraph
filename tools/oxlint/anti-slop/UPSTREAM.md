# Upstream

- Source: https://github.com/dmmulroy/anti-slop
- Commit: c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b (main, 2026-09)
- Installed: entire `src/` tree copied to `tools/oxlint/anti-slop/`, including
  `vendor/eslint-stylistic/` with its LICENSE and provenance.
- Dependency: `@oxlint/plugins` pinned exactly to 1.83.0 to match the Oxlint
  version resolved by vite-plus 0.3.3 (upstream repo pins 1.78.0 for its own
  development). `oxlint` itself is not a direct dependency here; vite-plus
  provides the engine.
- Deviations: none to rule source. Effect plugin is vendored but not
  registered; this repository does not depend on Effect. Assertion rules
  overlap with the pre-existing `typescript/consistent-type-assertions:
  never` policy; both are kept.
- Local adaptations: `shared/dictionary-types.ts` rewritten to satisfy this
  repository's `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`
  compiler options (semantics unchanged). Vendored `*.test.ts` files are
  excluded from `tsconfig.json` because they import `oxlint/plugins-dev`,
  which requires a direct `oxlint` dependency that vite-plus replaces.
