import type { StorybookConfig } from "@storybook/react-vite";
export default {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-toolbars"],
  framework: { name: "@storybook/react-vite", options: {} },
} satisfies StorybookConfig;
