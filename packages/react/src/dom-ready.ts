/**
 * Run a callback once the DOM is ready to be mutated.
 *
 * This matters for the auto-inject ("floating launcher") pattern: a customer
 * may place the embed `<script async>` in `<head>`, so it can execute before
 * `<body>` exists. A widget that *injects itself* into the page must wait for
 * `<body>`; one mounted into a placed element does not (the browser upgrades
 * that element whenever the parser reaches it, regardless of script order).
 */
export function onDomReady(fn: () => void): void {
  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => fn(), { once: true });
  } else {
    fn();
  }
}
