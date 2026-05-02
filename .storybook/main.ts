import type { StorybookConfig } from "@storybook/react-vite";
export default {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-themes"],
  framework: { name: "@storybook/react-vite", options: {} },
} satisfies StorybookConfig;
