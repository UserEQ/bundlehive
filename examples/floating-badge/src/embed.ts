import { defineWidget } from "@bundlehive/react";
import styles from "./styles.css?inline";
import { FloatingBadge, type BadgeConfig } from "./widget";

/**
 * Auto-inject the launcher. Loading this script is enough — no element to
 * place. `autoMount` waits for the DOM to be ready, so a `<head>`-placed
 * `<script async>` works even though it runs before <body> exists.
 */
export default defineWidget<BadgeConfig>(FloatingBadge, {
  tag: "bh-floating-badge",
  styles,
  observedAttributes: ["label", "accent-color"],
  parseConfig: (attrs) => ({
    label: attrs.label ?? undefined,
    accentColor: attrs["accent-color"] ?? undefined,
  }),
  autoMount: true,
});
