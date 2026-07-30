import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  careerReducer,
  createInitialCareerState,
} from "../domain/careerReducer";
import {
  ACTIVE_CAREER_STORAGE_KEY,
  createCareerRepository,
} from "../storage/careerRepository";
import {
  ACTIVE_ARCHIVE_ID_STORAGE_KEY,
} from "../storage/activeArchive";
import {
  ARCHIVE_INDEX_STORAGE_KEY,
} from "../storage/archiveRepository";
import { ACTIVE_CLASSIC_SESSION_STORAGE_KEY } from "../storage/classicSessionRepository";
import { createRandomPlayerSetup } from "../ui/enhanced/randomPlayer";
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

  it("defaults the root route to Enhanced while preserving the Classic override", async () => {
    const defaultRender = render(<App />);

    await waitFor(() => {
      expect(
        document.querySelector('[data-ui-mode="enhanced"]'),
      ).not.toBeNull();
    });
    defaultRender.unmount();

    window.history.replaceState({}, "", "/?ui=classic");
    render(<App />);

    expect(
      document.querySelector('[data-ui-mode="classic"]'),
    ).not.toBeNull();
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
        name: "从这里继续你的足球人生",
      }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "开始新生涯" }),
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

  it("routes an Enhanced career through its timeline and decision rail", async () => {
    window.history.replaceState({}, "", "/?ui=enhanced");
    render(<App />);

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", {
        name: "开始新生涯",
      }),
    );
    await user.click(screen.getByRole("button", { name: "中国" }));
    await user.click(
      screen.getByRole("button", { name: "下一步" }),
    );
    await user.click(
      screen.getByRole("button", { name: "下一步" }),
    );
    await user.click(
      screen.getByRole("button", { name: /^中锋/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "开始踢球" }),
    );

    await waitFor(() => {
      expect(
        document.querySelector("[data-enhanced-career-shell]"),
      ).not.toBeNull();
    });
    expect(
      document.querySelector("[data-enhanced-timeline]"),
    ).not.toBeNull();
    expect(
      document.querySelector("[data-enhanced-decision-rail]"),
    ).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "青训报价" }),
    ).toBeInTheDocument();
    const offers = screen.getAllByRole("button", {
      name: /^加盟 /,
    });
    expect(offers).toHaveLength(3);

    await user.click(offers[0]!);
    expect(
      await screen.findByText("赛季进行中"),
    ).toBeInTheDocument();
  });

  it("keeps an Enhanced resume explicit before restoring setup", async () => {
    window.history.replaceState({}, "", "/?ui=classic");
    const classicRender = render(<App />);
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "开始生涯" }),
    );
    await user.click(screen.getByRole("button", { name: "中国" }));
    await user.click(
      screen.getByRole("button", { name: "下一步" }),
    );
    await waitFor(() => {
      const raw = localStorage.getItem(
        ACTIVE_CAREER_STORAGE_KEY,
      );
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).state.phase).toBe("identity");
    });
    classicRender.unmount();

    window.history.replaceState({}, "", "/?ui=enhanced");
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "从这里继续你的足球人生",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "继续上次生涯",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "姓名" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "继续上次生涯",
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "确认球员身份",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "姓名" }),
    ).toHaveValue("李");
  });

  it("persists and replays a seeded random player after career creation", async () => {
    const seed = "phase-4:random-app";
    const expected = createRandomPlayerSetup(seed);
    const previousSave = careerReducer(
      createInitialCareerState("phase-4:previous-save"),
      { type: "begin_setup" },
    );
    expect(
      createCareerRepository(localStorage).save(previousSave),
    ).toEqual({ ok: true });
    window.history.replaceState(
      {},
      "",
      `/?ui=enhanced&seed=${seed}`,
    );
    const firstRender = render(<App />);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", {
        name: "随机球员",
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "选择场上位置",
      }),
    ).toBeInTheDocument();
    expect(
      document.querySelector(
        `[data-enhanced-position="${expected.position}"]`,
      ),
    ).toHaveAttribute("aria-pressed", "true");

    await waitFor(() => {
      const raw = localStorage.getItem(
        ACTIVE_CAREER_STORAGE_KEY,
      );
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).state.player).toEqual(expected);
    });

    await user.click(
      screen.getByRole("button", { name: "开始踢球" }),
    );
    await waitFor(() => {
      const raw = localStorage.getItem(
        ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      );
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toMatchObject({
        identity: {
          lastName: expected.name,
          nationalityFifaCode: expected.nationality,
          position: expected.position,
          preferredNumber: Number(expected.number),
        },
        mode: "normal",
        seed,
      });
    });

    firstRender.unmount();
    localStorage.clear();
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "随机球员",
      }),
    );
    await waitFor(() => {
      const raw = localStorage.getItem(
        ACTIVE_CAREER_STORAGE_KEY,
      );
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).state.player).toEqual(expected);
    });
  });

  it("automatically archives an Enhanced career and restores it from the library after reload", async () => {
    window.history.replaceState(
      {},
      "",
      "/?ui=enhanced&seed=phase-5%3Aapp-archive",
    );
    const firstRender = render(<App />);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", {
        name: "开始新生涯",
      }),
    );
    await user.click(screen.getByRole("button", { name: "中国" }));
    await user.click(
      screen.getByRole("button", { name: "下一步" }),
    );
    await user.click(
      screen.getByRole("button", { name: "下一步" }),
    );
    await user.click(
      screen.getByRole("button", { name: /^中锋/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "开始踢球" }),
    );

    await waitFor(() => {
      expect(
        localStorage.getItem(ACTIVE_ARCHIVE_ID_STORAGE_KEY),
      ).not.toBeNull();
      expect(
        localStorage.getItem(ARCHIVE_INDEX_STORAGE_KEY),
      ).toContain("李的生涯");
    });

    await user.click(
      screen.getByRole("button", { name: "生涯档案" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "生涯档案",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("李的生涯")).toBeInTheDocument();

    firstRender.unmount();
    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "生涯档案",
      }),
    );
    expect(
      await screen.findByText("李的生涯"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "继续 李的生涯",
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "青训报价",
      }),
    ).toBeInTheDocument();
  });
});
