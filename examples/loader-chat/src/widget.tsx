import { useState } from "react";
import { useWidget, useWidgetCommands } from "@bundlehive/react";

export interface ChatConfig {
  title?: string;
  primaryColor?: string;
  /** Rich, nested config — impossible to express as a string attribute. */
  user?: { name?: string };
}

/**
 * A chat launcher driven entirely by the command-queue loader: its config
 * arrives via `acmechat('init', {...})` (a rich object) and it opens/closes
 * in response to `acmechat('open' | 'close' | 'toggle')`.
 */
export function ChatPanel() {
  const { config } = useWidget<ChatConfig>();
  const [open, setOpen] = useState(false);

  useWidgetCommands((cmd) => {
    if (cmd.type === "open") setOpen(true);
    else if (cmd.type === "close") setOpen(false);
    else if (cmd.type === "toggle") setOpen((o) => !o);
  });

  const color = config.primaryColor ?? "#4f46e5";

  return (
    <div className="fixed bottom-5 right-5 z-[2147483647] flex flex-col items-end gap-3 font-sans">
      {open && (
        <div className="w-72 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-2xl">
          <p className="font-semibold text-slate-900">
            {config.title ?? "Support"}
          </p>
          {config.user?.name && (
            <p className="mt-0.5 text-slate-500">Hi {config.user.name} 👋</p>
          )}
          <p className="mt-2">
            Config and the initial <code>open</code> were queued by the inline
            stub <em>before</em> this bundle finished loading, then replayed.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle chat"
        className="grid h-14 w-14 place-items-center rounded-full text-2xl text-white shadow-xl transition hover:brightness-110 active:scale-95"
        style={{ backgroundColor: color }}
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
