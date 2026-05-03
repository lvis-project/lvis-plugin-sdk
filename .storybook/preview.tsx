import React, { useEffect } from "react";
import type { Preview } from "@storybook/react";
import "../src/ui/tokens/lvis-tokens.css";

const preview: Preview = {
  decorators: [
    (Story, ctx) => {
      const theme = (ctx.globals.theme as string) ?? "dark";
      const chatTheme = (ctx.globals.chatTheme as string) ?? "purple";
      useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        if (chatTheme === "default") {
          document.documentElement.removeAttribute("data-chat-theme");
        } else {
          document.documentElement.setAttribute("data-chat-theme", chatTheme);
        }
      }, [theme, chatTheme]);
      return (
        <div style={{ padding: "1.5rem", background: "var(--lvis-bg)", minHeight: "100vh" }}>
          <Story />
        </div>
      );
    },
  ],
  globalTypes: {
    theme: {
      name: "Theme",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        items: [
          { value: "dark", title: "Dark", icon: "moon" },
          { value: "light", title: "Light", icon: "sun" },
          { value: "high-contrast", title: "High Contrast", icon: "accessibility" },
        ],
        dynamicTitle: true,
      },
    },
    chatTheme: {
      name: "Accent",
      defaultValue: "purple",
      toolbar: {
        title: "Accent",
        items: [
          { value: "default", title: "Default", icon: "circle" },
          { value: "purple", title: "Purple", icon: "star" },
          { value: "orange", title: "Orange", icon: "starhollow" },
          { value: "blue", title: "Blue", icon: "diamond" },
        ],
        dynamicTitle: true,
      },
    },
  },
};
export default preview;
