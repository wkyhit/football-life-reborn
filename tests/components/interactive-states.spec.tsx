import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  useReducer,
  type ComponentProps,
} from "react";
import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  careerReducer,
  createInitialCareerState,
} from "../../src/domain/careerReducer";
import { playClassicCareer } from "../../src/domain/classicEngine";
import { deriveDailyChallenge } from "../../src/features/challenges/daily";
import { evaluateChallengeProgress } from "../../src/features/challenges/progress";
import { EnhancedOnboarding } from "../../src/ui/enhanced/EnhancedOnboarding";
import { EnhancedAction } from "../../src/ui/enhanced/components/EnhancedAction";
import { EnhancedSummaryScreen } from "../../src/ui/enhanced/summary/EnhancedSummaryScreen";
import { createSummaryPresentation } from "../../src/ui/classic/summaryPresentation";
import { Dialog } from "../../src/ui/shared/Dialog";

const ROOT = process.cwd();
const STYLES_PATH = join(ROOT, "src", "styles.css");
const AFTER_INVENTORY_PATH = join(
  ROOT,
  "tests",
  "visual",
  "enhanced",
  "after",
  "inventory.json",
);
const MOTION_OWNERS = [
  "src/ui/enhanced/components/EnhancedAction.tsx",
  "src/ui/enhanced/components/EnhancedStateSurface.tsx",
  "src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx",
  "src/ui/enhanced/onboarding/EnhancedNationalityScreen.tsx",
  "src/ui/enhanced/EnhancedOnboarding.tsx",
  "src/ui/enhanced/career/EnhancedCareerScreen.tsx",
  "src/ui/enhanced/summary/EnhancedSummaryScreen.tsx",
  "src/features/archive/EnhancedArchiveScreen.tsx",
  "src/features/challenges/ChallengeProgressPanel.tsx",
  "src/features/replay/ReplayRouteScreen.tsx",
] as const;

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("Enhanced interaction-state contract", () => {
  it("keeps all action states explicit, stable, and accessibly disabled", () => {
    render(
      <>
        <EnhancedAction>默认操作</EnhancedAction>
        <EnhancedAction state="loading">读取档案</EnhancedAction>
        <EnhancedAction state="error">重试保存</EnhancedAction>
        <EnhancedAction state="success">已复制</EnhancedAction>
        <EnhancedAction
          disabled
          disabledReason="选择两个兼容生涯后才能比较"
        >
          比较人生
        </EnhancedAction>
      </>,
    );

    const defaultAction = screen.getByRole("button", {
      name: "默认操作",
    });
    const loadingAction = screen.getByRole("button", {
      name: /读取档案/,
    });
    const errorAction = screen.getByRole("button", {
      name: "重试保存",
    });
    const successAction = screen.getByRole("button", {
      name: "已复制",
    });
    const disabledAction = screen.getByRole("button", {
      name: "比较人生",
    });

    expect(defaultAction).toHaveAttribute(
      "data-interaction-state",
      "default",
    );
    expect(loadingAction).toHaveAttribute(
      "data-interaction-state",
      "loading",
    );
    expect(errorAction).toHaveAttribute(
      "data-interaction-state",
      "error",
    );
    expect(successAction).toHaveAttribute(
      "data-interaction-state",
      "success",
    );
    expect(loadingAction).toBeDisabled();
    expect(loadingAction).toHaveAttribute("aria-busy", "true");
    expect(loadingAction).toHaveTextContent("读取档案");
    expect(
      loadingAction.querySelector("[data-loading-indicator]"),
    ).toHaveClass("enhanced-loading-indicator");
    expect(defaultAction.className).toContain(
      "transition-[transform,opacity]",
    );
    expect(defaultAction.className).toContain(
      "active:translate-y-px",
    );
    expect(defaultAction.className).not.toContain("scale");

    const reasonId =
      disabledAction.getAttribute("aria-describedby");

    expect(disabledAction).toBeDisabled();
    expect(reasonId).toBeTruthy();
    expect(document.getElementById(reasonId!)).toHaveTextContent(
      "选择两个兼容生涯后才能比较",
    );
  });

  it("validates identity fields only after blur and keeps a stable status slot", async () => {
    render(<IdentityHarness />);
    const user = userEvent.setup();
    const nameInput = screen.getByRole("textbox", {
      name: "姓名",
    });
    const numberInput = screen.getByRole("textbox", {
      name: "号码",
    });

    expect(nameInput).toHaveAttribute(
      "data-field-state",
      "default",
    );
    expect(numberInput).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );

    const messageId =
      numberInput.getAttribute("aria-describedby");
    const message = document.getElementById(messageId!);

    expect(messageId).toBeTruthy();
    expect(message).toHaveAttribute(
      "data-enhanced-field-message",
      "number",
    );
    expect(message).toHaveClass("min-h-5");
    expect(message).toHaveTextContent("1–99");

    await user.clear(numberInput);

    expect(numberInput).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(message).not.toHaveAttribute("role", "alert");

    await user.tab();

    expect(numberInput).toHaveAttribute("aria-invalid", "true");
    expect(numberInput).toHaveAttribute(
      "data-field-state",
      "error",
    );
    expect(message).toHaveAttribute("role", "alert");
    expect(message).toHaveTextContent(
      "请输入 1–99 的整数号码",
    );

    const nextAction = screen.getByRole("button", {
      name: "下一步",
    });
    const reason = document.getElementById(
      nextAction.getAttribute("aria-describedby")!,
    );

    expect(nextAction).toBeDisabled();
    expect(reason).toHaveTextContent(
      "输入 1–99 的整数号码后才能继续",
    );

    await user.click(numberInput);
    await user.type(numberInput, "9");
    await user.tab();

    expect(numberInput).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(numberInput).toHaveAttribute(
      "data-field-state",
      "success",
    );
    expect(message).not.toHaveAttribute("role", "alert");
    expect(nextAction).toBeEnabled();
  });

  it("turns replay-copy failure and success into the action label itself", () => {
    const daily = deriveDailyChallenge({
      calendarDate: "2026-07-31",
      family: "one_club",
      version: 1,
    });
    const career = playClassicCareer({
      identity: {
        lastName: "李",
        nationalityFifaCode: "CHN",
        position: "ST",
        preferredNumber: 9,
      },
      mode: "normal",
      seed: daily.seed,
    });
    const props = {
      challenge: {
        daily,
        progress: evaluateChallengeProgress(
          daily.family,
          career,
        ),
        replayUrl: "https://example.test/#r=replay",
      },
      onCopyReplay: vi.fn(),
      onRestart: vi.fn(),
      onShare: vi.fn(),
      view: createSummaryPresentation(career),
    } satisfies ComponentProps<
      typeof EnhancedSummaryScreen
    >;
    const { rerender } = render(
      <EnhancedSummaryScreen
        {...props}
        replayCopyMessage="回放链接已复制"
      />,
    );

    expect(
      screen.getByRole("button", { name: "已复制" }),
    ).toHaveAttribute("data-interaction-state", "success");

    rerender(
      <EnhancedSummaryScreen
        {...props}
        replayCopyMessage="复制失败，请手动选择回放链接"
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "重试复制回放链接",
      }),
    ).toHaveAttribute("data-interaction-state", "error");
    expect(
      screen.getByRole("status"),
    ).toHaveTextContent("复制失败，请手动选择回放链接");
  });

  it("uses the native dialog element for the additive Enhanced variant", () => {
    render(
      <Dialog
        labelledBy="enhanced-dialog-title"
        onClose={vi.fn()}
        variant="enhanced"
      >
        <h2 id="enhanced-dialog-title">分享生涯</h2>
        <button type="button">关闭</button>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", {
      name: "分享生涯",
    });

    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).not.toHaveAttribute("role");
    expect(dialog).not.toHaveAttribute("aria-modal");
  });
});

