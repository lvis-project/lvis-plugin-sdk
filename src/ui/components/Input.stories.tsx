import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input.js";
import { Text } from "./Text.js";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  argTypes: {
    error: { control: "boolean" },
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
  },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "검색어를 입력하세요" },
};

export const WithValue: Story = {
  args: { defaultValue: "이미 입력된 내용" },
};

export const Error: Story = {
  args: { error: true, defaultValue: "잘못된 값", placeholder: "올바른 값을 입력하세요" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "비활성 입력" },
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "18rem" }}>
      <Text variant="label" as="span">이메일 주소</Text>
      <Input type="email" placeholder="example@lge.com" />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "18rem" }}>
      <Text variant="label" as="span">API 키</Text>
      <Input error defaultValue="invalid-key" />
      <Text variant="muted" style={{ color: "var(--lvis-danger)", fontSize: "0.75rem" }}>유효하지 않은 API 키입니다.</Text>
    </div>
  ),
};
