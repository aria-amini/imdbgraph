# TanStack Start theme initialization and first-paint flash

Research date: 2026-09-10

Scope: TanStack Router/Start's documented theme pattern, the behavior of the
versions installed in this repository, React 19 resource ordering, Start CSS
inlining, and server-known preferences. Sources are first-party documentation,
source code, and standards.

## Executive summary

TanStack does not provide a theme state system. Its official minimum pattern is
to run a small theme-detection script with `ScriptOnce` before React hydration
and put `suppressHydrationWarning` on `<html>` when that script changes the
element's class. This addresses **wrong-theme content flicker**: the server's
markup should not visibly paint with the wrong theme and then switch during
hydration.

That is different from the issue measured in this app: a **blank browser canvas
before first paint**. `ScriptOnce` only promises SSR-only, self-removing script
output; it does not place itself before stylesheets. In the installed Router,
`HeadContent` emits route links and manifest CSS before inline styles and head
scripts. It also gives stylesheet links a React `precedence`, which lets React
19 hoist them ahead of ordinary inline script/style siblings. Consequently,
changing the existing inline script to `ScriptOnce`, or moving the script into
`head().scripts`, does not by itself make the theme bootstrap precede the app
stylesheet.

For this repository, the framework-aligned complete solution is:

1. Emit `<meta name="color-scheme" content="dark light">` through `head().meta`
   as the earliest system-preference/no-preference canvas hint. The order
   matches this site's dark fallback while still honoring an OS light
   preference.
2. Mirror an explicit theme choice to a cookie and use that request-time value
   to render the correct theme class and `color-scheme` on the opening `<html>`
   tag during SSR. This makes repeat visits deterministic from the first
   document bytes.
3. Keep `ScriptOnce` as the first-visit/system-preference fallback, and add
   `suppressHydrationWarning` to `<html>` because the fallback intentionally
   changes its class before hydration.
4. Migrate the global stylesheet from a `?url` import in `head().links` to a
   side-effect import if production CSS inlining is desired, then evaluate
   `server.build.inlineCss: true`. This removes the extra blocking stylesheet
   request in production, but not development, and is an optimization rather
   than the source of truth for theme choice.

## What TanStack officially recommends

