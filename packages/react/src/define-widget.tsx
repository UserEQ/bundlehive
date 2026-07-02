import { StrictMode, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WidgetContext, type WidgetCommand, type WidgetController } from "./host";
import { adoptWidgetStyles } from "./css-isolation";
import { onDomReady } from "./dom-ready";

/**
 * The control surface a generated widget element exposes for imperative use
 * (the loader API drives instances through this). The element is also a real
 * `HTMLElement`, so attributes still work alongside it.
 */
export interface WidgetElement<Config = unknown> extends HTMLElement {
  /** Merge a config object into the instance (objects, not just strings). */
  setConfig(config: Partial<Config>): void;
  /** Deliver an imperative command to the widget (e.g. `open`, `close`). */
  sendCommand(type: string, payload?: unknown): void;
}

/** Where/how to auto-inject a floating instance (no placed element needed). */
export interface AutoMountOptions {
  /** CSS selector for the container to append into. Default `body`. */
  target?: string;
  /** Attributes to set on the injected element (your runtime config). */
  attributes?: Record<string, string>;
}

export interface DefineWidgetOptions<Config> {
  /** Custom element tag name. Must contain a hyphen, e.g. `"acme-pricing"`. */
  tag: string;
  /**
   * Compiled CSS for the widget, as a string — import it with Vite's
   * `?inline` suffix (`import styles from "./styles.css?inline"`). It is
   * adopted into the shadow root with full Tailwind-v4 compatibility.
   */
  styles?: string;
  /**
   * Attributes to observe. Changing any of these re-parses config and
   * re-renders the React tree (without remounting it).
   */
  observedAttributes?: string[];
  /**
   * Turn the element's attributes into your typed config. Defaults to the
   * raw attribute record. Runs on mount and whenever an observed attribute
   * changes.
   */
  parseConfig?: (
    attributes: Record<string, string | null>,
    element: HTMLElement,
  ) => Config;
  /** Render inside `<StrictMode>`. Default true. */
  strictMode?: boolean;
  /**
   * Auto-inject a floating instance into the page instead of requiring the
   * customer to place an element. `true` appends one bare element to `<body>`;
   * pass options to choose a target/attributes. Injection waits for the DOM
   * to be ready, so a `<head>`-placed `<script async>` works. The
   * Intercom/Drift "just load the script" pattern.
   */
  autoMount?: boolean | AutoMountOptions;
}

/** Reference to the generated element class, plus its registered tag. */
export interface WidgetDefinition {
  tag: string;
  elementClass: CustomElementConstructor;
  /**
   * Programmatically inject an instance once the DOM is ready. Returns
   * immediately; the element is created/appended on the next ready tick.
   */
  mount(options?: AutoMountOptions): void;
}

function readAttributes(
  element: HTMLElement,
  names: string[],
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const name of names) out[name] = element.getAttribute(name);
  return out;
}

/**
 * Author a standalone, embeddable React component. Returns (and, in the
 * browser, registers) a Shadow-DOM custom element that mounts the
 * component, isolates its CSS, and feeds it runtime config from attributes.
 *
 * ```tsx
 * import styles from "./styles.css?inline";
 * function Counter() {
 *   const { config } = useWidget<{ start?: string }>();
 *   ...
 * }
 * export default defineWidget(Counter, { tag: "acme-counter", styles });
 * ```
 */
