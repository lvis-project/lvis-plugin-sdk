import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Toggle } from "../src/ui/components/Toggle.js";
import { Text } from "../src/ui/components/Text.js";

const meta: Meta<typeof Toggle> = {
  title: "UI/Toggle",
  component: Toggle,
};
export default meta;

export const All: StoryObj = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <Toggle label="알림 허용" defaultChecked={false} />
      <Toggle label="켜진 상태" defaultChecked={true} />
      <Toggle label="비활성화 (꺼짐)" disabled defaultChecked={false} />
      <Toggle label="비활성화 (켜짐)" disabled defaultChecked={true} />
      <div>
        <Text variant="label" style={{ marginBottom: "0.5rem" }}>레이블 없음</Text>
        <Toggle defaultChecked={true} />
      </div>
    </div>
  ),
};

export const Off: StoryObj<typeof Toggle> = { args: { label: "알림 허용", defaultChecked: false } };
export const On: StoryObj<typeof Toggle> = { args: { label: "알림 허용", defaultChecked: true } };
export const Disabled: StoryObj<typeof Toggle> = { args: { label: "비활성화", disabled: true, defaultChecked: false } };
