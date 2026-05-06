import type { Meta, StoryObj } from "@storybook/react";
import { Icon, ICON_NAMES } from "../src/ui/components/Icon.js";
import { Stack, Inline } from "../src/ui/components/Stack.js";
import { Text } from "../src/ui/components/Text.js";

const meta: Meta<typeof Icon> = {
  title: "UI/Icon",
  component: Icon,
  argTypes: {
    name: {
      control: "select",
      options: ICON_NAMES,
    },
    size: { control: { type: "number", min: 12, max: 64 } },
  },
};
export default meta;

type Story = StoryObj<typeof Icon>;

export const Default: Story = {
  args: { name: "folder", size: 24 },
};

export const AllIcons: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      {ICON_NAMES.map((name) => (
        <Stack key={name} gap="xs" align="center">
          <Icon name={name} size={28} />
          <Text variant="muted" style={{ fontSize: "0.75rem" }}>
            {name}
          </Text>
        </Stack>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Inline gap="md" align="center">
      <Icon name="folder" size={12} />
      <Icon name="folder" size={16} />
      <Icon name="folder" size={20} />
      <Icon name="folder" size={28} />
      <Icon name="folder" size={40} />
    </Inline>
  ),
};

export const WithAriaLabel: Story = {
  render: () => (
    <Inline gap="md" align="center">
      <Text variant="muted">decorative (aria-hidden):</Text>
      <Icon name="trash" />
      <Text variant="muted">meaningful (aria-label):</Text>
      <Icon name="trash" aria-label="문서 삭제" />
    </Inline>
  ),
};
