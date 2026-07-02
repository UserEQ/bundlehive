import { useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { WidgetContext } from "./host";

/**
 * Portal that keeps content *inside* the widget's shadow root.
 *
 * Why this exists: React's `createPortal` into a node outside the React
 * root drops synthetic events when that node is in a shadow tree
 * (facebook/react#12973). For overlay UI (dialogs, popovers, tooltips,
 * dropdowns) you still want the content to escape the widget's normal
 * layout flow *without* leaving the shadow root — otherwise it loses the
 * adopted styles and the host page's CSS reaches it.
 *
 * `<Portal>` mounts into a container appended directly under the shadow
 * root, so portaled content stays styled and isolated. Event retargeting
 * within the same shadow root keeps React's delegation working.
 */
export function Portal({ children }: { children: ReactNode }) {
  const controller = useContext(WidgetContext);
  const [container] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  useEffect(() => {
    if (!controller || !container) return;
    container.setAttribute("data-bundlehive-portal", "");
    controller.shadowRoot.appendChild(container);
    return () => {
      container.remove();
    };
  }, [controller, container]);

  if (!container) return null;
  return createPortal(children, container);
}
