# BundleHive — Planning & Research

> A stable, focused framework for building **standalone, embeddable React components** — write a React component, get a self-contained bundle that mounts cleanly onto any website.

> Status: planning. Date: 2026-06-11. Author: duyngph@gmail.com.

---

## 1. Scope

**What it is:** a build tool + a thin runtime that turns a plain React component into an isolated, embeddable artifact (a `<script>`-tag CDN bundle and/or an npm package). It owns the boring, fragile plumbing — custom-element registration, Shadow-DOM mounting, CSS isolation, the bundle config — so the author just writes React.

**Explicitly out of scope (decided):**
- ❌ **No SSR / islands / hydration.** Client-render only. This removes the single hardest, riskiest surface (React 19 cannot hydrate Declarative Shadow DOM — upstream "not planned").
- ❌ **Not a Next.js-style meta-framework.** No routing, no server, no file-based pages, no Next coupling. BundleHive is a *bundler + runtime*, not an app framework.
- ❌ **No multi-widget orchestration engine in the core.** (The `EmbedGraph`/edges/event-bus idea from usereq is interesting but is a later optional add-on, not the basic framework.)

**Reference, not requirement:** `usereq-widget` is where this pattern was hand-rolled and is useful as a reference for the runtime mechanics — but BundleHive is not designed to migrate usereq, and carries none of its domain code (chat, sessions, API).

The bar is **stable and basic**: a small, well-defined API that does the embeddable-React-component job correctly and predictably.

---

## 2. The problem it solves

