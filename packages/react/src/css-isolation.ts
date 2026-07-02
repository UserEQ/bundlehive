/**
 * CSS isolation for Shadow-DOM-mounted widgets.
 *
 * The whole point of mounting in a shadow root is that the host page's CSS
 * can't reach our widget and our widget's CSS can't leak onto the host page.
 * We deliver our styles by *adopting* a single constructable `CSSStyleSheet`
 * into `shadowRoot.adoptedStyleSheets` — one sheet shared across every
 * instance of the same widget, instead of a `<style>` tag per mount.
 *
 * Tailwind v4 makes this harder than it sounds. Two of its output features
 * are incompatible with naive shadow-root adoption:
 *
 *   1. Theme variables are declared on `:root`. Inside a shadow root, `:root`
 *      matches the *document* root — which is not in our adopted sheet's
 *      scope — so the variables resolve to nothing and every `bg-*`,
 *      `text-*`, spacing, etc. silently renders unstyled. We rewrite `:root`
 *      to `:host` so the variables land on the shadow host and inherit down.
 *
 *   2. Tailwind v4 registers typed custom properties with `@property`. A
 *      `@property` rule is a *global* registration; browsers ignore (or
 *      inconsistently apply) `@property` rules that live only inside a
 *      shadow root's adopted sheet. We hoist every `@property` rule out into
 *      a document-level sheet, registered once, so the registrations exist
 *      globally while the rest of the styles stay scoped to the shadow root.
 *
 * Refs: tailwindcss#15556, the shadow-DOM `@property` limitation, and the
 * `adoptedStyleSheets` constructable-stylesheet pattern.
 */

/** Matches a complete `@property --foo { ... }` block. `@property` bodies
 *  never contain nested braces, so a non-greedy `[^}]*` is sufficient and
 *  avoids pulling in a CSS parser at runtime. */
const PROPERTY_RULE = /@property\s+--[\w-]+\s*\{[^}]*\}/g;

/** Document-level sheet holding hoisted `@property` registrations, created
 *  once and shared. Keyed off the exact CSS we've already hoisted so two
 *  widgets built from the same stylesheet don't double-register. */
let documentPropsSheet: CSSStyleSheet | null = null;
const hoistedProps = new Set<string>();

/**
 * Rewrite a compiled stylesheet for safe adoption into a shadow root, and
 * return:
 *   - `scopedCss`: styles with `:root` → `:host` and `@property` removed,
 *     ready to put in the shadow root's adopted sheet.
 *   - `propertyRules`: the extracted `@property` blocks, to register at the
 *     document level.
 */
export function transformShadowCss(css: string): {
  scopedCss: string;
  propertyRules: string;
} {
  const propertyRules = css.match(PROPERTY_RULE)?.join("\n") ?? "";

  const scopedCss = css
    .replace(PROPERTY_RULE, "")
    // `:root` → `:host` so theme variables land on the shadow host. We only
    // rewrite a bare `:root` (optionally followed by `,` whitespace `{`);
    // `:root[...]`-style attribute selectors are left for a later pass.
    .replace(/:root(?=[\s,{])/g, ":host");

  return { scopedCss, propertyRules };
}

/** Build a constructable stylesheet from CSS text. Falls back to `null` in
 *  environments without constructable-stylesheet support (SSR, very old
 *  browsers) — callers then use a `<style>` element instead. */
function makeSheet(css: string): CSSStyleSheet | null {
  if (typeof CSSStyleSheet === "undefined") return null;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    return sheet;
  } catch {
    return null;
  }
}

/** Register hoisted `@property` rules at the document level, exactly once
 *  per distinct rule set. */
function ensureDocumentProps(propertyRules: string): void {
  if (!propertyRules || hoistedProps.has(propertyRules)) return;
  if (typeof document === "undefined") return;

  if (!documentPropsSheet) {
    documentPropsSheet = makeSheet("");
    if (!documentPropsSheet) {
      // No constructable stylesheets — fall back to a <style> in <head>.
      const style = document.createElement("style");
      style.setAttribute("data-bundlehive-props", "");
      style.textContent = propertyRules;
      document.head.appendChild(style);
      hoistedProps.add(propertyRules);
      return;
    }
    document.adoptedStyleSheets = [
      ...document.adoptedStyleSheets,
      documentPropsSheet,
    ];
  }

  // Append, don't replace — multiple widgets may each contribute rules.
  for (const rule of propertyRules.split("}").filter((s) => s.trim())) {
    try {
      documentPropsSheet.insertRule(
        `${rule}}`,
        documentPropsSheet.cssRules.length,
      );
    } catch {
      /* duplicate or unsupported — ignore */
    }
  }
  hoistedProps.add(propertyRules);
}

/**
 * One compiled+cached shadow stylesheet per distinct CSS string, so N
 * instances of a widget share a single `CSSStyleSheet` object.
 */
const shadowSheetCache = new Map<string, CSSStyleSheet | string>();

/**
 * Apply a widget's compiled CSS to a shadow root with full Tailwind-v4
 * compatibility. Idempotent per (shadow root, css).
 */
export function adoptWidgetStyles(shadowRoot: ShadowRoot, css: string): void {
  if (!css) return;

  const cached = shadowSheetCache.get(css);
  if (cached === undefined) {
    const { scopedCss, propertyRules } = transformShadowCss(css);
    ensureDocumentProps(propertyRules);
    const sheet = makeSheet(scopedCss);
    shadowSheetCache.set(css, sheet ?? scopedCss);
    return adoptWidgetStyles(shadowRoot, css);
  }

  if (typeof cached === "string") {
    // Fallback path: inject a <style> element into the shadow root.
    const style = document.createElement("style");
    style.textContent = cached;
    shadowRoot.appendChild(style);
    return;
  }

  if (!shadowRoot.adoptedStyleSheets.includes(cached)) {
    shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, cached];
  }
}
