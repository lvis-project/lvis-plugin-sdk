import type { Meta, StoryObj } from "@storybook/react";
import { Icon, type IconName } from "../src/ui/components/Icon.js";
import { Stack, Inline } from "../src/ui/components/Stack.js";
import { Text } from "../src/ui/components/Text.js";

const meta: Meta<typeof Icon> = {
  title: "UI/Icon",
  component: Icon,
  argTypes: {
    name: {
      control: "select",
      options: [
        "search", "folder", "document", "refresh", "play", "pause",
        "stop", "plus", "minus", "trash", "empty", "spark",
        "check", "x", "chevron-down", "chevron-up", "chevron-left",
        "chevron-right", "edit", "copy", "download", "upload",
        "save", "loader", "warning", "info", "error",
        "external-link", "calendar", "clock", "timer",
        "bell", "bell-off", "user", "users", "mail", "send",
        "settings", "more-horizontal", "help-circle",
        "eye", "eye-off", "lock", "unlock", "shield-check",
        "video", "video-off", "mic", "mic-off", "phone",
        "volume-2", "volume-x",
        "filter", "trending-up", "trending-down", "bar-chart",
        "activity", "star", "pin", "bookmark",
        "bot", "briefcase", "home", "building",
        "arrow-left", "arrow-right",
        "share", "link", "message-square", "at-sign",
        "paperclip", "reply", "forward",
        "check-circle", "x-circle", "circle", "circle-dot",
        "list", "layout-grid", "map-pin",
        "power", "zap", "terminal", "archive",
        "thumbs-up", "file", "tag",
      ],
    },
    size: { control: { type: "number", min: 12, max: 64 } },
  },
};
export default meta;

type Story = StoryObj<typeof Icon>;

export const Default: Story = {
  args: { name: "folder", size: 24 },
};

const ALL_NAMES: IconName[] = [
  "search", "folder", "document", "refresh", "play", "pause",
  "stop", "plus", "minus", "trash", "empty", "spark",
  "check", "x", "chevron-down", "chevron-up", "chevron-left",
  "chevron-right", "edit", "copy", "download", "upload",
  "save", "loader", "warning", "info", "error",
  "external-link", "calendar", "clock", "timer",
  "bell", "bell-off", "user", "users", "mail", "send",
  "settings", "more-horizontal", "help-circle",
  "eye", "eye-off", "lock", "unlock", "shield-check",
  "video", "video-off", "mic", "mic-off", "phone",
  "volume-2", "volume-x",
  "filter", "trending-up", "trending-down", "bar-chart",
  "activity", "star", "pin", "bookmark",
  "bot", "briefcase", "home", "building",
  "arrow-left", "arrow-right",
  "share", "link", "message-square", "at-sign",
  "paperclip", "reply", "forward",
  "check-circle", "x-circle", "circle", "circle-dot",
  "list", "layout-grid", "map-pin",
  "power", "zap", "terminal", "archive",
  "thumbs-up", "file", "tag",
];

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
      {ALL_NAMES.map((name) => (
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
