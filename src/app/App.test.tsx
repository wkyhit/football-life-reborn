import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ACTIVE_CAREER_STORAGE_KEY,
  CAREER_QUARANTINE_PREFIX,
} from "../storage/careerRepository";
import { App } from "./App";
import { seedFromSearch } from "./seed";

describe("Phase 1 Classic navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("uses the seed query as the reproducibility input", () => {
    expect(seedFromSearch("?seed=%20career-42%20")).toBe("career-42");
    expect(seedFromSearch("")).toBe("phase-1-default");
    expect(seedFromSearch("?seed=")).toBe("phase-1-default");
  });

  it("lets a player create a Chinese striker and play the first period", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "足球生涯模拟器" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "开始生涯" }));

    expect(
      screen.getByRole("heading", { name: "你是哪国人" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "中国" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(
      screen.getByRole("heading", { name: "填一下名字" }),
    ).toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: "姓名" }));
    await user.type(screen.getByRole("textbox", { name: "姓名" }), "林一鸣");
    await user.clear(screen.getByLabelText("号码"));
    await user.type(screen.getByLabelText("号码"), "9");
    await user.click(screen.getByRole("button", { name: "左脚" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));

    expect(
      screen.getByRole("heading", { name: "踢哪个位置" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "中锋" }));
    await user.click(screen.getByRole("button", { name: "开始踢球" }));

    expect(
      screen.getByRole("heading", { name: "青训报价" }),
    ).toBeInTheDocument();
    expect(screen.getByText("林一鸣")).toBeInTheDocument();
    expect(screen.getByText("#9 中锋")).toBeInTheDocument();
    expect(screen.getByText("16 岁")).toBeInTheDocument();
    expect(screen.getByText("自由身")).toBeInTheDocument();

    const academyOptions = screen.getAllByRole("button", {
      name: /^加盟 /,
    });
    expect(academyOptions).toHaveLength(3);
    await user.click(academyOptions[0]!);

    expect(
      screen.getByRole("heading", { name: "两赛季小结" }),
    ).toBeInTheDocument();
    expect(screen.getByText("18 岁")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "继续生涯" }));

    expect(
      screen.getByRole("heading", { name: "额外训练" }),
    ).toBeInTheDocument();
  });

  it("resumes the exact identity form after the app reloads", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await user.click(screen.getByRole("button", { name: "开始生涯" }));
    await user.click(screen.getByRole("button", { name: "中国" }));
    await user.click(screen.getByRole("button", { name: "下一步" }));
    await user.clear(screen.getByRole("textbox", { name: "姓名" }));
    await user.type(
      screen.getByRole("textbox", { name: "姓名" }),
      "林一鸣",
    );
    await user.click(screen.getByRole("button", { name: "左脚" }));

    await waitFor(() => {
      const raw = localStorage.getItem(ACTIVE_CAREER_STORAGE_KEY);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).state).toMatchObject({
        phase: "identity",
        player: {
          foot: "left",
          name: "林一鸣",
        },
      });
    });

    firstRender.unmount();
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "填一下名字" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "姓名" })).toHaveValue(
      "林一鸣",
    );
    expect(screen.getByRole("button", { name: "左脚" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps corrupt data quarantined while offering a new career", async () => {
    const user = userEvent.setup();
    const corruptRaw = '{"schemaVersion":1,"state":';
    localStorage.setItem(ACTIVE_CAREER_STORAGE_KEY, corruptRaw);

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "本地存档需要处理" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(ACTIVE_CAREER_STORAGE_KEY)).toBe(
      corruptRaw,
    );

    const quarantinedKey = Array.from(
      { length: localStorage.length },
      (_, index) => localStorage.key(index),
    ).find((key) => key?.startsWith(CAREER_QUARANTINE_PREFIX));

    expect(quarantinedKey).toBeDefined();
    expect(localStorage.getItem(quarantinedKey!)).toBe(corruptRaw);

    await user.click(
      screen.getByRole("button", { name: "开始新生涯" }),
    );

    expect(
      screen.getByRole("heading", { name: "足球生涯模拟器" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(localStorage.getItem(ACTIVE_CAREER_STORAGE_KEY)).not.toBe(
        corruptRaw,
      );
    });
    expect(localStorage.getItem(quarantinedKey!)).toBe(corruptRaw);
  });
});
