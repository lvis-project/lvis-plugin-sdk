import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Stack, Inline } from "../components/Stack.js";

describe("Stack", () => {
  it("defaults to vertical with gap='md'", () => {
    const { container } = render(<Stack>x</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("lvis-stack");
    expect(el.className).toContain("lvis-stack-vertical");
    expect(el.className).toContain("lvis-stack-gap-md");
  });

  it("emits align/justify classes only when set", () => {
    const { container } = render(<Stack align="center" justify="between">x</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("lvis-stack-align-center");
    expect(el.className).toContain("lvis-stack-justify-between");
  });

  it("preserves user className alongside computed classes", () => {
    const { container } = render(<Stack className="my-extra">x</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("my-extra");
    expect(el.className).toContain("lvis-stack");
  });

  it("renders as the requested element via `as`", () => {
    const { container } = render(<Stack as="section">x</Stack>);
    expect(container.firstChild?.nodeName).toBe("SECTION");
  });

  it("forwards extra HTML attributes", () => {
    const { container } = render(<Stack data-testid="root" aria-label="zone">x</Stack>);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("data-testid")).toBe("root");
    expect(el.getAttribute("aria-label")).toBe("zone");
  });
});

describe("Inline", () => {
  it("defaults to horizontal with gap='sm', no wrap", () => {
    const { container } = render(<Inline>x</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("lvis-stack-horizontal");
    expect(el.className).toContain("lvis-stack-gap-sm");
    expect(el.className).not.toContain("lvis-stack-wrap");
  });

  it("wrap=true appends lvis-stack-wrap", () => {
    const { container } = render(<Inline wrap>x</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("lvis-stack-wrap");
  });

  it("does NOT inherit Stack's vertical default — surfaces the API distinction", () => {
    const { container } = render(<Inline>x</Inline>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain("lvis-stack-vertical");
  });
});
