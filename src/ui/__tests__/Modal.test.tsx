import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";

type ModalModule = typeof import("../components/Modal.js");
let Modal: ModalModule["Modal"];

beforeEach(async () => {
  document.body.style.overflow = "";
  document.head.querySelectorAll("style[id]").forEach((el) => el.remove());
  // Reset module-level `_scrollLockCount` / `_scrollLockOriginal` between
  // tests. Without this, a test that renders without unmounting (or
  // throws mid-render) leaks a non-zero count into the next test, which
  // would then skip the original-overflow capture and never restore.
  vi.resetModules();
  ({ Modal } = await import("../components/Modal.js"));
});

afterEach(() => {
  cleanup();
});

describe("Modal", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(<Modal open={false} onClose={() => {}} title="x" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog with role + aria-modal when open", () => {
    const { getByRole } = render(<Modal open onClose={() => {}} title="hello" />);
    const dialog = getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("links aria-labelledby when title is a string", () => {
    const { getByRole } = render(<Modal open onClose={() => {}} title="My Title" />);
    const dialog = getByRole("dialog");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    const heading = document.getElementById(labelId!);
    expect(heading?.textContent).toBe("My Title");
  });

  it("uses ariaLabel when title is a ReactNode", () => {
    const { getByRole } = render(
      <Modal open onClose={() => {}} title={<span>icon</span>} ariaLabel="dialog name" />,
    );
    const dialog = getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("dialog name");
    expect(dialog.getAttribute("aria-labelledby")).toBeNull();
  });

  it("uses default aria-label when ReactNode title has no ariaLabel", () => {
    const { getByRole } = render(
      <Modal open onClose={() => {}} title={<span aria-hidden="true">!</span>}>
        content
      </Modal>,
    );
    expect(getByRole("dialog").getAttribute("aria-label")).toBe("Dialog");
  });

  it("uses ariaLabel when string title is empty or whitespace-only", () => {
    const { getByRole, queryByRole } = render(
      <Modal open onClose={() => {}} title="   " ariaLabel="explicit dialog">
        content
      </Modal>,
    );
    const dialog = getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("explicit dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBeNull();
    expect(queryByRole("heading")).toBeNull();
  });

  it("uses ariaLabel when no title is provided", () => {
    const { getByRole } = render(
      <Modal open onClose={() => {}} ariaLabel="untitled dialog">
        content
      </Modal>,
    );
    expect(getByRole("dialog").getAttribute("aria-label")).toBe("untitled dialog");
  });

  it("keeps an accessible default name when no title or ariaLabel is provided", () => {
    const { getByRole } = render(
      <Modal open onClose={() => {}}>
        content
      </Modal>,
    );
    expect(getByRole("dialog").getAttribute("aria-label")).toBe("Dialog");
  });

  it("Esc key triggers onClose", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="x" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Esc key only closes the topmost dismissible Modal", () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    const outer = render(<Modal open onClose={outerClose} title="outer" />);
    const inner = render(<Modal open onClose={innerClose} title="inner" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(innerClose).toHaveBeenCalledOnce();
    expect(outerClose).not.toHaveBeenCalled();
    inner.rerender(<Modal open={false} onClose={innerClose} title="inner" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(outerClose).toHaveBeenCalledOnce();
    outer.rerender(<Modal open={false} onClose={outerClose} title="outer" />);
  });

  it("overlay click triggers onClose; inner click does not", () => {
    const onClose = vi.fn();
    const { getByTestId, getByRole } = render(
      <Modal open onClose={onClose} title="x" testId="ov" />,
    );
    fireEvent.click(getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(getByTestId("ov"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("disableDismiss=true ignores Esc and overlay click", () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <Modal open onClose={onClose} title="x" testId="ov" disableDismiss />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(getByTestId("ov"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks body scroll while open and restores on close", () => {
    document.body.style.overflow = "scroll";
    const { rerender } = render(<Modal open onClose={() => {}} title="x" />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Modal open={false} onClose={() => {}} title="x" />);
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("nested Modal scroll lock — inner stays locked when outer closes first", () => {
    document.body.style.overflow = "auto";
    const outer = render(<Modal open onClose={() => {}} title="outer" />);
    const inner = render(<Modal open onClose={() => {}} title="inner" testId="inner" />);
    expect(document.body.style.overflow).toBe("hidden");
    outer.rerender(<Modal open={false} onClose={() => {}} title="outer" />);
    expect(document.body.style.overflow).toBe("hidden");
    inner.rerender(<Modal open={false} onClose={() => {}} title="inner" testId="inner" />);
    expect(document.body.style.overflow).toBe("auto");
  });

  it("renders footer slot when provided", () => {
    const { getByText } = render(
      <Modal open onClose={() => {}} title="x" footer={<button>OK</button>} />,
    );
    expect(getByText("OK").tagName).toBe("BUTTON");
  });

  it("size prop emits correct class", () => {
    const { container } = render(<Modal open onClose={() => {}} title="x" size="lg" />);
    const dialog = container.querySelector(".lvis-modal");
    expect(dialog?.className).toContain("lvis-modal-lg");
  });

  it("does not register Esc handler when closed", () => {
    const onClose = vi.fn();
    render(<Modal open={false} onClose={onClose} title="x" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
