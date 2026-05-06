import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Icon } from "../components/Icon.js";

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

  it("aria-label removes the implicit aria-hidden", () => {
    const { container } = render(<Icon name="trash" aria-label="삭제" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("삭제");
    expect(svg?.getAttribute("aria-hidden")).not.toBe("true");
  });

  it("explicit aria-hidden overrides the default", () => {
    const { container } = render(<Icon name="folder" aria-hidden={false} />);
    const svg = container.querySelector("svg");
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

  it("covers the 10 names migrated from local-indexer", () => {
    const localIndexerNames = [
      "search",
      "folder",
      "document",
      "refresh",
      "play",
      "stop",
      "plus",
      "trash",
      "empty",
      "spark",
    ] as const;
    for (const name of localIndexerNames) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });
});
