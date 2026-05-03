import type { Meta, StoryObj } from "@storybook/react";
import { Toggle } from "./Toggle.js";

const meta: Meta<typeof Toggle> = {
  title: "UI/Toggle",
  component: Toggle,
  argTypes: {
    label: { control: "text" },
    disabled: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof Toggle>;

export const Off: Story = {
  args: { label: "자동 업데이트" },
};

export const On: Story = {
  args: { label: "자동 업데이트", defaultChecked: true },
};

export const Disabled: Story = {
  args: { label: "비활성 항목", disabled: true },
};

export const DisabledOn: Story = {
  args: { label: "비활성 (활성화됨)", disabled: true, defaultChecked: true },
};

export const NoLabel: Story = {
  args: { defaultChecked: true },
};

export const SettingsList: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", width: "14rem" }}>
      <Toggle label="자동 업데이트" defaultChecked />
      <Toggle label="텔레메트리 수집" />
      <Toggle label="크래시 리포트" defaultChecked />
      <Toggle label="베타 기능" disabled />
    </div>
  ),
};
