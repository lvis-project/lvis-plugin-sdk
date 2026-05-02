import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../src/ui/components/Button.js";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  args: { children: "버튼" },
};
export default meta;

export const Primary: StoryObj<typeof Button> = { args: { variant: "primary" } };
export const Secondary: StoryObj<typeof Button> = { args: { variant: "secondary" } };
export const Ghost: StoryObj<typeof Button> = { args: { variant: "ghost" } };
export const Danger: StoryObj<typeof Button> = { args: { variant: "danger" } };
export const Loading: StoryObj<typeof Button> = { args: { variant: "primary", loading: true } };
export const Small: StoryObj<typeof Button> = { args: { variant: "primary", size: "sm" } };
export const Large: StoryObj<typeof Button> = { args: { variant: "primary", size: "lg" } };