Today, shipping an embeddable React component means hand-rolling, per project:
1. A **bespoke Vite/Rollup lib-mode config** (IIFE for `<script>`, ESM for npm, JSX, externalization).
2. A **custom element + Shadow root + React root + state bridge** by hand.
3. **CSS isolation into the shadow root** — and Tailwind v4 is *broken inside shadow roots by default* (it registers theme vars via `@property`, which shadow roots don't support, so vars resolve to nothing).
4. **Config plumbing** — usually baked at build time, forcing a rebuild per environment/tenant.

This is exactly what `usereq-widget` did, and it's copy-paste-fragile. BundleHive provides all four, once, correctly.

---

## 3. Landscape (why this should exist)

There is **no focused framework for building embeddable React widgets** — only adjacent tools and starter templates:

- **Web-component compilers** — Stencil, Lit, Mitosis: not React; you'd rewrite components.
- **Building blocks** — `@r2wc/react-to-web-component` (wrap React as a custom element; styling-into-shadow is a known open gap), `react-shadow-scope` (adopted stylesheets + Tailwind). Useful primitives, but not a build pipeline + DX.
- **Plain bundlers** — Vite lib-mode / tsup / Rollup IIFE: what everyone hand-rolls today. **The pain we remove.**
- **Starter templates** — `makerkit/react-embeddable-widget`, `code4mk/react-vite-widget-sdk-template`, etc. Boilerplates, not frameworks. They validate the demand.

**How real embeds ship (the pattern to adopt):** inline loader snippet → async CDN bundle → `attachShadow` mount, with config passed at **runtime** (Intercom, Drift, Crisp, Cal.com all do this).

**One real constraint to respect — bundle size.** react + react-dom ≈ 120kB before your code; Sentry and others chose Preact for embeds on size alone. BundleHive keeps React (it's the point) but must offer: (a) **externalize React to a shared/peer dependency** so a host React app or a shared CDN runtime doesn't double-ship it, and (b) optionally a **`preact/compat` alias** for size-critical standalone bundles.

---

## 4. Architecture

Deliberately small. Four parts.

### 4.1 Authoring — write a React component

```
my-widget/
  bundlehive.config.ts     # targets, externalization, theme/css entry
  src/
    index.tsx              # default export: the React component
    styles.css             # Tailwind or plain CSS (scoped automatically)
```

```tsx
// src/index.tsx
import { defineWidget } from "@usereq/bundlehive";

function PricingTable() {
  const { config } = useWidget<{ plan: string }>();   // runtime config, typed
  return <div>…</div>;
}

export default defineWidget(PricingTable, {
  tag: "acme-pricing",          // custom element name
  // config schema (optional, e.g. zod) → validated runtime props
});
```

No custom-element class, no shadow boilerplate, no `useSyncExternalStore` bridge — `defineWidget` generates all of it.

### 4.2 Runtime (`@usereq/bundlehive-runtime` + `@usereq/bundlehive`)

The thin layer that gets bundled in:
- Registers the custom element, attaches a Shadow root, mounts the React tree inside it (so React's listeners stay within the boundary).
- **CSS isolation done right:** delivers styles via a shared constructable `CSSStyleSheet` in `shadowRoot.adoptedStyleSheets`, with the **Tailwind-v4 fix built in** (extract `@property` rules → declare at document scope, rewrite `:root`→`:host`). This is the headline feature — it's a real, painful, documented problem no template solves.
- **Runtime config:** reads `data-*` attributes / observed attributes / a `bundlehive('init', …)` queued call → typed, validated config passed to the component. One bundle serves all environments/tenants; no rebuild per env.
- **Shadow-aware primitives:** `<Portal>` (retargets events — React's `createPortal` into a shadow root drops synthetic events, facebook/react#12973), `useClickOutside`, focus utilities — all target the shadow root, not `document`.

### 4.3 Build (`bundlehive build`)

One command, opinionated config over Vite/Rollup (don't reinvent bundling). Outputs from one source:
- **CDN bundle:** self-executing IIFE/UMD that registers the element on load. React **bundled** (standalone) or **externalized** (shared runtime) per config.
- **npm package:** ESM with `react`/`react-dom` as peer deps, importable directly in a host React app.
- **Types + source maps.**
- Optional code-splitting if a project ships several widgets (lazy `import()` per widget).

### 4.4 Delivery / loader

Command-queue loader snippet (because `document.currentScript` is `null` under `async`/`defer`):

```html
<script>
  (function(w,d){ w.bundlehive=w.bundlehive||function(){(w.bundlehive.q=w.bundlehive.q||[]).push(arguments)} })(window,document);
  bundlehive('init', { widget:'acme-pricing', plan:'pro', theme:{ accent:'#5b5bd6' } });
</script>
<script async src="https://cdn.jsdelivr.net/npm/@acme/widgets/embed.js"></script>
```

Or the plain custom-element form for simple cases:
```html
<acme-pricing plan="pro"></acme-pricing>
<script async src="…/embed.js"></script>
```

### 4.5 Dev server (`bundlehive dev`)

HMR + a host-page playground (renders the widget on a blank page with a config panel) so authoring isn't "build then eyeball `dist/`."

---

## 5. Public API surface (keep it small & frozen early)

Since "stable" is the goal, the API should be minimal and committed-to:
- `defineWidget(Component, options)` — the one authoring entry point.
- `useWidget<Config>()` — access runtime config + host (shadow root, theme).
- `<Portal>`, `useClickOutside`, focus helpers — shadow-aware primitives.
- `bundlehive.config.ts` schema — targets, externalization, css entry, theme.
- CLI: `bundlehive dev | build | create`.

That's the whole surface. Everything else is internal.

---

## 6. Packages

```
@usereq/bundlehive-cli        # dev | build | create
@usereq/bundlehive      # defineWidget, useWidget, <Portal>, hooks  (authoring)
@usereq/bundlehive-runtime    # custom-element + shadow mount + css isolation (bundled into output)
@usereq/bundlehive-build      # opinionated Vite/Rollup config + the Tailwind-shadow transform
create-bundlehive      # scaffolder
```

---

## 7. Roadmap

**Phase 0 — Load-bearing spike (prove the hard part) — ✅ DONE**
Generate a working Shadow-DOM custom element from a plain React component, with adopted-stylesheet theming **including the Tailwind-v4-in-shadow-DOM fix**. If this is clean and stable, the framework is viable. Everything else is conventional.

> Built in `packages/react` + `examples/counter`. `defineWidget` + `useWidget` + `<Portal>` work; the Tailwind-v4 transform (`:root`→`:host`, `@property` hoisting, shared constructable stylesheet) is implemented in `css-isolation.ts` and unit-verified; Vite build emits IIFE + ESM with Tailwind inlined. Both packages typecheck clean. (Browser visual confirmation still pending — run `bun --filter '@usereq/bundlehive-example-counter' dev` or open `examples/counter/demo.html`.)

**Phase 1 — MVP — ✅ mostly done**
- ✅ `defineWidget` + `useWidget` + runtime config from attributes.
- ✅ `bundlehive build` → CDN IIFE (React bundled) + ESM, via `@usereq/bundlehive-build` preset + `@usereq/bundlehive-cli`.
- ✅ Command-queue loader: `createLoader(name, widget)` installs a global, drains the inline-stub queue, routes `init`/`update`/`destroy` + imperative commands (`useWidgetCommands`). Supports rich object config via `setConfig`. Queue-draining logic unit-verified.
- ✅ Three examples end-to-end: `counter` (placed) + `floating-badge` (auto-injected) + `loader-chat` (command queue). All build via the CLI.
- ✅ `.d.ts` type emit — all three packages build with `tsup` (`dist/*.js` + `.d.ts`), ship `dist` only, versioned `0.1.0`. See `docs/PUBLISHING.md`.

**Phase 2 — DX & sharing — 🟡 in progress**
- ✅ `bundlehive dev` (Vite dev server / playground; HMR via Vite default).
- ⬜ `create-bundlehive` scaffolder.
- 🟡 Externalize-React via preset `external` option; ⬜ `preact/compat` mode for size.
- ✅ `<Portal>`; ✅ `autoMount` + DOM-ready guard (floating launcher); ⬜ focus / click-outside primitives.

**Phase 3 — Polish for OSS**
- Docs site, config reference, examples gallery.
- Code-splitting for multi-widget projects.
- (Optional, later) lightweight multi-widget registry — NOT the heavy engine.

---

## 8. Risks & open questions

- **Tailwind-v4-in-shadow-DOM** is the make-or-break technical detail — must be rock-solid and tested across themes. Spike it first (Phase 0).
- **Bundle size** — React is heavy; externalization + `preact/compat` mitigate, but document the tradeoff honestly.
- **`createPortal` event drop** in shadow roots — the `<Portal>` primitive must handle retargeting; verify with dialogs/tooltips/popovers.
- **Host CSS bleed** — Shadow DOM scopes *your* styles in, but the host can still style the host element and stacking context (`z-index` wars). Document the boundaries.
- **API stability** — freeze `defineWidget`/`useWidget` early; it's the contract every consumer depends on.

---

## 9. Immediate next steps

1. Repo shape — Bun workspaces monorepo (already on Bun).
2. **Phase 0 spike:** plain React component → shadow-DOM custom element → adopted-stylesheet theming with the Tailwind-v4 fix. This is the one thing worth de-risking before committing to the API.
3. Draft and freeze the `defineWidget` / `useWidget` contract.
4. First example widget on a test host page.
