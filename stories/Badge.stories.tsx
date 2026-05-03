import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../src/ui/components/Badge.js";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  argTypes: {
    variant: { control: "select", options: ["default", "success", "warning", "danger"] },
  },
};
export default meta;

export const All: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <Badge variant="default">기본</Badge>
      <Badge variant="success">완료</Badge>
      <Badge variant="warning">주의</Badge>
      <Badge variant="danger">오류</Badge>
    </div>
  ),
};

type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { variant: "default", children: "기본" },
};

export const Success: Story = {
  args: { variant: "success", children: "완료" },
};

export const Warning: Story = {
  args: { variant: "warning", children: "주의" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "오류" },
};
