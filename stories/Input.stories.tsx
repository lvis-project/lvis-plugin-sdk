import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "../src/ui/components/Input.js";
import { Text } from "../src/ui/components/Text.js";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
};
export default meta;

export const All: StoryObj = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "320px" }}>
      <div>
        <Text variant="label" style={{ marginBottom: "0.375rem" }}>기본</Text>
        <Input placeholder="텍스트를 입력하세요" />
      </div>
      <div>
        <Text variant="label" style={{ marginBottom: "0.375rem" }}>비활성화</Text>
        <Input placeholder="비활성화됨" disabled />
      </div>
      <div>
        <Text variant="label" style={{ marginBottom: "0.375rem" }}>오류 상태</Text>
        <Input placeholder="잘못된 입력" error defaultValue="잘못된 값" />
      </div>
      <div>
        <Text variant="label" style={{ marginBottom: "0.375rem" }}>Password</Text>
        <Input type="password" placeholder="비밀번호" />
      </div>
    </div>
  ),
};

export const Default: StoryObj<typeof Input> = { args: { placeholder: "입력하세요" } };
export const Disabled: StoryObj<typeof Input> = { args: { placeholder: "비활성화", disabled: true } };
export const Error: StoryObj<typeof Input> = { args: { error: true, defaultValue: "잘못된 값" } };
