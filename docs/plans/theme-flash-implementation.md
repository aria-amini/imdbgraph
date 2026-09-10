# Theme flash implementation brief

## Goal

Implement TanStack Start's supported pre-hydration theme pattern and make an
explicit light/dark choice available during SSR, so repeat visits receive the
correct theme on the opening `<html>` element. Keep first-visit system-theme
detection in a `ScriptOnce` fallback. Separately make the root stylesheet
eligible for TanStack Start's production CSS inlining.

The underlying research and source links are in
[`docs/research/tanstack-theme-flash.md`](../research/tanstack-theme-flash.md).

## Important distinction

There are two visually similar issues:

1. **Wrong-theme content flicker:** rendered content appears in one theme and
   then switches. `ScriptOnce` is TanStack's intended solution.
2. **Blank pre-paint canvas:** the browser shows its canvas while waiting for
   the document or render-blocking CSS. Server-rendering a cookie-backed theme
   onto `<html>` addresses repeat visits after the opening tag arrives;
   production CSS inlining can shorten the remaining wait. A site cannot style
   the browser before any response bytes arrive.

Do not claim success based only on the absence of a light-themed content frame.
Validate the initial canvas and the first content paint separately.

## Current worktree state to reconcile

The worktree already contains unrelated search, polling, and test changes.
Preserve them.

There is also an incomplete theme attempt:

- `src/lib/theme.ts` exports `themeInitScript` and `themeCriticalCss`.
- `src/routes/__root.tsx` renders an ordinary `<script>` and `<style>` before
  `<HeadContent />` in JSX.
- `e2e/theme.test.ts` expects those elements to precede stylesheet links.

That ordering assertion is invalid for TanStack Router with React 19. Router
adds `precedence` to managed stylesheets and React hoists them. Replace this
attempt; do not build more logic around the current response order.

## Required behavior

- Allowed stored values are exactly `light` and `dark`. Treat every other cookie
  or local-storage value as absent.
- The toggle writes the selected value to both local storage and a
  non-sensitive, JavaScript-readable cookie.
- On repeat requests with a valid cookie, SSR emits the corresponding class and
  `color-scheme` on the opening `<html>` element.
- On a request without a valid cookie, a `ScriptOnce` bootstrap resolves a valid
  local-storage value first, otherwise the OS preference, before app content is
  painted.
- `<html>` uses `suppressHydrationWarning` because the bootstrap intentionally
  may change its attributes before hydration.
- The theme bootstrap sets both the theme class and `style.colorScheme`.
- The implementation works for the root error and not-found documents as well as
  the successful route.
- Per-cookie HTML must not be stored in a shared public cache without an
  appropriate cache key. Preserve existing cache behavior unless the app already
  adds shared HTML caching; if it does, make the response private or vary it
  safely by the theme cookie.

## Recommended design

### 1. Centralize the theme contract

Update `src/lib/theme.ts` to own:

- a `Theme` type of `'light' | 'dark'`;
- the local-storage key and cookie name;
- a small validator/parser returning `Theme | null`;
- a browser helper that applies the class and `colorScheme`;
- a browser helper that persists both local storage and the cookie; and
- a function that generates the `ScriptOnce` bootstrap string from an optional
  server-known theme.

Cookie guidance:

- `Path=/`
- `SameSite=Lax`
- a long but finite `Max-Age`, such as one year
- add `Secure` when `location.protocol === 'https:'`
- do not use `HttpOnly`, because the client-side toggle must update it

Keep the generated script compact and dependency-free. Serialize interpolated
values with `JSON.stringify`; never concatenate unchecked cookie content into
JavaScript.

Resolution order inside the bootstrap should be:

1. valid local-storage value;
2. valid server-provided cookie value;
3. `matchMedia('(prefers-color-scheme: dark)')`.

Apply the resolved theme with mutually exclusive classes: remove both `light`
and `dark`, add the resolved class, then set
`document.documentElement.style.colorScheme`.

### 2. Read the cookie through a server boundary

Add a focused server function, preferably in a theme-specific `.functions.ts`
module, that reads the cookie with `getCookie` from
`@tanstack/react-start/server`, validates it with the shared parser, and returns
`Theme | null`.

Make the value available before the document shell renders. A suitable TanStack
pattern is a root `beforeLoad` that calls the server function and returns the
validated theme in route context. Verify against the installed TanStack types
that `DocumentShell` can read that context via the root route API. If the shell
cannot access root `beforeLoad` context in successful, error, and not-found
rendering, move the read to request middleware/router request context rather
than putting it in the existing scrape-data loader.

Do **not** add theme-cookie work to the existing root loader's scrape query.
Theme selection must still work if that database-backed loader fails.

### 3. Render the initial document state

In `src/routes/__root.tsx`:

