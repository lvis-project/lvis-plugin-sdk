import React, { useEffect } from "react";
import type { Preview } from "@storybook/react";
import "../src/ui/tokens/lvis-tokens.css";

const preview: Preview = {
  decorators: [
    (Story, ctx) => {
      const theme = (ctx.globals.theme as string) ?? "dark";
      useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        return () => { document.documentElement.removeAttribute("data-theme"); };
      }, [theme]);
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
        icon: "circlehollow",
        items: ["dark", "light", "high-contrast"],
        dynamicTitle: true,
      },
    },
  },
};
export default preview;
