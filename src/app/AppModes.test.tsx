import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ACTIVE_CAREER_STORAGE_KEY } from "../storage/careerRepository";
import { App } from "./App";

describe("UI mode shells", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("isolates the shells while preserving one saved career controller", async () => {
    window.history.replaceState({}, "", "/?ui=classic");
    const classicRender = render(<App />);

    expect(
      document.querySelector('[data-ui-mode="classic"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-ui-mode="enhanced"]'),
    ).toBeNull();
    classicRender.unmount();
    localStorage.clear();

    window.history.replaceState({}, "", "/?ui=enhanced");
    const enhancedRender = render(<App />);

    await waitFor(() => {
      expect(
        document.querySelector('[data-ui-mode="enhanced"]'),
      ).not.toBeNull();
    });
    expect(
      screen.getByRole("heading", {
        name: "足球生涯模拟器",
      }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "开始生涯" }),
    );
    await user.click(screen.getByRole("button", { name: "中国" }));

    await waitFor(() => {
      const raw = localStorage.getItem(
        ACTIVE_CAREER_STORAGE_KEY,
      );
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).state).toMatchObject({
        phase: "nationality",
        player: { nationality: "CHN" },
      });
    });

    enhancedRender.unmount();
    window.history.replaceState({}, "", "/?ui=classic");
    render(<App />);

    expect(
      document.querySelector('[data-ui-mode="classic"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "你是哪国人" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "中国" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
