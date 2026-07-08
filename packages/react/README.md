# @usereq/bundlehive

The runtime + authoring API for [BundleHive](https://github.com/nguyenduy/bundlehive) —
build a standalone, embeddable React component that mounts onto any website as a
Shadow-DOM custom element with isolated CSS (Tailwind v4 included).

```bash
npm install @usereq/bundlehive react react-dom
```

## Usage

```tsx
// widget.tsx
import { useWidget } from "@usereq/bundlehive";

export function Widget() {
  const { config } = useWidget<{ title?: string }>();
  return <div className="rounded-xl bg-white p-4 shadow">{config.title ?? "Hello"}</div>;
}
```

```ts
// embed.ts — importing this registers <acme-widget>
import { defineWidget } from "@usereq/bundlehive";
import styles from "./styles.css?inline";
import { Widget } from "./widget";

export default defineWidget(Widget, {
  tag: "acme-widget",
  styles,
  observedAttributes: ["title"],
});
```

Build with [`@usereq/bundlehive-cli`](https://www.npmjs.com/package/@usereq/bundlehive-cli), then:

```html
<acme-widget title="Hi"></acme-widget>
<script src="https://unpkg.com/@acme/widget" async></script>
```

## Exports

| Export | Purpose |
| --- | --- |
| `defineWidget(Component, options)` | Turn a React component into a Shadow-DOM custom element |
| `useWidget<Config>()` | Read runtime config + host handle inside the component |
| `useWidgetCommands(cmd => …)` | Handle imperative commands (`open`/`close`/…) from the loader |
| `Portal` | Overlays (dialogs/popovers) scoped to the shadow root |
| `createLoader(name, def, opts?)` | Install a command-queue loader (Intercom-style) |
| `onDomReady(fn)` | DOM-ready guard for self-injecting widgets |

## What it handles for you

- **Shadow-DOM mount** with the React root inside the shadow boundary.
- **Tailwind v4 in shadow DOM** — the runtime hoists `@property` rules and rewrites
  `:root`→`:host`, delivering styles via a shared constructable stylesheet. (Tailwind
  v4 otherwise renders unstyled inside shadow roots.)
- **Runtime config** from element attributes or the loader API — one bundle, all tenants.
- **Three embed modes**: placed element, auto-inject launcher, command-queue loader.

Client render only — no SSR. See the [repo](https://github.com/nguyenduy/bundlehive)
for the full guide, and `llms.txt` for an agent-readable reference.

## License

MIT
