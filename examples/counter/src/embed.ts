import { defineWidget } from "@usereq/bundlehive";
import styles from "./styles.css?inline";
import { Counter, type CounterConfig } from "./widget";

/**
 * Embed entry. Importing this module registers the `<bh-counter>` element.
 * Vite bundles it (IIFE for `<script>` CDN embedding, ESM for npm import).
 */
export default defineWidget<CounterConfig>(Counter, {
  tag: "bh-counter",
  styles,
  observedAttributes: ["start", "label", "accent-color"],
  parseConfig: (attrs) => ({
    start: attrs.start ?? undefined,
    label: attrs.label ?? undefined,
    accentColor: attrs["accent-color"] ?? undefined,
  }),
});
