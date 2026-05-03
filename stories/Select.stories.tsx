import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "../src/ui/components/Select.js";
import { Text } from "../src/ui/components/Text.js";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  argTypes: {
    disabled: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    children: (
      <>
        <option value="">선택하세요</option>
        <option value="gpt4o">GPT-4o</option>
        <option value="claude">Claude</option>
        <option value="gemini">Gemini</option>
      </>
    ),
  },
};

export const WithDefault: Story = {
  args: {
    defaultValue: "claude",
    children: (
      <>
        <option value="gpt4o">GPT-4o</option>
        <option value="claude">Claude</option>
        <option value="gemini">Gemini</option>
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "claude",
    children: (
      <>
        <option value="gpt4o">GPT-4o</option>
        <option value="claude">Claude</option>
        <option value="gemini">Gemini</option>
      </>
    ),
  },
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "16rem" }}>
      <Text variant="label" as="span">언어 모델</Text>
      <Select defaultValue="claude">
        <option value="gpt4o">GPT-4o</option>
        <option value="claude">Claude</option>
        <option value="gemini">Gemini</option>
      </Select>
    </div>
  ),
};