describe("Enhanced focus and motion contract", () => {
  it("prevents mobile focus zoom on every marked Enhanced field", () => {
    const styles = readFileSync(STYLES_PATH, "utf8");

    expect(styles).toContain("@media (max-width: 639px)");
    expect(styles).toContain(
      "[data-enhanced-shell]\n    :where(input, select, textarea)[data-enhanced-field] {\n    font-size: 1rem;",
    );
  });

  it("keeps hover fine-pointer-only and makes focus instantaneous", () => {
    const styles = readFileSync(STYLES_PATH, "utf8");

    expect(styles).toContain(
      "@media (hover: hover) and (pointer: fine)",
    );
    expect(styles).toContain(
      "[data-enhanced-shell]\n  :where(button, a, input, select, textarea):focus-visible",
    );
    expect(styles).toContain("transition: none;");
  });

  it("scopes reduced motion to Enhanced and falls back to opacity at 150ms", () => {
    const styles = readFileSync(STYLES_PATH, "utf8");

    expect(styles).not.toMatch(/\n  \*,\n  \*::before,/);
    expect(styles).toContain("[data-enhanced-shell] *,");
    expect(styles).toContain("transform: none !important;");
    expect(styles).toContain(
      "transition-property: opacity !important;",
    );
    expect(styles).toContain(
      "transition-duration: var(--dur-reduced) !important;",
    );
  });

  it("animates no layout or colour properties in Enhanced owners", () => {
    const sources = MOTION_OWNERS.map((relativePath) =>
      readFileSync(join(ROOT, relativePath), "utf8"),
    ).join("\n");

    expect(sources).not.toMatch(
      /\btransition-(?:all|colors)\b/,
    );
    expect(sources).not.toMatch(
      /transition-\[[^\]]*(?:background|border|color|height|width)/,
    );
    expect(sources).not.toContain("active:scale");
  });
});

