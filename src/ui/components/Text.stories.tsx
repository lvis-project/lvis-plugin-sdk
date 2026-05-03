import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "./Text.js";

const meta: Meta<typeof Text> = {
  title: "UI/Text",
  component: Text,
  argTypes: {
    variant: { control: "select", options: ["body", "muted", "label", "heading"] },
    as: { control: "select", options: ["p", "span", "div", "h1", "h2", "h3"] },
  },
};
export default meta;
type Story = StoryObj<typeof Text>;

export const Body: Story = {
  args: { variant: "body", children: "본문 텍스트입니다. 일반적인 설명이나 내용에 사용합니다." },
};

export const Muted: Story = {
  args: { variant: "muted", children: "보조 텍스트입니다. 부가 설명이나 힌트에 사용합니다." },
};

export const Label: Story = {
  args: { variant: "label", children: "섹션 레이블" },
};

export const Heading: Story = {
  args: { variant: "heading", children: "카드 제목" },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Text variant="heading">회의 요약</Text>
      <Text variant="label" as="span">참석자</Text>
      <Text variant="body">김민준, 이지영, 박서연 외 4명이 참석하였습니다.</Text>
      <Text variant="muted">2026년 5월 3일 오전 10:00 — 오전 11:00</Text>
    </div>
  ),
};
