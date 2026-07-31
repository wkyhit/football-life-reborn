import {
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
  replayClassicCareer,
  type ClassicCareerState,
  type ClassicChoiceLogEntry,
  type ClassicDecisionType,
} from "../../domain/classicEngine";
import { CLASSIC_CATALOG } from "../../domain/catalog/classicCatalog";
import {
  createCareerBranch,
  type DecisionCheckpoint,
} from "../../domain/checkpoint";
import type { CareerLedgerEntry } from "../../domain/ledger";
import {
  compareBranches,
  type ReadyBranchComparison,
} from "../branching/compareBranches";
import {
  ARCHIVE_CAPACITY,
  type ArchiveRepository,
  type ArchiveStorageLike,
  type CareerArchiveEntry,
} from "../../storage/archiveRepository";
import {
  importCareerTransfer,
  serializeCareerTransfer,
} from "../../storage/careerTransfer";
import { EnhancedAction } from "../../ui/enhanced/components/EnhancedAction";
import { EnhancedAppBar } from "../../ui/enhanced/components/EnhancedAppBar";
import { EnhancedStateSurface } from "../../ui/enhanced/components/EnhancedStateSurface";
import { createCareerPresentation } from "../../ui/classic/careerPresentation";

export type EnhancedArchiveScreenProps = {
  readonly activeArchiveId: string | null;
  readonly createBranchId?: () => string;
  readonly onActiveDeleted: (id: string) => void;
  readonly onBack: () => void;
  readonly onChanged: () => void;
  readonly onContinue: (
    career: ClassicCareerState,
    archiveId: string,
  ) => void;
  readonly repository: ArchiveRepository;
  readonly storage: ArchiveStorageLike;
};

type ArchiveView =
  | { readonly kind: "list" }
  | {
      readonly kind: "branch";
      readonly parentId: string;
    }
  | {
      readonly kind: "compare";
      readonly leftId: string;
      readonly rightId: string;
    }
  | {
      readonly archiveId: string;
      readonly kind: "ledger";
    };

