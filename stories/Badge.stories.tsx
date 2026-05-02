import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../src/ui/components/Badge.js";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  args: { children: "Badge" },
};
export default meta;

export const All: StoryObj = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
      <Badge variant="default">Default</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
    </div>
  ),
};

export const Default: StoryObj<typeof Badge> = { args: { variant: "default" } };
export const Success: StoryObj<typeof Badge> = { args: { variant: "success" } };
export const Warning: StoryObj<typeof Badge> = { args: { variant: "warning" } };
export const Danger: StoryObj<typeof Badge> = { args: { variant: "danger" } };
