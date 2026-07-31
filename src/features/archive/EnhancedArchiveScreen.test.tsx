import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyClassicChoice,
  startClassicCareer,
  type ClassicCareerState,
} from "../../domain/classicEngine";
import {
  createArchiveRepository,
  type ArchiveStorageLike,
} from "../../storage/archiveRepository";
import { createCareerEconomyProjection } from "../../domain/economy/careerEconomyProjection";
import { serializeCareerTransfer } from "../../storage/careerTransfer";
import { EnhancedArchiveScreen } from "./EnhancedArchiveScreen";

class MemoryStorage implements ArchiveStorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Enhanced career archive", () => {
  it("renames, exports, imports, forks, compares, deletes, and undoes local careers", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    const ids = ["parent", "duplicate"];
    const repository = createArchiveRepository(storage, {
      createId: () => ids.shift()!,
      now: () => "2026-07-30T20:00:00.000Z",
    });
    const parent = chooseFirstOption(
      createCareer("phase-5:archive-ui"),
    );
    const created = repository.create({
      career: parent,
      displayName: "原始人生",
    });

    if (!created.ok) {
      throw new Error("Expected parent archive");
    }

    const importedRaw = createImportRaw();
    const continueCareer = vi.fn();
    const objectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:career-export");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(
      () => undefined,
    );

    render(
      <EnhancedArchiveScreen
        activeArchiveId="parent"
        createBranchId={() => "branch"}
        onActiveDeleted={vi.fn()}
        onBack={vi.fn()}
        onChanged={vi.fn()}
        onContinue={continueCareer}
        repository={repository}
        storage={storage}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "生涯档案" }),
    ).toBeInTheDocument();
    expect(screen.getByText("原始人生")).toBeInTheDocument();
    const parentRecord = screen
      .getByText("原始人生")
      .closest("li");

    if (parentRecord === null) {
      throw new Error("Expected parent archive record");
    }

    expect(within(parentRecord).getByText("总收入")).toBeVisible();
    expect(
      within(parentRecord).getByText(
        `¥${createCareerEconomyProjection(parent).totalIncome.toLocaleString("en-US")}`,
      ),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: "重命名 原始人生",
      }),
    );
    const rename = screen.getByRole("textbox", {
      name: "新的生涯名称",
    });
    await user.clear(rename);
    await user.type(rename, "冠军之路");
    await user.click(
      screen.getByRole("button", { name: "保存名称" }),
    );
    expect(screen.getByText("冠军之路")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "导出 冠军之路",
      }),
    );
    expect(objectUrl).toHaveBeenCalledOnce();

    await user.click(
      screen.getByRole("button", {
        name: "复制 冠军之路",
      }),
    );
    expect(
      await screen.findByText("冠军之路 · 副本"),
    ).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText("导入生涯 JSON"),
      new File([importedRaw], "imported-career.json", {
        type: "application/json",
      }),
    );
    expect(
      await screen.findByText("外部生涯"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "创建平行人生 冠军之路",
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "创建平行人生",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "分叉决策" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", {
        name: /^改选 /,
      })[0]!,
    );
    await user.click(
      screen.getByRole("button", {
        name: "保存平行人生",
      }),
    );
    expect(
      await screen.findByText("冠军之路 · 平行人生"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", {
        name: "选择 冠军之路 用于比较",
      }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "选择 冠军之路 · 平行人生 用于比较",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "比较已选人生",
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "平行人生对比",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("能力曲线")).toBeInTheDocument();
    expect(screen.getByText("国家队结果")).toBeInTheDocument();
    const economyComparison =
      document.querySelector<HTMLElement>(
        '[data-enhanced-comparison-record="economy"]',
      );

    if (economyComparison === null) {
      throw new Error("Expected branch economy comparison");
    }

    expect(
      within(economyComparison).getByText("总收入"),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "返回档案" }),
    );

    await user.click(
      screen.getByRole("button", {
        name: "查看账本 冠军之路",
      }),
    );
    const archiveEconomy =
      document.querySelector<HTMLElement>(
        "[data-enhanced-archive-economy]",
      );

    if (archiveEconomy === null) {
      throw new Error("Expected archive economy detail");
    }

    expect(within(archiveEconomy).getByText("总收入")).toBeVisible();
    expect(
      within(archiveEconomy).getByText(
        `¥${createCareerEconomyProjection(parent).totalIncome.toLocaleString("en-US")}`,
      ),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "返回档案" }),
    );

    await user.click(
      screen.getByRole("button", {
        name: "继续 冠军之路 · 平行人生",
      }),
    );
    expect(continueCareer).toHaveBeenCalledWith(
      expect.objectContaining({
        seed: parent.seed,
      }),
      "branch",
    );

    await user.click(
      screen.getByRole("button", {
        name: "删除 外部生涯",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "确认删除 外部生涯",
      }),
    );
    expect(screen.queryByText("外部生涯")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "撤销删除" }),
    );
    expect(
      await screen.findByText("外部生涯"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(repository.list()).toMatchObject({
        entries: expect.arrayContaining([
          expect.objectContaining({ id: "branch" }),
          expect.objectContaining({ id: "duplicate" }),
          expect.objectContaining({ id: "imported" }),
          expect.objectContaining({ id: "parent" }),
        ]),
        ok: true,
      });
    });
  });
});

function createCareer(seed: string): ClassicCareerState {
  return startClassicCareer({
    identity: {
      lastName: "林一鸣",
      nationalityFifaCode: "CHN",
      position: "ST",
      preferredNumber: 9,
    },
    mode: "normal",
    seed,
  });
}

function chooseFirstOption(
  career: ClassicCareerState,
): ClassicCareerState {
  const decision = career.currentDecision!;

  return applyClassicChoice(career, {
    decisionId: decision.id,
    decisionType: decision.type,
    optionId: decision.options[0]!.id,
  });
}

function createImportRaw(): string {
  const storage = new MemoryStorage();
  const repository = createArchiveRepository(storage, {
    createId: () => "imported",
    now: () => "2026-07-30T20:30:00.000Z",
  });
  const career = chooseFirstOption(
    createCareer("phase-5:import-ui"),
  );
  const created = repository.create({
    career,
    displayName: "外部生涯",
  });

  if (!created.ok) {
    throw new Error("Expected import fixture");
  }

  return serializeCareerTransfer({
    career,
    entry: created.entry,
  });
}
