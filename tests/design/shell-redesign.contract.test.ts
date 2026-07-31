import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  careerReducer,
  createInitialCareerState,
} from "../../src/domain/careerReducer";
import { EnhancedOnboarding } from "../../src/ui/enhanced/EnhancedOnboarding";
import { EnhancedLandingScreen } from "../../src/ui/enhanced/onboarding/EnhancedLandingScreen";
import { EnhancedRecoveryScreen } from "../../src/ui/enhanced/recovery/EnhancedRecoveryScreen";

const ROOT = process.cwd();
const APP_PATH = join(ROOT, "src", "app", "App.tsx");
const AFTER_INVENTORY_PATH = join(
  ROOT,
  "tests",
  "visual",
  "enhanced",
  "after",
  "inventory.json",
);
const REQUIRED_COMPONENTS = [
  "src/ui/enhanced/components/EnhancedAction.tsx",
  "src/ui/enhanced/components/EnhancedAppBar.tsx",
  "src/ui/enhanced/components/EnhancedStateSurface.tsx",
  "src/ui/enhanced/recovery/EnhancedRecoveryScreen.tsx",
] as const;

describe("Enhanced shell and setup redesign contract", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("adds the approved shared shell, action, state, and recovery owners", () => {
    for (const relativePath of REQUIRED_COMPONENTS) {
      expect(
        existsSync(join(ROOT, relativePath)),
        `missing approved owner: ${relativePath}`,
      ).toBe(true);
    }
  });

  it("persists the ego-browser shell and state matrix at every required width", () => {
    expect(existsSync(AFTER_INVENTORY_PATH)).toBe(true);

    const inventory = JSON.parse(
      readFileSync(AFTER_INVENTORY_PATH, "utf8"),
    ) as {
      readonly entries: readonly {
        readonly evidence: readonly string[];
        readonly id: string;
      }[];
      readonly runner: string;
      readonly slice: number;
      readonly viewportWidths: readonly number[];
    };

    expect(inventory).toMatchObject({
      runner: "ego-browser",
      slice: 3,
      viewportWidths: [320, 375, 414, 768, 1280, 1440],
    });
    expect(inventory.entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "landing",
        "setup-nationality",
        "setup-identity",
        "setup-position",
        "empty",
        "loading",
        "error",
        "recovery",
        "install",
      ]),
    );

    for (const entry of inventory.entries) {
      expect(entry.evidence.length).toBeGreaterThan(0);

      for (const relativePath of entry.evidence) {
        const png = readFileSync(join(ROOT, relativePath));

        expect(png.subarray(0, 8)).toEqual(
          Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a,
            0x0a,
          ]),
        );
      }
    }
  });

  it("marks landing as stage 0.0 with navigation and an install state", () => {
    render(
      createElement(EnhancedLandingScreen, {
        hasResume: false,
        onBegin: () => undefined,
        onRandom: () => undefined,
        onResume: () => undefined,
      }),
    );

    expect(
      document.querySelector(
        '[data-hallmark-macrostructure="Narrative Workflow"]',
      ),
    ).toHaveAttribute("data-enhanced-stage", "0.0");
    expect(
      screen.getByRole("navigation", {
        name: "Enhanced 导航",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "安装到设备",
      }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-enhanced-state="install"]'),
    ).toBeInTheDocument();
  });

  it("uses one visible 1.0–3.0 workflow progress contract across setup", () => {
    const nationalityState = careerReducer(
      createInitialCareerState("phase-7:shell-red"),
      { type: "begin_setup" },
    );
    const identityState = careerReducer(
      careerReducer(nationalityState, {
        nationality: "CHN",
        type: "select_nationality",
      }),
      { type: "continue_setup" },
    );
    const positionState = careerReducer(identityState, {
      type: "continue_setup",
    });
    const props = {
      dispatch: vi.fn(),
      hasResume: false,
      isEntryPrompt: false,
      newCareerSeed: "phase-7:shell-red",
      onBegin: () => undefined,
      onRandom: () => undefined,
      onResume: () => undefined,
      onStart: () => undefined,
    } as const;

    const { rerender } = render(
      createElement(EnhancedOnboarding, {
        ...props,
        state: nationalityState,
      }),
    );

    expect(
      document.querySelector('[data-enhanced-stage="1.0"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "球员设置进度",
      }),
    ).toHaveAttribute("aria-valuenow", "1");
    expect(
      screen.getByText("1.0 / 3.0"),
    ).toBeInTheDocument();

    rerender(
      createElement(EnhancedOnboarding, {
        ...props,
        state: identityState,
      }),
    );
    expect(
      document.querySelector('[data-enhanced-stage="2.0"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "球员设置进度",
      }),
    ).toHaveAttribute("aria-valuenow", "2");

    rerender(
      createElement(EnhancedOnboarding, {
        ...props,
        state: positionState,
      }),
    );
    expect(
      document.querySelector('[data-enhanced-stage="3.0"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByText("3.0 / 3.0"),
    ).toBeInTheDocument();
  });

  it("replaces every blank lazy boundary with a visible loading surface", () => {
    const app = readFileSync(APP_PATH, "utf8");

    expect(app).not.toContain("fallback={null}");
    expect(app).toContain(
      'data-enhanced-state="loading"',
    );
    expect(app).toContain('aria-busy="true"');
  });

  it("turns the native install prompt into one explicit install state", async () => {
    const prompt = vi.fn(async () => undefined);
    const event = new Event("beforeinstallprompt", {
      cancelable: true,
    });

    Object.defineProperties(event, {
      prompt: { value: prompt },
      userChoice: {
        value: Promise.resolve({
          outcome: "accepted",
        }),
      },
    });

    render(
      createElement(EnhancedLandingScreen, {
        hasResume: false,
        onBegin: () => undefined,
        onRandom: () => undefined,
        onResume: () => undefined,
      }),
    );
    fireEvent(window, event);

    expect(event.defaultPrevented).toBe(true);
    fireEvent.click(
      screen.getByRole("button", {
        name: "安装到设备",
      }),
    );

    await waitFor(() => {
      expect(prompt).toHaveBeenCalledOnce();
      expect(
        screen.getByText(
          "已安装。之后可以直接从设备主屏幕打开，存档仍只保存在本机。",
        ),
      ).toBeInTheDocument();
    });
  });

  it("keeps corrupt data quarantined in a dedicated Enhanced recovery record", () => {
    const onStartNew = vi.fn();

    render(
      createElement(EnhancedRecoveryScreen, {
        onStartNew,
        recovery: {
          quarantineKey: "football-life:quarantine:fixture",
          reason: "Stored session is not valid JSON",
          status: "corrupt",
        },
      }),
    );

    expect(
      document.querySelector(
        '[data-hallmark-macrostructure="Index-First"]',
      ),
    ).toBeInTheDocument();
    expect(
      document.querySelector(
        '[data-enhanced-state="recovery"]',
      ),
    ).toHaveTextContent(
      "football-life:quarantine:fixture",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "开始新生涯",
      }),
    );
    expect(onStartNew).toHaveBeenCalledOnce();
  });
});
