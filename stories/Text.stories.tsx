import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "../src/ui/components/Text.js";

const meta: Meta<typeof Text> = {
  title: "UI/Text",
  component: Text,
  args: { children: "텍스트 예시" },
};
export default meta;

export const All: StoryObj = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Text variant="heading">Heading — 제목 텍스트</Text>
      <Text variant="body">Body — 본문 텍스트입니다. 일반 내용을 표시할 때 사용합니다.</Text>
      <Text variant="muted">Muted — 보조 설명이나 부연 정보에 사용합니다.</Text>
      <Text variant="label">Label — 섹션 레이블</Text>
    </div>
  ),
};

export const Heading: StoryObj<typeof Text> = { args: { variant: "heading", children: "섹션 제목" } };
export const Body: StoryObj<typeof Text> = { args: { variant: "body", children: "본문 텍스트입니다." } };
export const Muted: StoryObj<typeof Text> = { args: { variant: "muted", children: "보조 설명 텍스트" } };
export const Label: StoryObj<typeof Text> = { args: { variant: "label", children: "레이블" } };

export const AsSpan: StoryObj<typeof Text> = {
  args: { variant: "body", as: "span", children: "인라인 span 텍스트" },
};
