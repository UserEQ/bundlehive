---
name: bundlehive-widget
description: >-
  Build a standalone, embeddable widget with BundleHive — a React component that
  ships as a self-contained <script> bundle and mounts onto any website inside an
  isolated Shadow DOM (Tailwind included). Use this whenever the user wants to
  create, scaffold, or build an embeddable widget, a third-party embed, a
  "drop-in <script>" component, a chat/support/booking/feedback launcher, a
  shadow-DOM web component, a CDN/unpkg widget, or anything a customer pastes onto
  their own site — even if they don't say "BundleHive" by name. Also use when
  working inside a BundleHive repo (files named embed.ts, defineWidget, or
  bundlehive.config), or when adding runtime config, a floating launcher, or a
  command-queue loader to an embeddable component.
---

# Building embeddable widgets with BundleHive

BundleHive turns a plain React component into an artifact a customer pastes onto
their site. It owns the fragile parts — Shadow-DOM mounting, CSS isolation
(including the Tailwind-v4-in-shadow-DOM fix), the Vite build, and runtime config
— so the author just writes React.

The output is the standard third-party embed: a custom element + an async CDN
script. Because it's a **custom element**, the script can sit in `<head>` with
`async` and still work — the browser upgrades the tag in place whenever it parses
it, regardless of script order.

## When to reach for this

Use it for any UI a customer embeds on *their* page: chat/support launchers,
booking widgets, feedback buttons, pricing tables, reviews, comment boxes,
newsletter forms. If the answer to "does this render inside someone else's
website?" is yes, this is the tool.

Not for: your own app's pages/routing (that's Next.js/Vite), or anything needing
SSR — BundleHive is client-render only by design.

## The build in five steps

Create a widget package (in a monorepo, put it under `examples/` or `widgets/`;
standalone, it's just an npm package). Fill in these files, then `bundlehive build`.

### 1. `package.json`

The CDN fields are what make `https://unpkg.com/<pkg>` resolve to the embed
bundle. `@bundlehive/*` come from npm once published; in the monorepo use
`workspace:*`.

```json
{
  "name": "@acme/support-widget",
  "type": "module",
  "unpkg": "./dist/embed.js",
  "jsdelivr": "./dist/embed.js",
  "browser": "./dist/embed.js",
  "main": "./dist/embed.js",
  "module": "./dist/embed.mjs",
  "files": ["dist"],
  "scripts": {
    "dev": "bundlehive dev",
    "build": "bundlehive build --name AcmeSupport",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bundlehive/react": "^0.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@bundlehive/cli": "^0.1.0",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "tailwindcss": "^4.2.3",
    "typescript": "^5.9.3"
  }
}
```

### 2. `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### 3. `src/styles.css` and `src/vite-env.d.ts`

```css
/* styles.css — Tailwind v4, content auto-detected */
@import "tailwindcss";
```

```ts
// vite-env.d.ts — lets us import compiled CSS as a string
declare module "*.css?inline" {
  const css: string;
  export default css;
}
```

### 4. `src/widget.tsx` — the component (plain React)

```tsx
import { useState } from "react";
import { useWidget } from "@bundlehive/react";

interface Config { title?: string; accentColor?: string }

export function SupportWidget() {
  const { config } = useWidget<Config>();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-5 right-5 ...">
      {/* Tailwind classes work — they're isolated to the shadow root */}
    </div>
  );
}
```

### 5. `src/embed.ts` — the entry (registers the element)

Importing this module registers the custom element. Pick an **embed mode** here
(see below). Simplest — a placed element with attribute config:

```ts
import { defineWidget } from "@bundlehive/react";
import styles from "./styles.css?inline";
import { SupportWidget } from "./widget";

export default defineWidget<{ title?: string; accentColor?: string }>(SupportWidget, {
  tag: "acme-support",                       // must contain a hyphen
  styles,                                    // adopted into the shadow root
  observedAttributes: ["title", "accent-color"],
  parseConfig: (a) => ({ title: a.title ?? undefined, accentColor: a["accent-color"] ?? undefined }),
});
```

Then `bundlehive build` → `dist/embed.js` (IIFE for `<script>`) + `dist/embed.mjs`
(ESM). The customer pastes:

```html
<acme-support title="Support" accent-color="#4f46e5"></acme-support>
<script src="https://unpkg.com/@acme/support-widget" async></script>
```

## Choosing an embed mode

BundleHive supports three, from simplest to most powerful. **Read
`references/embed-modes.md` for full, copy-pasteable examples of each.**

| Mode | Customer pastes | Use when |
| --- | --- | --- |
| **Placed element** | a tag + script | config is simple strings; the widget sits in a known spot |
| **Auto-inject** (`autoMount: true`) | just the script | a floating launcher that injects itself; no tag to place |
| **Command-queue loader** (`createLoader`) | stub + script + JS calls | rich/nested config, per-tenant keys, or imperative control (`open`, `close`) |

## API cheat-sheet

- `defineWidget(Component, options)` — the authoring entry. Options: `tag`,
  `styles`, `observedAttributes`, `parseConfig`, `strictMode`, `autoMount`.
- `useWidget<Config>()` → `{ config, element, shadowRoot }`. Re-renders on
  attribute/config change.
- `useWidgetCommands(cmd => …)` — handle imperative commands (`open`/`close`/…).
- `<Portal>` — overlays (dialogs/popovers) that escape layout but stay in the
  shadow root (plain `createPortal` drops events across shadow boundaries).
- `createLoader(name, definition, opts?)` — install the command-queue global.
- CLI: `bundlehive dev` (HMR playground) and `bundlehive build` (flags:
  `--name`, `--entry`, `--external`, `--outDir`, `--port`).

**Full signatures, types, and edge cases: `references/api.md`.**
**Publishing to npm/CDN: `references/publishing.md`.**

## Gotchas that will bite you

- **Tailwind v4 in shadow DOM is handled for you.** Just `@import "tailwindcss"`
  and import it `?inline` into `defineWidget`. Do *not* hand-roll `@property`
  hoisting or `:root`→`:host` rewrites — the runtime does it. Never inject a
  global Tailwind `<link>`; that would leak into the host page.
- **Vite 8 is rolldown/oxc-based.** Do **not** add `esbuild: {}` or
  `minify: 'esbuild'` to any config — it forces the deprecated esbuild path and
  fails the build. JSX comes from tsconfig (`"jsx": "react-jsx"`). The
  `bundlehive` CLI already avoids this.
- **Config is runtime, not build-time.** Pass it via attributes / the loader —
  one bundle serves every environment and tenant. Don't bake keys at build time.
- **The tag needs a hyphen** (custom-element rule): `acme-support`, not `support`.
- **Import CSS with `?inline`.** A bare `import "./styles.css"` would try to
  inject a stylesheet into the document instead of the shadow root.
- **Shadow DOM isolates CSS, not JS.** It is not a security boundary; a hostile
  host page shares the JS realm. Don't put secrets in the bundle.

## Verify before declaring done

- `tsc --noEmit` passes.
- `bundlehive build` emits `dist/embed.js` + `dist/embed.mjs`.
- Open the built bundle on a test page (a `demo.html` loading `./dist/embed.js`)
  with deliberately hostile host CSS (e.g. `button { background: red !important }`)
  to confirm the widget renders isolated. This visual check is the one thing
  static checks can't cover — always do it.