- import and use `ScriptOnce` from `@tanstack/react-router`;
- add `suppressHydrationWarning` to `<html>`;
- render `className="dark"` only for a server-known dark preference (rendering
  an explicit `light` class for light is also acceptable if kept consistent);
- set the opening element's inline `colorScheme` to the server-known value;
- when no cookie is known, use `colorScheme: 'light dark'` so the browser canvas
  may follow the OS while the fallback resolves;
- render `ScriptOnce` before the routed children, using the generated bootstrap;
  and
- remove the ordinary `dangerouslySetInnerHTML` theme `<script>` and the
  ineffective `themeCriticalCss` ordering workaround.

The exact location of `ScriptOnce` should follow TanStack's documented pattern:
inside the document, before the application children. Its guarantee is SSR-only
execution before hydration, not execution before stylesheet links.

### 4. Update the toggle

Refactor `src/components/theme-toggle.tsx` to use the shared apply/persist
helpers. Preserve its current visual behavior and accessibility contract:

- `role="switch"`
- `aria-label="Dark mode"`
- `aria-checked` synchronized with the applied theme

Do not introduce a separate theme-state library for this two-value toggle.

### 5. Make CSS eligible for production inlining

In `src/routes/__root.tsx`, replace:

```ts
import appCss from '../styles.css?url'
```

and the corresponding `head().links` stylesheet entry with:

```ts
import '../styles.css'
```

Then enable the experimental production option in `vite.config.ts`:

```ts
tanstackStart({
	router: { routeFileIgnorePattern: '(\\.test\\.tsx$|__screenshots__)' },
	server: {
		build: {
			inlineCss: true,
		},
	},
})
```

This option is production-only. Do not make a development HTML-order test expect
inlined CSS. Confirm the production output rather than assuming the option
applied.

If the generated root stylesheet is large enough that inlining materially
inflates every HTML response, keep the side-effect import but omit `inlineCss`
and record that tradeoff. Cookie-backed SSR is the correctness fix; CSS inlining
is a loading optimization.

## Tests

### Unit/browser tests

Expand `src/components/theme-toggle.test.tsx` and/or add focused theme helper
tests covering:

- invalid stored values are ignored;
- toggling dark writes `dark` to local storage and the cookie;
- toggling light writes `light` to both stores;
- applying either theme updates the class and `colorScheme`; and
- test cleanup removes both the local-storage value and theme cookie.

Avoid exact full-cookie-string assertions because browsers may normalize cookie
attributes. Assert the cookie's name/value and observable behavior.

### E2E tests

Replace the current element-order test in `e2e/theme.test.ts` with behavioral
coverage:

1. Set a `dark` theme cookie in the browser context before navigation, while
   emulating a light OS preference.
2. Request/navigate to `/`.
3. Assert the SSR response contains a dark class and dark `color-scheme` on the
   opening `<html>` element.
4. Assert the hydrated document remains dark.
5. Repeat for a light cookie while emulating a dark OS preference.
6. With no cookie or local-storage value, assert the OS preference is used by
   the bootstrap.
7. Navigate to a not-found URL and, if practical, exercise the root error path
   to ensure the themed shell is retained.

For response assertions, use a fresh request context carrying the explicit
cookie and inspect the returned HTML. For browser assertions, set context
cookies before `page.goto`; setting a cookie after navigation does not test SSR.

Do not assert that `ScriptOnce` literally appears after hydration: it removes
its own script element by design.

### Production verification

After a production build, inspect the served SSR HTML and confirm:

- the matched root CSS is represented by an inline `<style>` rather than the old
  explicit `styles.css?url` link;
- a dark cookie produces dark attributes in the opening `<html>` tag;
- a light cookie produces light attributes; and
- no public shared-cache header can mix the two variants.

Development will still use TanStack's normal development stylesheet handling. Do
not treat that difference as a failed production-inline-CSS implementation.

## Validation commands

Run, in order:

```sh
vp check
vp test run
vp run e2e
vp build
```

Then serve or inspect the production output and perform the production checks
above. Also manually test `https://imdbgraph.lvh.ariaamini.com` with opposite OS
and stored preferences in both directions.

## Acceptance criteria

- A repeat visit begins with the selected theme serialized on `<html>`.
- First visits resolve local storage/system preference before themed content is
  painted.
- No hydration warning is emitted for the intentional `<html>` mutation.
- The toggle persists and applies both themes consistently.
- Success, not-found, and root-error documents retain the theme.
- Existing search and scrape-run polling behavior remains unchanged.
- The obsolete stylesheet/script ordering assertion is removed.
- All validation commands pass.
- Production CSS is demonstrably inlined, or the agent records why that optional
  optimization was intentionally omitted.

## Out of scope

- Adding a third user-selectable `system` mode.
- Introducing a third-party theme package.
- Redesigning the theme toggle.
- Treating a development-only blank interval as proof of a production
  regression.
- Attempting to control the browser canvas before the server response begins.
