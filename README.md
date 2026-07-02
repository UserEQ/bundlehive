# BundleHive

A focused framework for building **standalone, embeddable React components**. Write a
React component; get a self-contained bundle that mounts onto any website as a
Shadow-DOM custom element with fully isolated CSS (including Tailwind v4).

No SSR, no routing, no meta-framework. Just: component in → embeddable widget out.

> Status: **working spike**. The runtime (`@bundlehive/react`), the build preset
> (`@bundlehive/build`), and the `bundlehive` CLI all work; two examples build and
> run through the CLI with no hand-written Vite config. Browser visual confirmation
> is still pending. See [docs/PLAN.md](docs/PLAN.md).

## Layout

```
packages/
  react/            @bundlehive/react — defineWidget, useWidget, <Portal>, CSS isolation, autoMount
  build/            @bundlehive/build — Vite preset (lib mode, Tailwind, shadow-friendly)
  cli/              @bundlehive/cli   — `bundlehive dev` / `bundlehive build`
examples/
  counter/          placed widget: Tailwind + runtime attrs + portal
  floating-badge/   auto-injected launcher: appears from the script alone, no placed element
  loader-chat/      command-queue loader: rich config + imperative open/close, queued pre-load
docs/PLAN.md        scope, research, roadmap
```

## Authoring a widget

```tsx
// widget.tsx
import { useWidget } from "@bundlehive/react";
function Counter() {
  const { config } = useWidget<{ start?: string }>();
  // ...plain React, Tailwind classes work
}

// embed.ts — importing this registers <bh-counter>
import { defineWidget } from "@bundlehive/react";
import styles from "./styles.css?inline";   // compiled Tailwind, adopted into the shadow root
export default defineWidget(Counter, {
  tag: "bh-counter",
  styles,
  observedAttributes: ["start"],
});
```

## Shipping it: publish → CDN → paste

The build emits an IIFE bundle (`dist/embed.js`). Point your package's CDN fields
at it and publish:

```jsonc
// package.json
{ "unpkg": "./dist/embed.js", "jsdelivr": "./dist/embed.js", "files": ["dist"] }
```

`npm publish` → the bundle is served at `https://unpkg.com/<your-package>`. Customers
paste one element + one script — the script can go in `<head>` with `async`:

```html
<bh-counter start="10" label="Stars" accent-color="#e11d48"></bh-counter>
<script src="https://unpkg.com/@acme/counter" async></script>
```

This is the same shape as a `usereq`-style embed. It works with the script in `<head>`
and `async` because registering a custom element is **order-independent**: whenever the
parser reaches `<bh-counter>` — before or after the script runs — the browser upgrades
the element in place and mounts it. (`examples/counter/demo.html` demonstrates exactly
this, script-in-head.)

## The CLI

No `vite.config.ts` needed — the `bundlehive` CLI applies the build preset:

```bash
bundlehive dev      # HMR playground
bundlehive build    # IIFE + ESM bundle → dist/   (--name, --entry, --external …)
```

## Two embed modes

**Placed element** — the customer drops a tag (see `examples/counter`):
```html
<bh-counter start="10" accent-color="#e11d48"></bh-counter>
<script src="https://unpkg.com/@acme/counter" async></script>
```

**Auto-injected launcher** — the script alone, no tag (see `examples/floating-badge`).
Set `autoMount: true` in `defineWidget`; the runtime waits for the DOM (so a
`<head async>` script works) and injects the widget itself:
```html
<script src="https://unpkg.com/@acme/launcher" async></script>
```

**Command-queue loader** — a JS API the host page can call *before* the async
bundle loads (the Intercom/Segment/GA pattern; see `examples/loader-chat`). Use it
for rich/nested config and imperative control (`open`, `close`, `setUser`, …). In
your embed: `createLoader("acme", widget)`. The customer pastes:
```html
<script>
  (function (w) { w.acme = w.acme || function () {
    (w.acme.q = w.acme.q || []).push(arguments); }; })(window);
  acme('init', { title: 'Support', user: { name: 'Duy' } });  // queued…
  acme('open');                                                // …then replayed
</script>
<script src="https://unpkg.com/@acme/widget" async></script>
```
Inside the component, `useWidgetCommands(cmd => …)` handles `open`/`close`/etc.

## Try it

```bash
bun install

# dev playground (hostile host CSS included, to show isolation)
bun --filter '@bundlehive/example-counter' dev

# production embed bundles (IIFE + ESM)
bun --filter '@bundlehive/example-counter' build       # → examples/counter/dist/
bun --filter '@bundlehive/example-floating-badge' build # → examples/floating-badge/dist/
# then open the matching demo.html to see the <script> embed
```

## What's proven so far

- `defineWidget` generates a Shadow-DOM custom element and mounts a React root inside it.
- Tailwind v4 works **inside the shadow root**: theme `:root` vars rewritten to `:host`,
  `@property` rules hoisted to document scope, one constructable stylesheet shared per widget.
- Runtime config from element attributes (re-renders on change, no remount).
- `<Portal>` for overlays that escape layout but stay inside the shadow root.
- Build emits IIFE (for `<script>` CDN embed) + ESM (for npm import).