The Router document-head guide explicitly recommends `ScriptOnce` for scripts
that must run before hydration, using theme detection as its example. The
example reads `localStorage`, resolves an automatic choice with
`prefers-color-scheme`, and mutates `document.documentElement`. It also says to
put `suppressHydrationWarning` on `<html>` when the script changes that element.
See
[Inline Scripts with ScriptOnce](https://tanstack.com/router/latest/docs/guide/document-head-management#inline-scripts-with-scriptonce)
and
[Preventing Hydration Warnings](https://tanstack.com/router/latest/docs/guide/document-head-management#preventing-hydration-warnings).

The implementation is deliberately small. In `@tanstack/react-router` 1.170.18,
`ScriptOnce`:

- returns `null` outside server rendering;
- emits an inline `<script>` during SSR;
- applies the router CSP nonce; and
- appends `document.currentScript.remove()` to its contents.

It has no head insertion or resource-ordering logic. See the
[version-matched `ScriptOnce` source](https://github.com/TanStack/router/blob/%40tanstack/react-router%401.170.18/packages/react-router/src/ScriptOnce.tsx#L7-L20).

React describes `suppressHydrationWarning` as a one-level-deep escape hatch. It
suppresses a warning; it is not a mechanism for synchronizing or patching the
theme. See React's
[`hydrateRoot` guidance](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors).

## Two different flashes

### Wrong-theme content flicker

This occurs when rendered page content becomes visible under one theme and then
changes after client code runs. A parser-executed inline bootstrap can prevent
that transition when it applies the class before the browser first paints the
content. This is the problem TanStack's `ScriptOnce` theme example is intended
to address.

### Blank browser canvas before first paint

This occurs before any themed content is painted, while the initial response and
render-blocking resources are still being processed. The browser canvas can use
its default/OS color during that interval. An eventual theme class can be
correct before content paint while the user still observes an earlier blank
white canvas.

The HTML Standard defines parser-created, matching stylesheets as
script-blocking and render-blocking resources. A later parser-inserted classic
script can therefore wait behind a preceding stylesheet. See
[Interactions of styling and scripting](https://html.spec.whatwg.org/multipage/semantics.html#interactions-of-styling-and-scripting)
and the
[`script` processing model](https://html.spec.whatwg.org/multipage/scripting.html#the-script-element).

These two outcomes should be tested separately. Absence of a light-themed
content frame does not prove absence of a pre-paint white canvas.

The platform provides an early canvas hint that does not require CSS or
JavaScript: `<meta name="color-scheme">`. The CSS Color Adjustment specification
says this meta value establishes the page color scheme and that the root
element's used color scheme must affect the canvas surface color. It also says
the first listed supported scheme wins when the user has no preference. See
[Opting Into a Preferred Color Scheme](https://drafts.csswg.org/css-color-adjust-1/#color-scheme-meta)
and
[Effects of the Used Color Scheme](https://drafts.csswg.org/css-color-adjust-1/#color-scheme-effect).
Because `HeadContent` emits metadata before stylesheet links, this is a useful
system-preference/no-preference fallback in this app. It still cannot represent
a `localStorage` override that disagrees with the OS; cookie-backed SSR is
needed for that case.

## `HeadContent` ordering in the installed Router

The route `head()` type accepts `links`, `scripts`, `meta`, and `styles`; its
`scripts` value becomes a match's head scripts. See the
[version-matched route type](https://github.com/TanStack/router/blob/%40tanstack/router-core%401.171.15/packages/router-core/src/route.ts#L1373-L1391).

In installed `@tanstack/react-router` 1.170.18, `HeadContent` constructs tags in
this fixed category order:

1. metadata/title;
2. preload links;
3. `head().links`;
4. manifest-managed CSS;
5. `head().styles`; and
6. `head().scripts`.

See the
[version-matched tag construction](https://github.com/TanStack/router/blob/%40tanstack/react-router%401.170.18/packages/react-router/src/headContentUtils.tsx#L179-L186).
Array order is preserved within each category, but route head object key order
does not change these categories. Therefore, a bootstrap in `head().scripts`
cannot precede a stylesheet in `head().links` or manifest CSS.

Router also supplies `precedence="default"` to every managed stylesheet link
that did not specify a precedence. See the
[version-matched `Asset` source](https://github.com/TanStack/router/blob/%40tanstack/react-router%401.170.18/packages/react-router/src/Asset.tsx#L55-L65).
React 19 says stylesheet links with `precedence` receive special resource
treatment: React places and orders them in the document head. See React's
[`<link>` reference](https://react.dev/reference/react-dom/components/link#special-rendering-behavior).

This behavior is visible in the current app. Although `DocumentShell` currently
lists the theme `<script>` and critical `<style>` before `<HeadContent />`, the
actual development SSR response orders both stylesheet links first, followed by
the theme script and critical style. That observation is consistent with the
installed Router source and React 19's documented stylesheet treatment.

The practical implications are:

- putting the bootstrap in `head().scripts` makes it definitively later than
  stylesheet links;
- putting an ordinary inline script before `<HeadContent />` in JSX does not
  defeat React's managed stylesheet hoisting; and
- `ScriptOnce` does not add a special ordering guarantee because its source is
  an ordinary SSR inline script.

## CSS inlining

TanStack Start distinguishes two CSS import patterns:

- `import appCss from './app.css?url'` plus `head().links` creates explicit
  route-head output;
- `import './app.css'` and CSS modules create manifest-managed route assets.

The official guide states that `?url` head links are **not** eligible for Start
CSS inlining. Side-effect imports and CSS modules are eligible. See
[Choose a CSS Pattern](https://tanstack.com/start/latest/docs/framework/react/guide/css-styling#choose-a-css-pattern)
and
[Use `?url` for Explicit Stylesheet Links](https://tanstack.com/start/latest/docs/framework/react/guide/css-styling#use-url-for-explicit-stylesheet-links).

`server.build.inlineCss: true` embeds manifest-managed matched-route CSS in the
SSR HTML instead of emitting its stylesheet links there. The feature is
experimental and production-only; development retains normal development CSS
handling. See
[Inline Route CSS in Production](https://tanstack.com/start/latest/docs/framework/react/guide/css-styling#inline-route-css-in-production).

For this app, whose root stylesheet is currently imported with `?url` and
returned from `head().links`, merely enabling `inlineCss` would not inline that
stylesheet. Converting it to a side-effect import is a prerequisite. Production
inlining can shorten the pre-first-paint interval by eliminating a network round
trip, but it does not tell the server which explicit user theme was stored in
`localStorage`, and it does not alter development behavior.

## Cookie-backed SSR preference

TanStack Start's hydration guide treats user preferences as a common source of
server/client mismatch. Its first strategy is to make both renders use the same
deterministic input, and it calls a cookie the preferred source of truth. It
shows request middleware reading a cookie with `getCookie`, adding the value to
request context, and hydrating the same initial value. See
[Hydration Errors: Strategy 1](https://tanstack.com/start/latest/docs/framework/react/guide/hydration-errors#strategy-1--make-server-and-client-match).

The guide separately shows a client writing an environment-derived cookie for
future requests, while using a deterministic server fallback on the first visit.
See
[Strategy 2](https://tanstack.com/start/latest/docs/framework/react/guide/hydration-errors#strategy-2--let-the-client-tell-you-its-environment).

Applied to theme, the important distinction is:

- `localStorage` is unavailable to SSR, so the server cannot serialize an
  explicit stored choice into the opening `<html>` tag;
- a cookie is sent with the document request, so SSR can serialize the matching
  class/color scheme immediately; and
- on a genuinely first visit, the server still cannot know the browser's media
  query result, so the `ScriptOnce`/system-preference fallback remains useful.

If the response varies by a theme cookie, deployment caches must also vary or be
private as appropriate so one user's themed document is not served to another
user. This is a general consequence of per-cookie SSR, not a special TanStack
theme facility.

## Concrete recommendation for this repository

First, add `<meta name="color-scheme" content="dark light">` through
`head().meta`. This matches the app's current dark fallback when there is no OS
preference, follows an explicit OS light/dark preference, and reaches the canvas
before the stylesheet category. It improves first visits and users whose saved
choice agrees with the OS, but it cannot know a contrary `localStorage` choice.

The smallest official-pattern cleanup is to replace the hand-written SSR
`<script>` element with `ScriptOnce` and put `suppressHydrationWarning` on
`<html>`. That is the correct framework primitive for pre-hydration theme
detection, but it should not be presented as a complete fix for the measured
blank canvas.

For a complete repeat-visit fix, persist the toggle's explicit choice to both
`localStorage` and a non-sensitive cookie, validate the cookie to the allowed
theme values on each request, and have the server render the matching class and
`color-scheme` on `<html>`. Keep `ScriptOnce` to resolve first visits and system
preference changes before hydration. This directly addresses the canvas because
the selected scheme is present in the opening element rather than waiting for a
later head/body script.

Separately, replace the root `?url` stylesheet pattern with a side-effect import
and assess production `inlineCss`. That is a useful loading optimization and
could substantially reduce the blank interval in production. It is not a dev
fix, and it should be evaluated against larger HTML responses and loss of
independent first-load CSS caching, which the
[TanStack guide lists as tradeoffs](https://tanstack.com/start/latest/docs/framework/react/guide/css-styling#tradeoffs).

No product code was changed as part of this research.
