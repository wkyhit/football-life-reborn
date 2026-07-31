import {
  useRef,
  useState,
} from "react";
import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Dialog } from "./Dialog";

describe("Dialog", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it.each(["classic", "enhanced"] as const)(
    "contains keyboard focus, closes with Escape, and returns focus in %s",
    async (variant) => {
      render(<DialogHarness variant={variant} />);
      const user = userEvent.setup();
      const trigger = screen.getByRole("button", {
        name: "打开分享",
      });

      await user.click(trigger);

      expect(
        screen.getByRole("dialog", { name: "分享生涯" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: "卡上名字" }),
      ).toHaveFocus();
      expect(document.body.style.overflow).toBe("hidden");

      await user.keyboard("{Shift>}{Tab}{/Shift}");
      expect(
        screen.getByRole("button", {
          name: "下载图片",
        }),
      ).toHaveFocus();

      await user.tab();
      expect(
        screen.getByRole("textbox", { name: "卡上名字" }),
      ).toHaveFocus();

      await user.keyboard("{Escape}");
      expect(
        screen.queryByRole("dialog"),
      ).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      expect(document.body.style.overflow).toBe("");
    },
  );
});

function DialogHarness({
  variant,
}: {
  readonly variant: "classic" | "enhanced";
}) {
  const [open, setOpen] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        打开分享
      </button>
      {open ? (
        <Dialog
          labelledBy="dialog-title"
          initialFocusRef={initialFocusRef}
          onClose={() => setOpen(false)}
          variant={variant}
        >
          <h2 id="dialog-title">分享生涯</h2>
          <label>
            卡上名字
            <input ref={initialFocusRef} />
          </label>
          <button onClick={() => setOpen(false)} type="button">
            关闭
          </button>
          <button type="button">下载图片</button>
        </Dialog>
      ) : null}
    </>
  );
}