describe("ego-browser Slice 5 acceptance", () => {
  it("persists responsive, zoom, keyboard, contrast, target, and motion evidence", () => {
    const inventory = JSON.parse(
      readFileSync(AFTER_INVENTORY_PATH, "utf8"),
    ) as {
      readonly acceptance?: {
        readonly contrast: {
          readonly body: number;
          readonly control: number;
          readonly focus: number;
        };
        readonly keyboardOnly: boolean;
        readonly mobileFocusZoom: {
          readonly fontCssPixels: number;
          readonly horizontalOffset: number;
          readonly visualViewportScale: number;
        };
        readonly reducedMotion: {
          readonly opacityOnly: boolean;
          readonly spatialTransform: string;
          readonly transitionMs: number;
        };
        readonly targets: {
          readonly minimumCssPixels: number;
        };
        readonly widths: readonly {
          readonly horizontalOverflow: number;
          readonly width: number;
        }[];
        readonly zoom200: {
          readonly completion: boolean;
          readonly horizontalOverflow: number;
        };
      };
      readonly entries: readonly {
        readonly evidence: readonly string[];
        readonly id: string;
      }[];
      readonly runner: string;
      readonly slice: number;
    };

    expect(inventory).toMatchObject({
      runner: "ego-browser",
      slice: 5,
    });
    expect(inventory.acceptance?.widths).toEqual(
      [320, 375, 414, 768, 1280, 1440].map((width) => ({
        horizontalOverflow: 0,
        width,
      })),
    );
    expect(inventory.acceptance?.zoom200).toEqual({
      completion: true,
      horizontalOverflow: 0,
    });
    expect(inventory.acceptance?.keyboardOnly).toBe(true);
    expect(inventory.acceptance?.mobileFocusZoom).toEqual({
      fontCssPixels: 16,
      horizontalOffset: 0,
      visualViewportScale: 1,
    });
    expect(
      inventory.acceptance?.targets.minimumCssPixels,
    ).toBeGreaterThanOrEqual(44);
    expect(inventory.acceptance?.contrast.body).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      inventory.acceptance?.contrast.control,
    ).toBeGreaterThanOrEqual(3);
    expect(inventory.acceptance?.contrast.focus).toBeGreaterThanOrEqual(
      3,
    );
    expect(inventory.acceptance?.reducedMotion).toEqual({
      opacityOnly: true,
      spatialTransform: "none",
      transitionMs: 150,
    });

    for (const id of [
      "interaction-states",
      "accessibility-zoom",
      "reduced-motion",
    ]) {
      const entry = inventory.entries.find(
        (candidate) => candidate.id === id,
      );

      expect(entry, `missing Slice 5 evidence: ${id}`).toBeDefined();
      expect(entry!.evidence.length).toBeGreaterThan(0);

      for (const relativePath of entry!.evidence) {
        expect(
          existsSync(join(ROOT, relativePath)),
          `missing ego-browser evidence: ${relativePath}`,
        ).toBe(true);
      }
    }
  });
});

function IdentityHarness() {
  const [state, dispatch] = useReducer(
    careerReducer,
    "issue-8:slice-5-identity",
    createIdentityState,
  );

  return (
    <EnhancedOnboarding
      dispatch={dispatch}
      hasResume={false}
      isEntryPrompt={false}
      newCareerSeed="issue-8:slice-5-identity"
      onBegin={() => undefined}
      onRandom={() => undefined}
      onResume={() => undefined}
      onStart={() => undefined}
      state={state}
    />
  );
}

function createIdentityState(seed: string) {
  const nationalityState = careerReducer(
    createInitialCareerState(seed),
    { type: "begin_setup" },
  );
  const selectedState = careerReducer(nationalityState, {
    nationality: "CHN",
    type: "select_nationality",
  });

  return careerReducer(selectedState, {
    type: "continue_setup",
  });
}
