import type { Meta, StoryObj } from "@storybook/react";
import { Stack, Inline } from "../src/ui/components/Stack.js";
import { Card } from "../src/ui/components/Card.js";
import { Text } from "../src/ui/components/Text.js";
import { Button } from "../src/ui/components/Button.js";
import { Badge } from "../src/ui/components/Badge.js";

const meta: Meta<typeof Stack> = {
  title: "UI/Stack",
  component: Stack,
  argTypes: {
    gap: { control: "select", options: ["xs", "sm", "md", "lg", "xl"] },
    align: { control: "select", options: [undefined, "start", "center", "end", "stretch"] },
    justify: { control: "select", options: [undefined, "start", "center", "end", "between", "around"] },
  },
};
export default meta;
type Story = StoryObj<typeof Stack>;

export const Vertical: Story = {
  args: { gap: "md" },
  render: (args) => (
    <Stack {...args} style={{ width: "20rem" }}>
      <Text variant="heading">Stack — vertical</Text>
      <Text variant="muted">기본 layout primitive — `flex-direction: column` + gap.</Text>
      <Inline gap="sm">
        <Button size="sm">확인</Button>
        <Button size="sm" variant="secondary">취소</Button>
      </Inline>
    </Stack>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <Inline gap="sm" align="center">
      <Badge variant="success">활성</Badge>
      <Badge variant="warning">대기</Badge>
      <Badge variant="danger">오류</Badge>
      <Badge>중립</Badge>
    </Inline>
  ),
};

export const HorizontalWrap: Story = {
  render: () => (
    <div style={{ width: "16rem", border: "1px dashed var(--lvis-border)", padding: "0.5rem" }}>
      <Inline gap="xs" wrap>
        {Array.from({ length: 8 }, (_, i) => (
          <Badge key={i} variant={i % 2 === 0 ? "success" : "warning"}>
            tag-{i + 1}
          </Badge>
        ))}
      </Inline>
    </div>
  ),
};

export const JustifyBetween: Story = {
  render: () => (
    <Card>
      <Inline justify="between" align="center" style={{ width: "100%" }}>
        <Text variant="heading">설정</Text>
        <Inline gap="sm">
          <Button size="sm" variant="ghost">초기화</Button>
          <Button size="sm">저장</Button>
        </Inline>
      </Inline>
    </Card>
  ),
};

export const NestedComposition: Story = {
  name: "Nested (vertical + horizontal)",
  render: () => (
    <Card>
      <Stack gap="lg">
        <Inline justify="between" align="center" style={{ width: "100%" }}>
          <Text variant="heading">플러그인 권한</Text>
          <Badge variant="success">최신</Badge>
        </Inline>
        <Stack gap="sm">
          <Text variant="label">읽기 권한</Text>
          <Inline gap="xs" wrap>
            <Badge>이메일</Badge>
            <Badge>캘린더</Badge>
            <Badge>파일</Badge>
          </Inline>
        </Stack>
        <Stack gap="sm">
          <Text variant="label">쓰기 권한</Text>
          <Inline gap="xs" wrap>
            <Badge variant="warning">알림</Badge>
          </Inline>
        </Stack>
        <Inline gap="sm" justify="end" style={{ width: "100%" }}>
          <Button variant="ghost" size="sm">취소</Button>
          <Button size="sm">적용</Button>
        </Inline>
      </Stack>
    </Card>
  ),
};

export const GapScale: Story = {
  name: "Gap scale (xs / sm / md / lg / xl)",
  render: () => (
    <Stack gap="lg">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((g) => (
        <Stack key={g} gap="xs">
          <Text variant="label">gap = {g}</Text>
          <Inline gap={g}>
            <Badge>1</Badge>
            <Badge>2</Badge>
            <Badge>3</Badge>
            <Badge>4</Badge>
          </Inline>
        </Stack>
      ))}
    </Stack>
  ),
};
