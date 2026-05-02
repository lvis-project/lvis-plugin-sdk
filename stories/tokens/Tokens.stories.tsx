import type { Meta } from "@storybook/react";
import React from "react";
import { LVIS_TOKEN_NAMES } from "../../src/ui/tokens/index.js";

const meta: Meta = { title: "Tokens/Palette" };
export default meta;

export const All = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
    {LVIS_TOKEN_NAMES.map((name) => (
      <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "var(--lvis-radius-sm)",
          background: name.includes("radius") ? "var(--lvis-primary)" : `var(${name})`,
          border: "1px solid var(--lvis-border)", flexShrink: 0,
        }} />
        <code style={{ fontSize: "0.75rem", color: "var(--lvis-fg-muted)" }}>{name}</code>
      </div>
    ))}
  </div>
);
