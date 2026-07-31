import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SetupProgress } from "./SetupProgress";

describe("Classic setup progress", () => {
  it("announces its value and keeps future steps readable", () => {
    render(<SetupProgress current={2} />);

    expect(
      screen.getByRole("progressbar", {
        name: "建档进度：第 2 步，共 3 步",
      }),
    ).toHaveAttribute("aria-valuemax", "3");
    expect(
      screen.getByRole("progressbar", {
        name: "建档进度：第 2 步，共 3 步",
      }),
    ).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByText("位置")).toHaveClass("text-muted");
  });
});
