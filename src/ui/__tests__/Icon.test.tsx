import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Icon, ICON_NAMES } from "../components/Icon.js";

afterEach(() => {
  cleanup();
});

describe("Icon", () => {
  it("renders an SVG for a known name", () => {
    const { container } = render(<Icon name="folder" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("default size is 16x16", () => {
    const { container } = render(<Icon name="search" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
  });

  it("size prop is forwarded to width and height", () => {
    const { container } = render(<Icon name="search" size={32} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
  });

  it("defaults to aria-hidden when no aria-label is provided", () => {
    const { container } = render(<Icon name="trash" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("aria-label removes the implicit aria-hidden (attribute is omitted, not 'false')", () => {
    const { container } = render(<Icon name="trash" aria-label="삭제" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("삭제");
    expect(svg?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("explicit aria-hidden=false overrides the default", () => {
    const { container } = render(<Icon name="folder" aria-hidden={false} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("false");
  });

  it("aria-label + explicit aria-hidden=false coexist (defensive caller pattern)", () => {
    const { container } = render(
      <Icon name="trash" aria-label="삭제" aria-hidden={false} />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("삭제");
    expect(svg?.getAttribute("aria-hidden")).toBe("false");
  });

  it("forwards SVG attributes (className, style)", () => {
    const { container } = render(
      <Icon name="folder" className="my-icon" style={{ color: "red" }} />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("my-icon");
    expect(svg?.getAttribute("style")).toContain("color");
  });

  it("applies the lvis-icon class by default for theme-aware color", () => {
    const { container } = render(<Icon name="folder" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("lvis-icon");
  });

  it("merges lvis-icon with consumer className (consumer's selectors retain specificity)", () => {
    const { container } = render(<Icon name="folder" className="my-icon" />);
    const svg = container.querySelector("svg");
    const cls = svg?.getAttribute("class") ?? "";
    expect(cls).toContain("lvis-icon");
    expect(cls).toContain("my-icon");
  });

  it.each(ICON_NAMES)(
    "every registered name resolves to a renderable lucide component: %s",
    (name) => {
      const { container } = render(<Icon name={name} />);
      // Forward-compat guard against lucide-react export renames — if a
      // future minor bump removes a re-export we reference, the import
      // would surface as `undefined` here and React's `Element type is
      // invalid` error would fire during render.
      expect(container.querySelector("svg")).not.toBeNull();
    },
  );
});
