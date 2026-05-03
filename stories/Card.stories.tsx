import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "../src/ui/components/Card.js";
import { Text } from "../src/ui/components/Text.js";
import { Button } from "../src/ui/components/Button.js";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  argTypes: {
    padding: { control: "select", options: ["sm", "md", "lg"] },
  },
};
export default meta;

export const All: Story = {
  render: () => (
    <Card>
      <Text variant="heading">플러그인 설치 확인</Text>
      <Text variant="muted" style={{ margin: "0.5rem 0 1rem" }}>
        이 플러그인을 설치하시겠습니까?
      </Text>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button variant="primary" size="sm">설치</Button>
        <Button variant="secondary" size="sm">취소</Button>
      </div>
    </Card>
  ),
};

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Text variant="heading">회의 요약</Text>
        <Text variant="muted" style={{ marginTop: "0.5rem" }}>오늘 진행된 스프린트 회의에서 세 가지 액션 아이템이 도출되었습니다.</Text>
      </>
    ),
  },
};

export const SmallPadding: Story = {
  args: {
    padding: "sm",
    children: <Text>소형 패딩 카드</Text>,
  },
};

export const LargePadding: Story = {
  args: {
    padding: "lg",
    children: (
      <>
        <Text variant="heading">대형 패딩</Text>
        <Text variant="muted" style={{ marginTop: "0.5rem" }}>여백이 넓은 카드입니다.</Text>
        <div style={{ marginTop: "1rem" }}>
          <Button size="sm">확인</Button>
        </div>
      </>
    ),
  },
};
