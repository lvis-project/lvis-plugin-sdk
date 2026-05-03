import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../src/ui/components/Button.js";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost", "danger"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};
export default meta;

export const All: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="primary" size="sm">Small</Button>
      <Button variant="primary" size="lg">Large</Button>
      <Button variant="primary" loading>Loading</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  ),
};

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: "primary", children: "저장" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "취소" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "더 보기" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "삭제" },
};

export const Small: Story = {
  args: { size: "sm", children: "소형" },
};

export const Large: Story = {
  args: { size: "lg", children: "대형" },
};

export const Loading: Story = {
  args: { loading: true, children: "처리 중..." },
};

export const Disabled: Story = {
  args: { disabled: true, children: "비활성" },
};
