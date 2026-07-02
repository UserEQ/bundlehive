import { createLoader, defineWidget } from "@bundlehive/react";
import styles from "./styles.css?inline";
import { ChatPanel, type ChatConfig } from "./widget";

// Register the element...
const widget = defineWidget<ChatConfig>(ChatPanel, {
  tag: "acme-chat",
  styles,
});

// ...then install the `acmechat(...)` command-queue API. Loading this script
// drains any calls the host page queued before the bundle arrived.
createLoader("acmechat", widget);
