import {
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  careerReducer,
  createInitialCareerState,
} from "../../domain/careerReducer";
import { CLASSIC_CATALOG } from "../../domain/catalog/classicCatalog";
import { nationalCallUpThreshold } from "../../domain/nationalTeam";
import { POSITION_ROLE_GROUPS } from "../../domain/role";
import { CAREER_POSITION_PRESENTATIONS } from "../shared/positionPresentation";
import { EnhancedOnboarding } from "./EnhancedOnboarding";
import { createRandomPlayerSetup } from "./randomPlayer";

describe("Enhanced onboarding", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("derives one valid random setup deterministically from the career seed", () => {
    const first = createRandomPlayerSetup(
      "phase-4:random-player",
    );
    const replay = createRandomPlayerSetup(
      "phase-4:random-player",
    );
    const parallel = createRandomPlayerSetup(
      "phase-4:parallel-player",
    );

    expect(replay).toEqual(first);
    expect(parallel).not.toEqual(first);
    expect(
      CLASSIC_CATALOG.countryByFifaCode.has(
        first.nationality,
      ),
    ).toBe(true);
    expect(
      Object.values(POSITION_ROLE_GROUPS)
        .flat()
        .includes(first.position),
    ).toBe(true);
    expect(first.name).toMatch(/^新星·/);
    expect(first.name.length).toBeLessThanOrEqual(8);
    expect(Number(first.number)).toBeGreaterThanOrEqual(1);
    expect(Number(first.number)).toBeLessThanOrEqual(99);
  });

  it("discovers all countries through continent, global search, recent, and empty states", async () => {
    const dispatch = vi.fn();
    const state = careerReducer(
      createInitialCareerState("phase-4:country-discovery"),
      { type: "begin_setup" },
    );

    render(
      <EnhancedOnboarding
        dispatch={dispatch}
        hasResume={false}
        isEntryPrompt={false}
        newCareerSeed="phase-4:country-discovery"
        onBegin={() => undefined}
        onRandom={() => undefined}
        onResume={() => undefined}
        onStart={() => undefined}
        state={state}
      />,
    );

    expect(
      document.querySelectorAll("[data-enhanced-country]"),
    ).toHaveLength(61);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /^亚洲/ }),
    );
    expect(
      screen.getByRole("button", { name: /^亚洲/ }),
    ).toHaveTextContent("当前");
    const regionalCountries = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-enhanced-country]",
      ),
    );
    expect(regionalCountries.length).toBeGreaterThan(0);
    expect(regionalCountries.length).toBeLessThan(61);
    expect(
      regionalCountries.every(
        (country) =>
          country.dataset.countryConfederation === "AFC",
      ),
    ).toBe(true);

    await user.type(
      screen.getByRole("searchbox", { name: "搜索国家" }),
      "Brazil",
    );
    expect(
      screen.getByRole("button", { name: "巴西" }),
    ).toBeInTheDocument();

    await user.clear(
      screen.getByRole("searchbox", { name: "搜索国家" }),
    );
    await user.click(
      screen.getByRole("button", { name: /^全部/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "中国" }),
    );

    expect(dispatch).toHaveBeenCalledWith({
      nationality: "CHN",
      type: "select_nationality",
    });
    expect(
      within(
        screen.getByRole("region", {
          name: "最近选择",
        }),
      ).getByRole("button", { name: "中国" }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: "搜索国家" }),
      "不存在的国家",
    );
    expect(
      screen.getByText("没有匹配的国家"),
    ).toBeInTheDocument();
  });

  it("shows each national-team call-up threshold from the shared domain rule", () => {
    const state = careerReducer(
      createInitialCareerState("issue-18:national-threshold"),
      { type: "begin_setup" },
    );
    const china =
      CLASSIC_CATALOG.countryByFifaCode.get("CHN")!;
    const brazil =
      CLASSIC_CATALOG.countryByFifaCode.get("BRA")!;

    render(
      <EnhancedOnboarding
        dispatch={vi.fn()}
        hasResume={false}
        isEntryPrompt={false}
        newCareerSeed="issue-18:national-threshold"
        onBegin={() => undefined}
        onRandom={() => undefined}
        onResume={() => undefined}
        onStart={() => undefined}
        state={state}
      />,
    );

    for (const country of [china, brazil]) {
      const threshold = nationalCallUpThreshold(
        country.internationalReputation,
      );
      const button = screen.getByRole("button", {
        name: country.nameZh,
      });
      expect(button).toHaveAccessibleDescription(
        `国家队征召：OVR ≥ ${threshold}`,
      );

      expect(
        within(button).getByText(
          `国家队征召：OVR ≥ ${threshold}`,
        ),
      ).toBeVisible();
    }
  });

  it("places all shared positions on a keyboard-selectable football pitch", async () => {
    const dispatch = vi.fn();
    const state = positionSetupState();

    render(
      <EnhancedOnboarding
        dispatch={dispatch}
        hasResume={false}
        isEntryPrompt={false}
        newCareerSeed="issue-18:position-pitch"
        onBegin={() => undefined}
        onRandom={() => undefined}
        onResume={() => undefined}
        onStart={() => undefined}
        state={state}
      />,
    );

    const pitch = screen.getByRole("group", {
      name: "足球场位置",
    });
    const positionButtons = within(pitch).getAllByRole(
      "button",
    );

    expect(
      positionButtons.map(
        (button) => button.dataset.enhancedPosition,
      ),
    ).toEqual(
      CAREER_POSITION_PRESENTATIONS.map(
        ({ code }) => code,
      ),
    );

    for (const [index, presentation] of
      CAREER_POSITION_PRESENTATIONS.entries()) {
      expect(positionButtons[index]).toHaveClass("size-14");
      expect(positionButtons[index]).toHaveStyle({
        left: presentation.x,
        top: presentation.y,
      });
    }

    const goalkeeper = within(pitch).getByRole("button", {
      name: /门将.*GK/,
    });
    goalkeeper.focus();
    expect(goalkeeper).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(dispatch).toHaveBeenCalledWith({
      position: "GK",
      type: "select_position",
    });
  });

  it("offers explicit resume, new, and seeded random entry paths with one pace", async () => {
    const onBegin = vi.fn();
    const onRandom = vi.fn();
    const onResume = vi.fn();

    render(
      <EnhancedOnboarding
        dispatch={vi.fn()}
        hasResume
        isEntryPrompt
        newCareerSeed="phase-4:entry-actions"
        onBegin={onBegin}
        onRandom={onRandom}
        onResume={onResume}
        onStart={() => undefined}
        state={createInitialCareerState(
          "phase-4:entry-actions",
        )}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "从这里继续你的足球人生",
      }),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "继续上次生涯" }),
    );
    expect(onResume).toHaveBeenCalledOnce();

    await user.click(
      screen.getByRole("button", { name: "速通" }),
    );
    expect(
      screen.getByRole("button", { name: "速通" }),
    ).toHaveTextContent("已选择");
    await user.click(
      screen.getByRole("button", { name: "随机球员" }),
    );
    expect(onRandom).toHaveBeenCalledWith(
      "express",
      createRandomPlayerSetup("phase-4:entry-actions"),
    );

    await user.click(
      screen.getByRole("button", { name: "开始普通生涯" }),
    );
    expect(onBegin).toHaveBeenCalledWith("express");
  });
});

function positionSetupState() {
  let state = createInitialCareerState(
    "issue-18:position-pitch",
  );
  state = careerReducer(state, { type: "begin_setup" });
  state = careerReducer(state, {
    nationality: "CHN",
    type: "select_nationality",
  });
  state = careerReducer(state, { type: "continue_setup" });
  state = careerReducer(state, {
    name: "门将",
    number: "1",
    type: "update_identity",
  });

  return careerReducer(state, {
    type: "continue_setup",
  });
}
