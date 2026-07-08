# BundleHive embed modes

Three ways a widget reaches the page. Same `defineWidget` core; the difference is
how the instance gets created and how config/control flow in. Pick per widget.

---

## 1. Placed element (attributes)

The customer drops a tag where they want the widget, plus the script. Config is
string attributes. Best when the widget lives in a known spot (a pricing table,
an inline form) and config is simple.

**`embed.ts`**
```ts
import { defineWidget } from "@usereq/bundlehive";
import styles from "./styles.css?inline";
import { Counter } from "./widget";

export default defineWidget<{ start?: string; accentColor?: string }>(Counter, {
  tag: "bh-counter",
  styles,
  observedAttributes: ["start", "accent-color"],
  parseConfig: (a) => ({ start: a.start ?? undefined, accentColor: a["accent-color"] ?? undefined }),
});
```

**Component reads config**
```tsx
const { config } = useWidget<{ start?: string; accentColor?: string }>();
const [n, setN] = useState(Number(config.start ?? "0") || 0);
```

**Customer pastes**
```html
<bh-counter start="10" accent-color="#e11d48"></bh-counter>
<script src="https://unpkg.com/@acme/counter" async></script>
```

Attributes are live: changing `start` re-parses config and re-renders (no
remount). The script may go in `<head async>` — the tag upgrades when parsed.

---

## 2. Auto-inject (floating launcher)

The customer pastes *only the script* — no tag. The widget injects itself into
the page (default `<body>`) after the DOM is ready. Best for floating launchers
(chat bubble, feedback button) that pin to a corner.

**`embed.ts`**
```ts
export default defineWidget<{ label?: string; accentColor?: string }>(FloatingBadge, {
  tag: "bh-floating-badge",
  styles,
  observedAttributes: ["label", "accent-color"],
  parseConfig: (a) => ({ label: a.label ?? undefined, accentColor: a["accent-color"] ?? undefined }),
  autoMount: true,   // ← inject one instance into <body> on DOM-ready
});
```

`autoMount` can also target a container / preset attributes:
```ts
autoMount: { target: "#widget-slot", attributes: { label: "Help" } }
```

**Component** pins itself with fixed positioning (works inside the shadow root,
relative to the viewport):
```tsx
<div className="fixed bottom-5 right-5 z-[2147483647] ...">…</div>
```

**Customer pastes**
```html
<script src="https://unpkg.com/@acme/launcher" async></script>
```

Because injection is DOM-ready-guarded, a `<head async>` script that runs before
`<body>` still works.

---

## 3. Command-queue loader

The customer pastes a tiny inline stub, then the script, and can call a JS API
*before the async bundle loads*. Best when config is rich/nested (objects,
per-tenant keys) or the host page needs imperative control (`open`, `close`,
`identify the user`). This is the Intercom/Segment/GA pattern.

**`embed.ts`**
```ts
import { createLoader, defineWidget } from "@usereq/bundlehive";
import styles from "./styles.css?inline";
import { ChatPanel, type ChatConfig } from "./widget";

const widget = defineWidget<ChatConfig>(ChatPanel, { tag: "acme-chat", styles });
createLoader("acmechat", widget);   // installs window.acmechat(...)
```

**Component** reads rich config and reacts to commands:
```tsx
const { config } = useWidget<ChatConfig>();   // { title, user: { name }, ... }
const [open, setOpen] = useState(false);
useWidgetCommands((cmd) => {
  if (cmd.type === "open") setOpen(true);
  if (cmd.type === "close") setOpen(false);
  if (cmd.type === "toggle") setOpen((o) => !o);
});
```

**Customer pastes** — the stub buffers calls into `window.acmechat.q`; the bundle
drains and replays them, then handles later calls live:
```html
<script>
  (function (w) {
    w.acmechat = w.acmechat || function () {
      (w.acmechat.q = w.acmechat.q || []).push(arguments);
    };
  })(window);
  acmechat("init", { title: "Support", user: { name: "Duy" } });  // queued
  acmechat("open");                                                // queued
</script>
<script src="https://unpkg.com/@acme/chat" async></script>
```

After load, the host page controls the live widget: `acmechat("toggle")`,
`acmechat("update", { title: "…" })`, `acmechat("destroy")`.

The stub is boilerplate the customer copies verbatim — only `acmechat` (the
loader name) changes.

---

## Which to pick

- Inline, positioned by the host, simple config → **placed element**.
- Self-positioning floating launcher, zero markup → **auto-inject**.
- Rich config, per-tenant keys, or a live JS API the host drives → **loader**.

A single widget usually picks one. Loader + auto-inject overlap (both are
script-only); use the loader when you need the imperative API, auto-inject when a
plain declarative injection is enough.
