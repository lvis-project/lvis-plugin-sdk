import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "../src/ui/components/Checkbox.js";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
  argTypes: {
    label: { control: "text" },
    disabled: { control: "boolean" },
    indeterminate: { control: "boolean" },
  },
};
export default meta;

export const All: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      <Checkbox label="이메일 알림" defaultChecked />
      <Checkbox label="푸시 알림" />
      <Checkbox label="SMS 알림" disabled />
      <Checkbox label="일부 선택됨" indeterminate />
    </div>
  ),
};

type Story = StoryObj<typeof Checkbox>;

export const Unchecked: Story = {
  args: { label: "알림 수신" },
};

export const Checked: Story = {
  args: { label: "알림 수신", defaultChecked: true },
};

export const Indeterminate: Story = {
  args: { label: "일부 선택됨", indeterminate: true },
};

export const Disabled: Story = {
  args: { label: "비활성 항목", disabled: true },
};

export const DisabledChecked: Story = {
  args: { label: "비활성 선택됨", disabled: true, defaultChecked: true },
};

export const NoLabel: Story = {
  args: { defaultChecked: true },
};
