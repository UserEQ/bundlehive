# BundleHive API reference

Everything exported from `@bundlehive/react`, plus the CLI and build preset.

## Table of contents
- [`defineWidget`](#definewidget)
- [`useWidget`](#usewidget)
- [`useWidgetCommands`](#usewidgetcommands)
- [`Portal`](#portal)
- [`createLoader`](#createloader)
- [`onDomReady`](#ondomready)
- [`transformShadowCss` / `adoptWidgetStyles`](#css-internals)
- [CLI (`@bundlehive/cli`)](#cli)
- [Build preset (`@bundlehive/build`)](#build-preset)

---

## `defineWidget`

```ts
function defineWidget<Config = Record<string, string | null>>(
  Component: React.ComponentType,
  options: DefineWidgetOptions<Config>,
): WidgetDefinition;

interface DefineWidgetOptions<Config> {
  tag: string;                    // custom element name; MUST contain a hyphen
  styles?: string;                // compiled CSS as a string (import ?inline)
  observedAttributes?: string[];  // attributes that trigger a config re-parse
  parseConfig?: (attrs: Record<string, string | null>, el: HTMLElement) => Config;
  strictMode?: boolean;           // wrap in <StrictMode>; default true
  autoMount?: boolean | { target?: string; attributes?: Record<string, string> };
}

interface WidgetDefinition {
  tag: string;
  elementClass: CustomElementConstructor;
  mount(options?: { target?: string; attributes?: Record<string, string> }): void;
}
```

- Registers a Shadow-DOM custom element and mounts `Component` inside it via a
  React root created *in the shadow root* (so React's listeners stay scoped).
- `styles` is adopted as a shared constructable stylesheet — one sheet per
  distinct CSS string, reused across every instance of the widget.
- `parseConfig` runs on mount and on every observed-attribute change; its return
  value is what `useWidget().config` returns. Without it, config is the raw
  attribute record.
- `autoMount` injects an instance for you (see the auto-inject mode). Returned
  `mount()` does the same programmatically, DOM-ready-guarded.
- Idempotent: re-defining an already-registered tag is a no-op.

**Config merging:** attribute-derived config is the base; anything set via the
loader's `setConfig`/`update` is layered on top (object config wins). This is how
rich object config coexists with string attributes.

---

## `useWidget`

```ts
function useWidget<Config = Record<string, string | null>>(): {
  config: Config;
  element: HTMLElement;   // the host custom element
  shadowRoot: ShadowRoot; // for portals / manual DOM
};
```

Call from any component rendered by `defineWidget`. Re-renders when config
changes (backed by `useSyncExternalStore`). Throws if used outside a widget.

---

## `useWidgetCommands`

```ts
function useWidgetCommands(handler: (command: { type: string; payload?: unknown }) => void): void;
```

Handle imperative commands sent through the loader API (e.g. `acme('open')`
arrives as `{ type: "open" }`). The handler always sees the latest closure.
Commands fired **before** the component mounts (e.g. a queued `init` + `open`)
are buffered and flushed once this subscribes — so early commands aren't lost.

---

## `Portal`

```tsx
<Portal>{children}</Portal>
```

Renders `children` into a container appended directly under the widget's shadow
root. Use for overlays (dialogs, popovers, tooltips) that must escape the
widget's layout flow but stay styled and isolated. This exists because React's
`createPortal` into an arbitrary shadow-tree node drops synthetic events
(facebook/react#12973); `<Portal>` keeps content inside the same shadow root so
event delegation still works.

---

## `createLoader`

```ts
function createLoader(
  name: string,
  definition: WidgetDefinition,
  options?: { target?: string },   // selector for injection container; default body
): void;
```

Installs `globalThis[name]` as the command dispatcher and drains the inline
stub's queue (`window[name].q`). Built-in commands:

- `init` / `boot` `(config)` — create the singleton instance, apply config,
  inject on DOM-ready.
- `update` `(config)` — merge new config into the live instance.
- `destroy` — remove the instance.
- anything else `(payload)` — delivered to the widget via `useWidgetCommands`.

Call it once, after `defineWidget`, in your `embed.ts`. Singleton per loader
(one instance) — right for floating launchers.

---

## `onDomReady`

```ts
function onDomReady(fn: () => void): void;
```

Runs `fn` after `DOMContentLoaded`, or immediately if the DOM is already parsed.
Used internally by `autoMount`/`createLoader` so a `<head async>` script that
injects into `<body>` works even when it executes before `<body>` exists.

---

## CSS internals

```ts
function transformShadowCss(css: string): { scopedCss: string; propertyRules: string };
function adoptWidgetStyles(shadowRoot: ShadowRoot, css: string): void;
```

Exposed for advanced use/testing. `adoptWidgetStyles` is what `defineWidget`
calls; `transformShadowCss` performs the Tailwind-v4 fix (extract `@property`
rules to hoist document-level, rewrite `:root`→`:host`). You normally never call
these directly.

---

## CLI

`@bundlehive/cli` provides the `bundlehive` binary:

```
bundlehive dev     Start the Vite dev server / HMR playground (serves index.html)
bundlehive build   Build the embed bundle (IIFE + ESM) into dist/

Options:
  --entry <path>     Embed entry module        (default: src/embed.ts)
  --name <Name>      IIFE global name           (default: BundleHiveWidget)
  --external <list>  Comma-separated externals  (e.g. react,react-dom)
  --outDir <dir>     Output directory           (default: dist)
  --port <n>         Dev server port
```

No `vite.config.ts` needed — the CLI applies the build preset internally
(`configFile: false`). For `dev`, a `index.html` in the project root that loads
`/src/embed.ts` acts as the playground.

---

## Build preset

`@bundlehive/build` exposes the Vite config the CLI uses, for anyone who wants a
`vite.config.ts` instead of the CLI:

```ts
import { defineConfig } from "vite";
import { widgetBuildConfig } from "@bundlehive/build";

export default defineConfig(widgetBuildConfig({ name: "AcmeWidget" }));

interface WidgetBuildOptions {
  root?: string; entry?: string; name?: string;
  formats?: LibraryFormats[];   // default ["iife", "es"]
  outDir?: string; fileName?: string;
  external?: string[]; globals?: Record<string, string>;
  dev?: boolean;                // keeps NODE_ENV=development
}
```

Pass `external: ["react", "react-dom"]` (+ `globals`) to build the shared-runtime
variant where the host provides React, instead of bundling it in.
