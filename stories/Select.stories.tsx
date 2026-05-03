import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "../src/ui/components/Select.js";
import { Text } from "../src/ui/components/Text.js";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
};
export default meta;

const OPTIONS = (
  <>
    <option value="">선택하세요</option>
    <option value="1">옵션 1</option>
    <option value="2">옵션 2</option>
    <option value="3">옵션 3</option>
  </>
);

export const All: StoryObj = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "320px" }}>
      <div>
        <Text variant="label" style={{ marginBottom: "0.375rem" }}>기본</Text>
        <Select>{OPTIONS}</Select>
      </div>
      <div>
        <Text variant="label" style={{ marginBottom: "0.375rem" }}>비활성화</Text>
        <Select disabled>{OPTIONS}</Select>
      </div>
    </div>
  ),
};

export const Default: StoryObj<typeof Select> = {
  render: () => <Select style={{ maxWidth: "320px" }}>{OPTIONS}</Select>,
};
export const Disabled: StoryObj<typeof Select> = {
  render: () => <Select disabled style={{ maxWidth: "320px" }}>{OPTIONS}</Select>,
};
