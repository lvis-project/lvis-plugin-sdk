import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "../src/ui/components/Checkbox.js";
import { Text } from "../src/ui/components/Text.js";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
};
export default meta;

export const All: StoryObj = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Checkbox label="체크 안됨" defaultChecked={false} />
      <Checkbox label="체크됨" defaultChecked={true} />
      <Checkbox label="Indeterminate" indeterminate />
      <Checkbox label="비활성화 (꺼짐)" disabled defaultChecked={false} />
      <Checkbox label="비활성화 (켜짐)" disabled defaultChecked={true} />
      <div>
        <Text variant="label" style={{ marginBottom: "0.5rem" }}>레이블 없음</Text>
        <Checkbox defaultChecked={true} />
      </div>
    </div>
  ),
};

export const Unchecked: StoryObj<typeof Checkbox> = { args: { label: "체크 안됨", defaultChecked: false } };
export const Checked: StoryObj<typeof Checkbox> = { args: { label: "체크됨", defaultChecked: true } };
export const Indeterminate: StoryObj<typeof Checkbox> = { args: { label: "Indeterminate", indeterminate: true } };
export const Disabled: StoryObj<typeof Checkbox> = { args: { label: "비활성화", disabled: true, defaultChecked: false } };
