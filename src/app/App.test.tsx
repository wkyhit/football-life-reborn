import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
} from "../domain/classicEngine";
import {
  ACTIVE_CAREER_STORAGE_KEY,
  CAREER_QUARANTINE_PREFIX,
} from "../storage/careerRepository";
import {
  ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
  createClassicSessionRepository,
} from "../storage/classicSessionRepository";
import {
  ECONOMY_MIGRATION_BACKUP_KEY,
  ECONOMY_MIGRATION_RECEIPT_KEY,
} from "../storage/migrations/migrations";
import { App } from "./App";
import { seedFromSearch } from "./seed";

describe("Classic navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/?ui=classic");
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
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
    expect(screen.getByText("#9 中锋")).toBeInTheDocument();
    expect(screen.getByText("自由身")).toBeInTheDocument();
    const header = document.querySelector<HTMLElement>(
      "[data-classic-career-header]",
    );
    expect(header).not.toBeNull();
    expect(within(header!).getByText("16")).toBeInTheDocument();

    const academyOptions = screen.getAllByRole("button", {
      name: /^加盟 /,
    });
    expect(academyOptions).toHaveLength(3);
    await user.click(academyOptions[0]!);

    expect(
      screen.getByText("赛季进行中…"),
    ).toBeInTheDocument();

    await waitFor(
      () => {
        expect(
          document.querySelectorAll(
            "[data-classic-career-panel] button",
          ),
        ).not.toHaveLength(0);
      },
      { timeout: 4_000 },
    );

    const raw = localStorage.getItem(
      ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
    );
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({
      identity: {
        lastName: "林一鸣",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      profile: { preferredFoot: "left" },
      seed: "phase-1-default",
    });
    expect(raw).not.toContain('"state"');
    expect(raw).not.toContain('"seasons"');
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

  it("commits one Enhanced transition when a stale option receives repeated activation", async () => {
    window.history.replaceState({}, "", "/?ui=enhanced");
    const initial = startClassicCareer({
      identity: {
        lastName: "事务",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "issue-23:choice-transaction",
    });
    const repository = createClassicSessionRepository(
      window.localStorage,
    );
    expect(repository.save(initial)).toEqual({ ok: true });
    const user = userEvent.setup();

    render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "继续上次生涯",
      }),
    );
    const option = (
      await screen.findAllByRole("button", {
        name: /^加盟 /,
      })
    )[0]!;

    act(() => {
      option.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          detail: 1,
        }),
      );
      option.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          detail: 2,
        }),
      );
    });

    expect(
      screen.getByText(/已选择：/),
    ).toBeInTheDocument();
    expect(screen.getByText("赛季进行中")).toBeInTheDocument();
    await waitFor(() => {
      const loaded = repository.load();

      expect(loaded.status).toBe("ready");

      if (loaded.status === "ready") {
        expect(loaded.state.choiceLog).toHaveLength(1);
      }
    });
  });

  it("migrates a valid v1 Classic session before resuming it and retains the rollback source", () => {
    const initial = startClassicCareer({
      identity: {
        lastName: "旧档",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: "economy-migration:app",
    });
    const decision = initial.currentDecision!;
    const career = applyClassicChoice(initial, {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: decision.options[0]!.id,
    });
    const legacyRaw = JSON.stringify({
      choiceLog: career.choiceLog,
      contentVersion: career.contentVersion,
      identity: career.identity,
      mode: career.mode,
      schemaVersion: 1,
      seed: career.seed,
    });
    localStorage.setItem(
      LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      legacyRaw,
    );

    render(<App />);

    expect(
      screen.getByText("#9 中锋"),
    ).toBeInTheDocument();
    expect(
      JSON.parse(
        localStorage.getItem(
          ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
        )!,
      ),
    ).toMatchObject({
      economyPolicyVersion:
        "2026-07-31-economy-v1",
      schemaVersion: 3,
    });
    expect(
      localStorage.getItem(
        LEGACY_ACTIVE_CLASSIC_SESSION_STORAGE_KEY,
      ),
    ).toBe(legacyRaw);
    expect(
      localStorage.getItem(ECONOMY_MIGRATION_BACKUP_KEY),
    ).toContain(JSON.stringify(legacyRaw));
    expect(
      localStorage.getItem(ECONOMY_MIGRATION_RECEIPT_KEY),
    ).not.toBeNull();
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