export function EnhancedArchiveScreen({
  activeArchiveId,
  createBranchId = () => globalThis.crypto.randomUUID(),
  onActiveDeleted,
  onBack,
  onChanged,
  onContinue,
  repository,
  storage,
}: EnhancedArchiveScreenProps) {
  const [entries, setEntries] = useState<
    readonly CareerArchiveEntry[]
  >(() => readEntries(repository));
  const [selectedIds, setSelectedIds] = useState<
    readonly string[]
  >([]);
  const [renameId, setRenameId] = useState<string | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<
    string | null
  >(null);
  const [undoToken, setUndoToken] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [view, setView] = useState<ArchiveView>({
    kind: "list",
  });

  const refresh = () => {
    const listed = repository.list();

    if (listed.ok) {
      setEntries(listed.entries);
      setSelectedIds((current) =>
        current.filter((id) =>
          listed.entries.some((entry) => entry.id === id),
        ),
      );
      onChanged();
      return;
    }

    setStatus(`读取档案失败：${listed.detail}`);
  };

  if (view.kind === "branch") {
    return (
      <BranchCreator
        createBranchId={createBranchId}
        onBack={() => setView({ kind: "list" })}
        onCreated={(entry) => {
          setStatus(`已创建「${entry.displayName}」`);
          setView({ kind: "list" });
          refresh();
        }}
        parentId={view.parentId}
        repository={repository}
      />
    );
  }

  if (view.kind === "compare") {
    return (
      <BranchComparison
        leftId={view.leftId}
        onBack={() => setView({ kind: "list" })}
        repository={repository}
        rightId={view.rightId}
      />
    );
  }

  if (view.kind === "ledger") {
    return (
      <LedgerView
        archiveId={view.archiveId}
        onBack={() => setView({ kind: "list" })}
        repository={repository}
      />
    );
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((candidate) => candidate !== id);
      }

      if (current.length >= 2) {
        return [current[1]!, id];
      }

      return [...current, id];
    });
  };

  const startRename = (entry: CareerArchiveEntry) => {
    setRenameId(entry.id);
    setRenameValue(entry.displayName);
  };

  const saveRename = () => {
    if (renameId === null) {
      return;
    }

    const renamed = repository.rename(
      renameId,
      renameValue,
    );

    if (renamed.ok) {
      setStatus(`已重命名为「${renamed.entry.displayName}」`);
      setRenameId(null);
      refresh();
    } else {
      setStatus(`重命名失败：${renamed.reason}`);
    }
  };

  const duplicate = (entry: CareerArchiveEntry) => {
    const loaded = repository.load(entry.id);

    if (loaded.status !== "ready") {
      setStatus("复制失败：档案无法读取");
      return;
    }

    const created = repository.create({
      career: loaded.career,
      displayName: `${entry.displayName} · 副本`,
    });

    if (created.ok) {
      setStatus(`已复制「${entry.displayName}」`);
      refresh();
    } else if (created.reason === "capacity") {
      setStatus(
        `档案已满（${created.capacity} / ${created.capacity}），请先导出或删除`,
      );
    } else {
      setStatus(`复制失败：${created.reason}`);
    }
  };

  const exportArchive = (entry: CareerArchiveEntry) => {
    const loaded = repository.load(entry.id);

    if (loaded.status !== "ready") {
      setStatus("导出失败：档案无法读取");
      return;
    }

    const raw = serializeCareerTransfer({
      career: loaded.career,
      entry: loaded.entry,
    });
    const blob = new Blob([raw], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${safeFileName(entry.displayName)}.football-life.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`已导出「${entry.displayName}」`);
  };

  const importFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (file === undefined) {
      return;
    }

    let raw: string;

    try {
      raw = await file.text();
    } catch {
      setStatus("导入失败：无法读取文件");
      return;
    } finally {
      event.target.value = "";
    }

    const imported = importCareerTransfer(
      raw,
      repository,
      storage,
    );

    switch (imported.status) {
      case "imported":
        setStatus(`已导入「${imported.entry.displayName}」`);
        refresh();
        break;
      case "capacity":
        setStatus(
          `档案已满（${imported.capacity} / ${imported.capacity}），原文件已保留`,
        );
        break;
      case "conflict":
        setStatus(`该档案已存在（${imported.id}）`);
        break;
      case "rejected":
        setStatus(`导入被拒绝：${imported.reason}`);
        break;
      case "unsupported":
        setStatus(`版本暂不支持：${imported.reason}`);
        break;
      case "unavailable":
        setStatus(`导入失败：${imported.reason}`);
        break;
    }
  };

  const confirmDelete = (entry: CareerArchiveEntry) => {
    const deleted = repository.delete(entry.id);

    if (!deleted.ok) {
      setStatus(`删除失败：${deleted.reason}`);
      return;
    }

    if (entry.id === activeArchiveId) {
      onActiveDeleted(entry.id);
    }
    setUndoToken(deleted.undoToken);
    setPendingDeleteId(null);
    setStatus(`已删除「${entry.displayName}」，本次会话内可撤销`);
    refresh();
  };

  const undoDelete = () => {
    if (undoToken === null) {
      return;
    }

    const restored = repository.undoDelete(undoToken);

    if (restored.ok) {
      setStatus(`已恢复「${restored.entry.displayName}」`);
      setUndoToken(null);
      refresh();
    } else {
      setStatus(`撤销失败：${restored.reason}`);
    }
  };

  const continueArchive = (entry: CareerArchiveEntry) => {
    const loaded = repository.load(entry.id);

    if (loaded.status === "ready") {
      onContinue(loaded.career, entry.id);
    } else {
      setStatus("继续失败：档案无法读取");
    }
  };

  return (
    <main
      className="min-h-dvh bg-enhanced-canvas text-enhanced-strong"
      data-enhanced-archive-screen=""
      data-hallmark-macrostructure="Index-First"
      id="main-content"
      tabIndex={-1}
    >
      {/* Hallmark · genre: playful · macrostructure: Index-First · theme: custom (tuned) · design-system: design.md · designed-as-app */}
      <EnhancedAppBar
        actions={
          <EnhancedAction onClick={onBack}>返回</EnhancedAction>
        }
        context={`${entries.length} / ${ARCHIVE_CAPACITY} local careers`}
        currentLabel="生涯档案"
      />

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-3 border-b-2 border-enhanced-line pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <p className="font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-pitch">
              Local career library
            </p>
            <h1 className="mt-2 font-enhanced-display text-4xl font-bold">
              生涯档案
            </h1>
            <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-enhanced-supporting">
              本地保存、导出与比较每一条确定性生涯记录。
            </p>
          </div>
          <p className="font-enhanced-mono text-sm text-enhanced-ink-2">
            {String(entries.length).padStart(2, "0")} /{" "}
            {String(ARCHIVE_CAPACITY).padStart(2, "0")}
          </p>
        </header>
        <section
          aria-label="档案工具"
          className="flex flex-wrap items-center gap-3 border-b border-enhanced-line py-5"
        >
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-input)] border border-enhanced-pitch bg-enhanced-pitch px-4 text-sm font-bold text-enhanced-pitch-ink">
            导入生涯 JSON
            <input
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => void importFile(event)}
              type="file"
            />
          </label>
          <EnhancedAction
            disabled={selectedIds.length !== 2}
            disabledReason={`再选择 ${2 - selectedIds.length} 个兼容生涯后才能比较`}
            onClick={() => {
              if (selectedIds.length === 2) {
                setView({
                  kind: "compare",
                  leftId: selectedIds[0]!,
                  rightId: selectedIds[1]!,
                });
              }
            }}
          >
            比较已选人生
          </EnhancedAction>
          {undoToken ? (
            <EnhancedAction
              onClick={undoDelete}
            >
              撤销删除
            </EnhancedAction>
          ) : null}
          <span className="ml-auto text-xs text-enhanced-supporting">
            选择两个兼容生涯进行比较
          </span>
        </section>

        {status ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-3 py-2 text-sm text-enhanced-ink-2"
            role="status"
          >
            {status}
          </p>
        ) : null}

        {entries.length === 0 ? (
          <div className="py-8">
            <EnhancedStateSurface
              description="开始一段 Enhanced 生涯后会自动保存在这里；也可以导入先前导出的 JSON。"
              eyebrow="Archive empty"
              state="empty"
              title="还没有生涯档案"
            />
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-enhanced-line border-y border-enhanced-line">
            {entries.map((entry, index) => (
              <li
                className="grid gap-4 py-5 lg:grid-cols-[3.5rem_minmax(0,1fr)_minmax(22rem,0.8fr)] lg:items-start"
                data-enhanced-archive-record=""
                key={entry.id}
              >
                <p
                  aria-hidden="true"
                  className="font-enhanced-mono text-xs text-enhanced-pitch"
                >
                  R{String(index + 1).padStart(2, "0")}
                </p>
                <div className="flex items-start gap-3">
                  <label className="flex h-11 w-11 shrink-0 cursor-pointer items-start justify-start pt-1">
                    <input
                      aria-label={`选择 ${entry.displayName} 用于比较`}
                      checked={selectedIds.includes(entry.id)}
                      className="h-5 w-5 accent-enhanced-pitch"
                      onChange={() => toggleSelected(entry.id)}
                      type="checkbox"
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-extrabold">
                        {entry.displayName}
                      </h2>
                      {entry.id === activeArchiveId ? (
                        <span className="rounded-full bg-enhanced-pitch/10 px-2 py-1 text-xs font-bold text-enhanced-pitch">
                          当前
                        </span>
                      ) : null}
                      <span className="rounded-full border border-enhanced-line px-2 py-1 text-xs font-bold text-enhanced-supporting">
                        {entry.status === "retired"
                          ? "已退役"
                          : "进行中"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-enhanced-supporting">
                      {entry.identity.lastName} ·{" "}
                      {entry.identity.position} ·{" "}
                      {entry.progress.age} 岁 ·{" "}
                      {entry.progress.seasonCount} 赛季
                    </p>
                    <p className="mt-1 truncate font-enhanced-mono text-xs text-enhanced-neutral">
                      {entry.seed}
                    </p>
                  </div>
                </div>

                {renameId === entry.id ? (
                  <div className="mt-3 flex gap-2">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">
                        新的生涯名称
                      </span>
                      <input
                        aria-label="新的生涯名称"
                        autoFocus
                        className="h-11 w-full rounded-[9px] border border-enhanced-pitch bg-enhanced-canvas px-3 text-sm outline-none"
                        data-enhanced-field=""
                        data-field-state="default"
                        maxLength={80}
                        onChange={(event) =>
                          setRenameValue(event.target.value)
                        }
                        value={renameValue}
                      />
                    </label>
                    <button
                      className="rounded-[9px] bg-enhanced-pitch px-3 text-sm font-bold text-enhanced-pitch-ink"
                      onClick={saveRename}
                      type="button"
                    >
                      保存名称
                    </button>
                    <button
                      className="rounded-[9px] border border-enhanced-line px-3 text-sm"
                      onClick={() => setRenameId(null)}
                      type="button"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <ArchiveAction
                      label={`继续 ${entry.displayName}`}
                      onClick={() => continueArchive(entry)}
                    >
                      继续
                    </ArchiveAction>
                    <ArchiveAction
                      label={`创建平行人生 ${entry.displayName}`}
                      onClick={() =>
                        setView({
                          kind: "branch",
                          parentId: entry.id,
                        })
                      }
                    >
                      平行人生
                    </ArchiveAction>
                    <ArchiveAction
                      label={`导出 ${entry.displayName}`}
                      onClick={() => exportArchive(entry)}
                    >
                      导出
                    </ArchiveAction>
                    <ArchiveAction
                      label={`重命名 ${entry.displayName}`}
                      onClick={() => startRename(entry)}
                    >
                      重命名
                    </ArchiveAction>
                    <ArchiveAction
                      label={`复制 ${entry.displayName}`}
                      onClick={() => duplicate(entry)}
                    >
                      复制
                    </ArchiveAction>
                    <ArchiveAction
                      label={`查看账本 ${entry.displayName}`}
                      onClick={() =>
                        setView({
                          archiveId: entry.id,
                          kind: "ledger",
                        })
                      }
                    >
                      因果账本
                    </ArchiveAction>
                    {pendingDeleteId === entry.id ? (
                      <>
                        <ArchiveAction
                          danger
                          label={`确认删除 ${entry.displayName}`}
                          onClick={() => confirmDelete(entry)}
                        >
                          确认删除
                        </ArchiveAction>
                        <ArchiveAction
                          label={`取消删除 ${entry.displayName}`}
                          onClick={() =>
                            setPendingDeleteId(null)
                          }
                        >
                          取消
                        </ArchiveAction>
                      </>
                    ) : (
                      <ArchiveAction
                        danger
                        label={`删除 ${entry.displayName}`}
                        onClick={() =>
                          setPendingDeleteId(entry.id)
                        }
                      >
                        删除
                      </ArchiveAction>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function ArchiveAction({
  children,
  danger = false,
  label,
  onClick,
}: {
  readonly children: string;
  readonly danger?: boolean;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <EnhancedAction
      aria-label={label}
      className="min-h-11 w-full px-2 text-xs"
      onClick={onClick}
      tone={danger ? "danger" : "secondary"}
    >
      {children}
    </EnhancedAction>
  );
}

function BranchCreator({
  createBranchId,
  onBack,
  onCreated,
  parentId,
  repository,
}: {
  readonly createBranchId: () => string;
  readonly onBack: () => void;
  readonly onCreated: (entry: CareerArchiveEntry) => void;
  readonly parentId: string;
  readonly repository: ArchiveRepository;
}) {
  const loaded = useMemo(
    () => repository.load(parentId),
    [parentId, repository],
  );
  const branchable =
    loaded.status === "ready"
      ? loaded.checkpoints.filter(
          (checkpoint) =>
            checkpoint.choiceLogLength <
            loaded.career.choiceLog.length,
        )
      : [];
  const [checkpointId, setCheckpointId] = useState(
    branchable[0]?.id ?? "",
  );
  const [selectedOptionId, setSelectedOptionId] = useState<
    string | null
  >(null);
  const [displayName, setDisplayName] = useState(
    loaded.status === "ready"
      ? `${loaded.entry.displayName} · 平行人生`
      : "平行人生",
  );
  const [error, setError] = useState<string | null>(null);

  if (loaded.status !== "ready") {
    return (
      <SubPage
        eyebrow="BRANCH CREATOR"
        onBack={onBack}
        title="创建平行人生"
      >
        <p role="alert">父生涯无法读取。</p>
      </SubPage>
    );
  }

  if (branchable.length === 0) {
    return (
      <SubPage
        eyebrow="BRANCH CREATOR"
        onBack={onBack}
        title="创建平行人生"
      >
        <p className="text-sm text-enhanced-supporting">
          至少完成一次决策后才能回到 checkpoint 创建分支。
        </p>
      </SubPage>
    );
  }

  const checkpoint =
    branchable.find(
      (candidate) => candidate.id === checkpointId,
    ) ?? branchable[0]!;
  const decisionState = replayToCheckpoint(
    loaded.career,
    checkpoint,
  );
  const decisionPresentation = createCareerPresentation({
    career: decisionState,
    isRevealing: false,
    visibleSeasonCount: decisionState.seasons.length,
  });
  const optionLabelById = new Map(
    decisionPresentation.panel.kind === "decision"
      ? decisionPresentation.panel.options.map((option) => [
          option.id,
          option.title,
        ])
      : [],
  );
  const originalChoice =
    loaded.career.choiceLog[
      checkpoint.choiceLogLength
    ]!;
  const originalOptionLabel =
    optionLabelById.get(originalChoice.optionId) ?? "原路线";
  const alternatives =
    decisionState.currentDecision?.options.filter(
      (option) => option.id !== originalChoice.optionId,
    ) ?? [];

  const createBranch = () => {
    const option =
      alternatives.find(
        (candidate) => candidate.id === selectedOptionId,
      ) ?? null;
    const decision = decisionState.currentDecision;

    if (option === null || decision === null) {
      setError("请选择一个不同的决定");
      return;
    }

    const branchId = createBranchId();
    const choice: ClassicChoiceLogEntry = {
      decisionId: decision.id,
      decisionType: decision.type,
      optionId: option.id,
    };
    let branch: ReturnType<typeof createCareerBranch>;

    try {
      branch = createCareerBranch({
        branchId,
        checkpoint,
        choice,
        parent: loaded.career,
        parentCareerId: parentId,
      });
    } catch (branchError) {
      setError(
        branchError instanceof Error
          ? branchError.message
          : "无法创建分支",
      );
      return;
    }

    const created = repository.create({
      career: branch.career,
      displayName,
      id: branch.id,
    });

    if (created.ok) {
      onCreated(created.entry);
    } else {
      setError(
        created.reason === "capacity"
          ? `档案已满（${created.capacity} / ${created.capacity}）`
          : `保存失败：${created.reason}`,
      );
    }
  };

  return (
    <SubPage
      eyebrow="BRANCH CREATOR"
      onBack={onBack}
      title="创建平行人生"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <label className="block text-xs font-bold text-enhanced-supporting">
            分叉决策
            <select
              aria-label="分叉决策"
              className="mt-2 h-12 w-full rounded-[10px] border border-enhanced-line bg-enhanced-surface px-3 text-sm text-enhanced-strong"
              data-enhanced-field=""
              data-field-state="default"
              onChange={(event) => {
                setCheckpointId(event.target.value);
                setSelectedOptionId(null);
              }}
              value={checkpoint.id}
            >
              {branchable.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.age} 岁 ·{" "}
                  {decisionTypeLabel(candidate.decisionType)} · 第{" "}
                  {candidate.choiceLogLength + 1} 次决定
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-xs font-bold text-enhanced-supporting">
            分支名称
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-enhanced-line bg-enhanced-surface px-3 text-sm text-enhanced-strong"
              data-enhanced-field=""
              data-field-state="default"
              maxLength={80}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              value={displayName}
            />
          </label>
          <p className="mt-4 text-xs leading-relaxed text-enhanced-supporting">
            原决定：{originalOptionLabel}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold">选择另一条路</h2>
          <div className="mt-3 grid gap-2">
            {alternatives.map((option) => (
              <button
                aria-pressed={selectedOptionId === option.id}
                data-enhanced-branch-option=""
                className={
                  selectedOptionId === option.id
                    ? "min-h-12 rounded-[10px] border border-enhanced-pitch bg-enhanced-pitch/10 px-4 text-left text-sm font-bold text-enhanced-pitch"
                    : "min-h-12 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-4 text-left text-sm font-bold"
                }
                key={option.id}
                onClick={() => setSelectedOptionId(option.id)}
                type="button"
              >
                改选{" "}
                {optionLabelById.get(option.id) ?? "另一条路线"}
              </button>
            ))}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-enhanced-alert" role="alert">
              {error}
            </p>
          ) : null}
          <EnhancedAction
            className="mt-5 min-h-12 w-full"
            disabled={
              selectedOptionId === null ||
              displayName.trim().length === 0
            }
            disabledReason={
              displayName.trim().length === 0
                ? "输入分支名称后才能保存"
                : "选择一条不同路线后才能保存"
            }
            onClick={createBranch}
            tone="primary"
          >
            保存平行人生
          </EnhancedAction>
        </div>
      </div>
    </SubPage>
  );
}

function BranchComparison({
  leftId,
  onBack,
  repository,
  rightId,
}: {
  readonly leftId: string;
  readonly onBack: () => void;
  readonly repository: ArchiveRepository;
  readonly rightId: string;
}) {
  const left = repository.load(leftId);
  const right = repository.load(rightId);

  if (left.status !== "ready" || right.status !== "ready") {
    return (
      <SubPage
        eyebrow="PARALLEL LIVES"
        onBack={onBack}
        title="平行人生对比"
      >
        <p role="alert">至少一个生涯无法读取。</p>
      </SubPage>
    );
  }

  const comparison = compareBranches(
    {
      career: left.career,
      displayName: left.entry.displayName,
      id: left.entry.id,
    },
    {
      career: right.career,
      displayName: right.entry.displayName,
      id: right.entry.id,
    },
  );

  if (comparison.status === "incompatible") {
    return (
      <SubPage
        eyebrow="PARALLEL LIVES"
        onBack={onBack}
        title="平行人生对比"
      >
        <p className="text-sm text-enhanced-alert">
          这两个生涯不能比较：
          {comparison.reasons
            .map((reason) =>
              incompatibilityLabel(reason.code),
            )
            .join("、")}
        </p>
      </SubPage>
    );
  }

  return (
    <SubPage
      eyebrow="PARALLEL LIVES"
      onBack={onBack}
      title="平行人生对比"
    >
      <div className="grid grid-cols-2 border-y border-enhanced-line">
        <BranchName
          label="人生 A"
          name={comparison.branches.left.displayName}
        />
        <BranchName
          label="人生 B"
          name={comparison.branches.right.displayName}
        />
      </div>
      <div className="grid gap-x-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="min-w-0">
          <CurveCard
            points={comparison.abilityCurve}
            title="能力曲线"
          />
          <CurveCard
            marketValue
            points={comparison.valueCurve}
            title="身价曲线"
          />
        </div>
        <div className="min-w-0">
          <MetricCard
            metrics={comparison.totals}
            title="生涯总计"
          />
          <section
            className="border-b border-enhanced-line py-5"
            data-enhanced-comparison-record="ending"
          >
            <h2 className="text-lg font-bold">生涯结局</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <p>{endingLabel(comparison.ending.left)}</p>
              <p>{endingLabel(comparison.ending.right)}</p>
            </div>
          </section>
        </div>
      </div>
      <div className="grid border-y border-enhanced-line md:grid-cols-3 md:divide-x md:divide-enhanced-line">
        <CategoryCard
          rows={comparison.trophies.rows}
          title="奖杯"
        />
        <CategoryCard
          rows={comparison.awards.rows}
          title="个人奖项"
        />
        <CategoryCard
          rows={comparison.nationalTeam.results.rows}
          title="国家队结果"
        />
      </div>
      <ClubCard comparison={comparison} />
    </SubPage>
  );
}

function SubPage({
  children,
  eyebrow,
  onBack,
  title,
}: {
  readonly children: React.ReactNode;
  readonly eyebrow: string;
  readonly onBack: () => void;
  readonly title: string;
}) {
  return (
    <main
      className="min-h-dvh bg-enhanced-canvas text-enhanced-strong"
      data-enhanced-archive-subpage=""
      data-hallmark-macrostructure="Index-First"
      id="main-content"
      tabIndex={-1}
    >
      {/* Hallmark · genre: playful · macrostructure: Index-First · theme: custom (tuned) · design-system: design.md · designed-as-app */}
      <EnhancedAppBar
        actions={
          <EnhancedAction onClick={onBack}>
            返回档案
          </EnhancedAction>
        }
        context={eyebrow}
        currentLabel={title}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b-2 border-enhanced-line pb-6">
          <p className="font-enhanced-mono text-xs uppercase tracking-[0.08em] text-enhanced-pitch">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-enhanced-display text-4xl font-bold">
            {title}
          </h1>
        </header>
        <div className="pt-6">
        {children}
        </div>
      </div>
    </main>
  );
}

function BranchName({
  label,
  name,
}: {
  readonly label: string;
  readonly name: string;
}) {
  return (
    <div className="border-r border-enhanced-line px-4 py-4 last:border-r-0">
      <p className="font-enhanced-mono text-xs text-enhanced-supporting">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-bold">
        {name}
      </p>
    </div>
  );
}

function CurveCard({
  marketValue = false,
  points,
  title,
}: {
  readonly marketValue?: boolean;
  readonly points: ReadyBranchComparison["abilityCurve"];
  readonly title: string;
}) {
  return (
    <section
      className="border-b border-enhanced-line py-5"
      data-enhanced-comparison-record="curve"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      {points.length === 0 ? (
        <p className="mt-4 text-xs text-enhanced-supporting">
          暂无赛季数据
        </p>
      ) : (
        <div className="mt-3 max-h-48 overflow-y-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-enhanced-supporting">
              <tr>
                <th className="py-1 text-left">年龄</th>
                <th className="py-1 text-right">A</th>
                <th className="py-1 text-right">B</th>
                <th className="py-1 text-right">差值</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr
                  className="border-t border-enhanced-line-soft"
                  key={point.age}
                >
                  <td className="py-2">{point.age}</td>
                  <td className="py-2 text-right">
                    {formatCurveValue(point.left, marketValue)}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurveValue(point.right, marketValue)}
                  </td>
                  <td className="py-2 text-right text-enhanced-pitch">
                    {formatCurveValue(point.delta, marketValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  metrics,
  title,
}: {
  readonly metrics: ReadyBranchComparison["totals"];
  readonly title: string;
}) {
  return (
    <section
      className="border-b border-enhanced-line py-5"
      data-enhanced-comparison-record="totals"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 space-y-2">
        {Object.entries(metrics).map(([key, metric]) => (
          <ComparisonRow
            key={key}
            label={metricLabel(key)}
            left={metric.left}
            right={metric.right}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({
  rows,
  title,
}: {
  readonly rows: readonly {
    readonly category: string;
    readonly left: number;
    readonly right: number;
  }[];
  readonly title: string;
}) {
  const visibleRows = rows.filter(
    (row) => row.left > 0 || row.right > 0,
  );

  return (
    <section
      className="px-4 py-5"
      data-enhanced-comparison-record="category"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      {visibleRows.length === 0 ? (
        <p className="mt-3 text-xs text-enhanced-supporting">
          两边都暂无记录
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {visibleRows.map((row) => (
            <ComparisonRow
              key={row.category}
              label={categoryLabel(row.category)}
              left={row.left}
              right={row.right}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ClubCard({
  comparison,
}: {
  readonly comparison: ReadyBranchComparison;
}) {
  return (
    <section
      className="border-b border-enhanced-line py-5"
      data-enhanced-comparison-record="clubs"
    >
      <h2 className="text-lg font-bold">效力俱乐部</h2>
      <div className="mt-3 grid grid-cols-2 gap-6 text-sm">
        {[comparison.clubs.left, comparison.clubs.right].map(
          (clubs, index) => (
            <ul className="space-y-1" key={index}>
              {clubs.length === 0 ? (
                <li className="text-enhanced-supporting">
                  暂无
                </li>
              ) : (
                clubs.map((club) => (
                  <li key={club.teamId}>
                    {clubLabel(club.teamId)} ·{" "}
                    {club.seasonCount} 季
                  </li>
                ))
              )}
            </ul>
          ),
        )}
      </div>
    </section>
  );
}

function ComparisonRow({
  label,
  left,
  right,
}: {
  readonly label: string;
  readonly left: number;
  readonly right: number;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_48px_48px] gap-2 text-sm">
      <span className="truncate text-enhanced-supporting">
        {label}
      </span>
      <span className="text-right tabular-nums">{left}</span>
      <span className="text-right tabular-nums">{right}</span>
    </div>
  );
}

function LedgerView({
  archiveId,
  onBack,
  repository,
}: {
  readonly archiveId: string;
  readonly onBack: () => void;
  readonly repository: ArchiveRepository;
}) {
  const loaded = repository.load(archiveId);

  return (
    <SubPage
      eyebrow="CAUSAL LEDGER"
      onBack={onBack}
      title="因果账本"
    >
      {loaded.status !== "ready" ? (
        <p role="alert">账本无法读取。</p>
      ) : (
        <>
          <p className="text-sm text-enhanced-supporting">
            {loaded.entry.displayName} · {loaded.ledger.length} 条记录
          </p>
          <ol className="mt-4 divide-y divide-enhanced-line border-y border-enhanced-line">
            {[...loaded.ledger]
              .reverse()
              .map((entry) => (
                <li
                  className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  data-enhanced-archive-record="ledger"
                  key={entry.id}
                >
                  <p className="font-bold">
                    {ledgerTitle(entry)}
                  </p>
                  <p className="mt-1 text-enhanced-supporting">
                    {entry.age} 岁 · 第{" "}
                    {entry.choiceLogIndex + 1} 次选择
                  </p>
                </li>
              ))}
          </ol>
        </>
      )}
    </SubPage>
  );
}

function ledgerTitle(entry: CareerLedgerEntry): string {
  switch (entry.type) {
    case "award":
      return `获得奖项：${categoryLabel(entry.award)}`;
    case "event":
      return `生涯事件：${entry.eventKey}`;
    case "growth":
      return `能力变化：${signed(entry.overallDelta)}`;
    case "injury":
      return `伤病：${entry.injuryType} ${signed(entry.overallDelta)}`;
    case "role":
      return `球队角色：${entry.previousRole ?? "无"} → ${entry.role}`;
    case "suspension":
      return "停赛赛季";
    case "trophy":
      return `获得奖杯：${categoryLabel(entry.trophy)}`;
    case "value":
      return `身价变化：${signed(entry.marketValueDelta)}`;
  }
}

function readEntries(
  repository: ArchiveRepository,
): readonly CareerArchiveEntry[] {
  const listed = repository.list();

  return listed.ok ? listed.entries : [];
}

function replayToCheckpoint(
  parent: ClassicCareerState,
  checkpoint: DecisionCheckpoint,
): ClassicCareerState {
  return replayClassicCareer({
    choices: parent.choiceLog.slice(
      0,
      checkpoint.choiceLogLength,
    ),
    contentVersion: parent.contentVersion,
    identity: parent.identity,
    mode: parent.mode,
    seed: parent.seed,
  });
}

function safeFileName(value: string): string {
  const normalized = [...value.trim()]
    .map((character) =>
      character.charCodeAt(0) < 32 ||
      /[<>:"/\\|?*]/.test(character)
        ? "-"
        : character,
    )
    .join("");

  return normalized.length > 0 ? normalized : "career";
}

function formatCurveValue(
  value: number | null,
  marketValue: boolean,
): string {
  if (value === null) {
    return "暂无";
  }

  if (!marketValue) {
    return String(value);
  }

  return `€${Math.round(value / 10_000)}万`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

const DECISION_TYPE_LABELS: Readonly<
  Record<ClassicDecisionType, string>
> = {
  academy_offer: "青训报价",
  career_event: "生涯事件",
  contract_nonrenewal: "合同未续",
  loan_offer: "外租报价",
  no_offers_retirement: "无人报价",
  post_loan_not_retained: "租借归来未留队",
  post_loan_retained: "租借归来留队",
  transfer: "转会选择",
};

const METRIC_LABELS: Readonly<Record<string, string>> = {
  appearances: "出场",
  assists: "助攻",
  awards: "个人奖项",
  cleanSheets: "零封",
  goals: "进球",
  goalsConceded: "失球",
  trophies: "奖杯",
};

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  ballon_dor: "金球奖",
  champion: "冠军",
  club_world_cup: "世俱杯",
  continental_primary: "洲际顶级冠军",
  continental_secondary: "洲际次级冠军",
  cup: "国内杯赛",
  final: "亚军",
  golden_boot: "金靴奖",
  golden_glove: "金手套奖",
  group: "小组赛",
  league: "联赛冠军",
  national_continental: "国家队洲际冠军",
  not_qualified: "未晋级",
  not_selected: "未入选",
  qf: "八强",
  r16: "十六强",
  sf: "四强",
  world_cup: "世界杯",
};

function decisionTypeLabel(
  decisionType: ClassicDecisionType,
): string {
  return DECISION_TYPE_LABELS[decisionType];
}

function metricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? "其他数据";
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? "其他记录";
}

function clubLabel(teamId: string): string {
  return (
    CLASSIC_CATALOG.clubById.get(teamId)?.shortNameZh ??
    "未知俱乐部"
  );
}

function endingLabel(
  ending: ClassicCareerState["retirementReason"],
): string {
  switch (ending) {
    case null:
      return "进行中";
    case "no_offers":
      return "无人报价后退役";
    case "retirement_age":
      return "达到退役年龄";
    case "voluntary":
      return "主动退役";
  }
}

function incompatibilityLabel(
  reason:
    | "content_version"
    | "identity"
    | "mode"
    | "seed",
): string {
  switch (reason) {
    case "content_version":
      return "内容版本不同";
    case "identity":
      return "球员身份不同";
    case "mode":
      return "游戏模式不同";
    case "seed":
      return "生涯编号不同";
  }
}