export function defineWidget<Config = Record<string, string | null>>(
  Component: ComponentType,
  options: DefineWidgetOptions<Config>,
): WidgetDefinition {
  const {
    tag,
    styles,
    observedAttributes = [],
    parseConfig,
    strictMode = true,
  } = options;

  const computeConfig = (element: HTMLElement): Config => {
    const attrs = readAttributes(element, observedAttributes);
    return parseConfig
      ? parseConfig(attrs, element)
      : (attrs as unknown as Config);
  };

  class BundleHiveElement extends HTMLElement implements WidgetElement<Config> {
    static get observedAttributes() {
      return observedAttributes;
    }

    private root: Root | null = null;
    private shadow: ShadowRoot;
    private mountPoint: HTMLDivElement;
    private listeners = new Set<() => void>();
    private commandListeners = new Set<(c: WidgetCommand) => void>();
    /** Commands fired before any subscriber exists (e.g. `init`+`open`
     *  queued before React mounts) — flushed on first subscribe. */
    private pendingCommands: WidgetCommand[] = [];
    /** Config set imperatively via `setConfig` (loader API). Merged over
     *  the attribute-derived config; supports rich objects, not just strings. */
    private objConfig: Partial<Config> = {};
    private config: Config;

    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: "open" });
      // Host element fills its slot; the widget controls its own internal
      // layout. `:host` is also where Tailwind theme variables land.
      const hostStyle = document.createElement("style");
      hostStyle.textContent = ":host { display: block; }";
      this.mountPoint = document.createElement("div");
      this.shadow.append(hostStyle, this.mountPoint);
      this.config = this.computeMerged();
    }

    /** Attribute-derived config, with any imperatively-set config layered on
     *  top. Object config wins so `setConfig`/`update` can override attrs. */
    private computeMerged(): Config {
      const attrConfig = computeConfig(this);
      if (
        attrConfig &&
        typeof attrConfig === "object" &&
        !Array.isArray(attrConfig)
      ) {
        return { ...(attrConfig as object), ...(this.objConfig as object) } as Config;
      }
      // Non-object config (rare): object config replaces it if present.
      return (Object.keys(this.objConfig as object).length
        ? (this.objConfig as Config)
        : attrConfig) as Config;
    }

    private notifyConfig(): void {
      this.config = this.computeMerged();
      for (const listener of this.listeners) {
        try {
          listener();
        } catch (err) {
          console.error("[bundlehive] config subscriber threw:", err);
        }
      }
    }

    setConfig(config: Partial<Config>): void {
      this.objConfig = { ...(this.objConfig as object), ...(config as object) };
      this.notifyConfig();
    }

    sendCommand(type: string, payload?: unknown): void {
      const command: WidgetCommand = { type, payload };
      if (this.commandListeners.size === 0) {
        this.pendingCommands.push(command);
        return;
      }
      for (const listener of this.commandListeners) {
        try {
          listener(command);
        } catch (err) {
          console.error("[bundlehive] command subscriber threw:", err);
        }
      }
    }

    connectedCallback() {
      if (styles) adoptWidgetStyles(this.shadow, styles);

      const controller: WidgetController<Config> = {
        getConfig: () => this.config,
        subscribe: (listener) => {
          this.listeners.add(listener);
          return () => this.listeners.delete(listener);
        },
        onCommand: (listener) => {
          this.commandListeners.add(listener);
          if (this.pendingCommands.length) {
            const pending = this.pendingCommands;
            this.pendingCommands = [];
            for (const command of pending) listener(command);
          }
          return () => this.commandListeners.delete(listener);
        },
        element: this,
        shadowRoot: this.shadow,
      };

      const tree = (
        <WidgetContext.Provider value={controller as WidgetController<unknown>}>
          <Component />
        </WidgetContext.Provider>
      );

      this.root = createRoot(this.mountPoint);
      this.root.render(strictMode ? <StrictMode>{tree}</StrictMode> : tree);
    }

    attributeChangedCallback() {
      this.notifyConfig();
    }

    disconnectedCallback() {
      // Defer unmount: disconnectedCallback can fire during a transient
      // DOM move; unmounting synchronously would throw if React is mid-render.
      const root = this.root;
      this.root = null;
      this.listeners.clear();
      this.commandListeners.clear();
      if (root) queueMicrotask(() => root.unmount());
    }
  }

  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, BundleHiveElement);
  }

  const mount = (mountOptions: AutoMountOptions = {}): void => {
    onDomReady(() => {
      const target =
        (mountOptions.target
          ? document.querySelector(mountOptions.target)
          : document.body) ?? document.body;
      const el = document.createElement(tag);
      for (const [name, value] of Object.entries(mountOptions.attributes ?? {})) {
        el.setAttribute(name, value);
      }
      target.appendChild(el);
    });
  };

  if (options.autoMount) {
    mount(typeof options.autoMount === "object" ? options.autoMount : {});
  }

  return { tag, elementClass: BundleHiveElement, mount };
}
