import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { playClassicCareer } from "../domain/classicEngine";
import { deriveDailyChallenge } from "../features/challenges/daily";
import { encodeReplayHash } from "../features/replay/codec";
import { createReplayPayload } from "../features/replay/replay";
import { App } from "./App";

const DAILY = deriveDailyChallenge({
  calendarDate: "2026-07-30",
  family: "one_club",
  version: 1,
});
const CAREER = playClassicCareer({
  identity: {
    lastName: "无存储回放",
    nationalityFifaCode: "CHN",
    position: "ST",
    preferredNumber: 9,
  },
  mode: "normal",
  seed: DAILY.seed,
});
const HASH = encodeReplayHash(
  createReplayPayload({
    career: CAREER,
    challengeId: DAILY.id,
  }),
);
const ORDINARY_CAREER = playClassicCareer({
  identity: {
    lastName: "普通回放",
    nationalityFifaCode: "CHN",
    position: "CM",
    preferredNumber: 8,
  },
  mode: "express",
  seed: "issue-23:ordinary-storage-free",
});
const ORDINARY_HASH = encodeReplayHash(
  createReplayPayload({
    career: ORDINARY_CAREER,
    profile: { preferredFoot: "right" },
  }),
);

describe("App replay route", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    window.history.replaceState({}, "", "/");
    localStorage.clear();
  });

  it("renders the exact summary before touching unavailable storage", async () => {
    window.history.replaceState({}, "", `/${HASH}`);
    const storageSpies = disableStorage();

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "无存储回放",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("只读确定性回放"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "一人一城挑战进度",
      }),
    ).toHaveTextContent("挑战完成");
    expect(
      document.querySelector("[data-replay-route='ready']"),
    ).not.toBeNull();
    expect(storageSpies.every((spy) => spy.mock.calls.length === 0)).toBe(
      true,
    );
  });

  it("shows a recoverable corrupt-link error without reading storage", async () => {
    window.history.replaceState({}, "", "/#r=invalid*");
    const storageSpies = disableStorage();

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "回放链接损坏",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "请向分享者重新获取完整链接",
    );
    expect(
      document.querySelector("[data-replay-route='error']"),
    ).not.toBeNull();
    expect(storageSpies.every((spy) => spy.mock.calls.length === 0)).toBe(
      true,
    );
  });

  it("renders an exact ordinary replay with its preferred foot and no challenge identity while storage is disabled", async () => {
    window.history.replaceState({}, "", `/${ORDINARY_HASH}`);
    const storageSpies = disableStorage();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "普通回放" }),
    ).toBeInTheDocument();
    expect(screen.getByText("惯用脚 · 右脚")).toBeInTheDocument();
    expect(
      screen.queryByText(/挑战进度/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "复制本局回放" }),
    ).toBeInTheDocument();
    expect(storageSpies.every((spy) => spy.mock.calls.length === 0)).toBe(
      true,
    );
  });
});

function disableStorage() {
  const failure = () => {
    throw new DOMException(
      "Storage is disabled",
      "SecurityError",
    );
  };

  return [
    vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(failure),
    vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(failure),
    vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(failure),
  ] as const;
}
