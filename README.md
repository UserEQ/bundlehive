<div align="center">

# 🐝 BundleHive

**Build standalone, embeddable widgets in React.**

Write a React component — ship a self-contained bundle that mounts onto *any*
website as a Shadow-DOM custom element with fully isolated CSS (Tailwind v4 included).

<!-- Badges become live once published -->
[![npm](https://img.shields.io/npm/v/@usereq/bundlehive.svg)](https://www.npmjs.com/package/@usereq/bundlehive)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

</div>

> **Status: alpha (pre-1.0).** The runtime, build preset, and CLI work, are covered
> by three examples, and the packages build to `dist` (npm-ready). Not yet published —
> the remaining steps are the npm scope + release automation
> ([docs/PUBLISHING.md](docs/PUBLISHING.md)). APIs may change before 1.0.

---

## Why

Shipping a widget that lives on *someone else's* site — a support bubble, a
pricing table, a feedback button — means hand-rolling the same fragile stack
every time: a Vite library build, a custom element, a Shadow root, CSS isolation,
and runtime config plumbing. And Tailwind v4 silently renders **unstyled** inside
a shadow root unless you know the fix.

BundleHive does all of that once, so you just write React.

```
your React component  ──►  bundlehive build  ──►  <my-widget></my-widget>
                                                   <script src="…/embed.js" async>
```

## Features

- 🧩 **Write plain React** — no custom-element or Shadow-DOM boilerplate.
- 🎨 **Real CSS isolation** — styles scoped to a shadow root, host CSS locked out.
  Tailwind v4 works inside the shadow root (we handle the `@property` / `:root`→`:host` fix).
- 🚀 **One build → two outputs** — an IIFE bundle for `<script>`/CDN embedding and
  an ESM package for npm consumers.
- 🔌 **Three embed modes** — placed element, self-injecting launcher, or a
  command-queue JS API (Intercom-style).
- ⚙️ **Runtime config** — one bundle serves every tenant and environment; no
  rebuild per key.
- 🛠️ **Zero-config CLI** — `bundlehive dev` and `bundlehive build`, no `vite.config.ts`.

## Install

```bash
npm install @usereq/bundlehive react react-dom
npm install -D @usereq/bundlehive-cli tailwindcss
```

## Quickstart

**`src/widget.tsx`** — a plain component:

```tsx
import { useState } from "react";
import { useWidget } from "@usereq/bundlehive";

export function Counter() {
  const { config } = useWidget<{ start?: string }>();
  const [n, setN] = useState(Number(config.start ?? "0") || 0);
  return (
    <button
      onClick={() => setN(n + 1)}
      className="rounded-full bg-indigo-600 px-4 py-2 font-medium text-white"
    >
      Clicked {n} times
    </button>
  );
}
```

**`src/embed.ts`** — register it (importing this defines `<bh-counter>`):

```ts
import { defineWidget } from "@usereq/bundlehive";
import styles from "./styles.css?inline"; // @import "tailwindcss";
import { Counter } from "./widget";

export default defineWidget(Counter, {
  tag: "bh-counter",
  styles,
  observedAttributes: ["start"],
});
```

**Build and embed:**

```bash
bundlehive build            # → dist/embed.js (IIFE) + dist/embed.mjs (ESM)
```

```html
<bh-counter start="10"></bh-counter>
<script src="https://unpkg.com/@acme/counter" async></script>
```

The `<script>` can live in `<head>` with `async` — a custom element upgrades in
place whenever the browser parses it, regardless of load order.

## Embed modes

| Mode | Customer pastes | Use for |
| --- | --- | --- |
| **Placed element** | a tag + script | config via string attributes, in a known spot |
| **Auto-inject** (`autoMount: true`) | just the script | a floating launcher that injects itself |
| **Command-queue loader** (`createLoader`) | a stub + script + JS calls | rich config, per-tenant keys, imperative `open`/`close` |

See [embed-modes.md](.claude/skills/bundlehive-widget/references/embed-modes.md)
for full examples of each.

## How the CSS isolation works

Mounting in a shadow root keeps the host page's CSS out and your CSS in — but
Tailwind v4 declares theme variables on `:root` (which doesn't match a shadow
host) and registers typed properties with `@property` (which browsers ignore
inside shadow roots). BundleHive rewrites `:root`→`:host`, hoists `@property`
rules to the document, and adopts one shared constructable stylesheet per widget.
You just `@import "tailwindcss"` and import it `?inline` — the runtime does the rest.

## CLI

```bash
bundlehive dev      # HMR playground
bundlehive build    # embed bundle → dist/   (--name, --entry, --external, --outDir, --port)
```

## Packages

| Package | Purpose |
| --- | --- |
| [`@usereq/bundlehive`](packages/react) | Runtime + authoring API (`defineWidget`, `useWidget`, `Portal`, `createLoader`) |
| [`@usereq/bundlehive-cli`](packages/cli) | `bundlehive dev` / `bundlehive build` |
| [`@usereq/bundlehive-build`](packages/build) | The Vite build preset (used by the CLI) |

## Examples

- [`examples/counter`](examples/counter) — placed element, attributes, `<Portal>`
- [`examples/floating-badge`](examples/floating-badge) — self-injecting launcher
- [`examples/loader-chat`](examples/loader-chat) — command-queue loader

```bash
bun install
bun --filter '@usereq/bundlehive-example-counter' dev   # then open the printed URL
```

## Docs

- **[llms.txt](llms.txt)** — agent-readable reference
- **Agent skill** — [`.claude/skills/bundlehive-widget`](.claude/skills/bundlehive-widget) ([API](.claude/skills/bundlehive-widget/references/api.md) · [modes](.claude/skills/bundlehive-widget/references/embed-modes.md) · [publishing](.claude/skills/bundlehive-widget/references/publishing.md))
- **[docs/PLAN.md](docs/PLAN.md)** — scope, research, roadmap
- **[docs/PUBLISHING.md](docs/PUBLISHING.md)** — how releases work

## What BundleHive is not

Not a meta-framework. No SSR, no routing, no server — it's a bundler + thin
runtime for client-rendered embeds. For your own app's pages, reach for Next.js
or Vite.

## License

MIT
