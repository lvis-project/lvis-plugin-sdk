import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../src/ui/components/Button.js";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  args: { children: "버튼" },
};
export default meta;

// All variants in one view
export const All: StoryObj = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div>
        <p style={{ color: "var(--lvis-fg-muted)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>Variants</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </div>
      <div>
        <p style={{ color: "var(--lvis-fg-muted)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>Sizes</p>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
      </div>
    </div>
  ),
};

export const Primary: StoryObj<typeof Button> = { args: { variant: "primary" } };
export const Secondary: StoryObj<typeof Button> = { args: { variant: "secondary" } };
export const Ghost: StoryObj<typeof Button> = { args: { variant: "ghost" } };
export const Danger: StoryObj<typeof Button> = { args: { variant: "danger" } };
export const Loading: StoryObj<typeof Button> = { args: { variant: "primary", loading: true } };
export const Small: StoryObj<typeof Button> = { args: { variant: "primary", size: "sm" } };
export const Large: StoryObj<typeof Button> = { args: { variant: "primary", size: "lg" } };
