import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "../src/ui/components/Spinner.js";

const meta: Meta<typeof Spinner> = {
  title: "UI/Spinner",
  component: Spinner,
};
export default meta;

export const All: StoryObj = {
  render: () => (
    <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};

export const Small: StoryObj<typeof Spinner> = { args: { size: "sm" } };
export const Medium: StoryObj<typeof Spinner> = { args: { size: "md" } };
export const Large: StoryObj<typeof Spinner> = { args: { size: "lg" } };
