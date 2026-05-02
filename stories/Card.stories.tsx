import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "../src/ui/components/Card.js";
import { Text } from "../src/ui/components/Text.js";
import { Button } from "../src/ui/components/Button.js";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
};
export default meta;

export const All: StoryObj = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "360px" }}>
      <div>
        <Text variant="label" style={{ marginBottom: "0.5rem" }}>Small padding</Text>
        <Card padding="sm"><Text>Small card content</Text></Card>
      </div>
      <div>
        <Text variant="label" style={{ marginBottom: "0.5rem" }}>Medium padding (default)</Text>
        <Card>
          <Text variant="heading" style={{ marginBottom: "0.5rem" }}>Card title</Text>
          <Text variant="muted">Some description text goes here.</Text>
        </Card>
      </div>
      <div>
        <Text variant="label" style={{ marginBottom: "0.5rem" }}>Large padding</Text>
        <Card padding="lg">
          <Text variant="heading" style={{ marginBottom: "0.75rem" }}>Card with action</Text>
          <Text variant="muted" style={{ marginBottom: "1rem" }}>Cards can contain any content including buttons.</Text>
          <Button variant="primary" size="sm">Action</Button>
        </Card>
      </div>
    </div>
  ),
};

export const Default: StoryObj<typeof Card> = {
  args: { padding: "md" },
  render: (args) => <Card {...args}><Text>Card content</Text></Card>,
};

export const Small: StoryObj<typeof Card> = {
  args: { padding: "sm" },
  render: (args) => <Card {...args}><Text>Compact card</Text></Card>,
};

export const Large: StoryObj<typeof Card> = {
  args: { padding: "lg" },
  render: (args) => <Card {...args}><Text>Spacious card</Text></Card>,
};
