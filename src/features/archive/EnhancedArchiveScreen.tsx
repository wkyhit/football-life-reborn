import {
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
  replayClassicCareer,
  type ClassicCareerState,
  type ClassicChoiceLogEntry,
} from "../../domain/classicEngine";
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
      id="main-content"
      tabIndex={-1}
    >
      <header className="sticky top-0 z-10 border-b border-enhanced-line bg-enhanced-canvas/95 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-400">
              LOCAL CAREER LIBRARY
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">
              生涯档案
            </h1>
            <p className="mt-1 text-xs text-enhanced-supporting">
              {entries.length} / {ARCHIVE_CAPACITY} 个本地生涯
            </p>
          </div>
          <button
            className="min-h-11 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-4 text-sm font-bold"
            onClick={onBack}
            type="button"
          >
            返回
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <section
          aria-label="档案工具"
          className="flex flex-wrap items-center gap-2 border-b border-enhanced-line pb-4"
        >
          <label className="min-h-11 cursor-pointer rounded-[10px] bg-enhanced-pitch px-4 py-3 text-sm font-bold text-enhanced-pitch-ink">
            导入生涯 JSON
            <input
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => void importFile(event)}
              type="file"
            />
          </label>
          <button
            className="min-h-11 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            disabled={selectedIds.length !== 2}
            onClick={() => {
              if (selectedIds.length === 2) {
                setView({
                  kind: "compare",
                  leftId: selectedIds[0]!,
                  rightId: selectedIds[1]!,
                });
              }
            }}
            type="button"
          >
            比较已选人生
          </button>
          {undoToken ? (
            <button
              className="min-h-11 rounded-[10px] border border-amber-400/40 bg-amber-400/10 px-4 text-sm font-bold text-amber-200"
              onClick={undoDelete}
              type="button"
            >
              撤销删除
            </button>
          ) : null}
          <span className="ml-auto text-[11px] text-enhanced-supporting">
            选择两个兼容生涯进行比较
          </span>
        </section>

        {status ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300"
            role="status"
          >
            {status}
          </p>
        ) : null}

        {entries.length === 0 ? (
          <section className="py-20 text-center">
            <h2 className="text-lg font-bold">
              还没有生涯档案
            </h2>
            <p className="mt-2 text-sm text-enhanced-supporting">
              开始一段 Enhanced 生涯后会自动保存在这里。
            </p>
          </section>
        ) : (
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {entries.map((entry) => (
              <li
                className="rounded-[14px] border border-white/10 bg-enhanced-surface p-4"
                key={entry.id}
              >
                <div className="flex items-start gap-3">
                  <input
                    aria-label={`选择 ${entry.displayName} 用于比较`}
                    checked={selectedIds.includes(entry.id)}
                    className="mt-1 h-5 w-5 accent-emerald-400"
                    onChange={() => toggleSelected(entry.id)}
                    type="checkbox"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-extrabold">
                        {entry.displayName}
                      </h2>
                      {entry.id === activeArchiveId ? (
                        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          当前
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
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
                    <p className="mt-1 truncate font-mono text-[10px] text-zinc-600">
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
                        className="h-11 w-full rounded-[9px] border border-emerald-400 bg-black/20 px-3 text-sm outline-none"
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
    <button
      aria-label={label}
      className={
        danger
          ? "min-h-10 rounded-[8px] border border-red-400/20 bg-red-400/[0.06] px-2 text-xs font-bold text-red-300"
          : "min-h-10 rounded-[8px] border border-white/10 bg-white/[0.035] px-2 text-xs font-bold text-zinc-300"
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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
  const originalChoice =
    loaded.career.choiceLog[
      checkpoint.choiceLogLength
    ]!;
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
              className="mt-2 h-12 w-full rounded-[10px] border border-enhanced-line bg-enhanced-surface px-3 text-sm text-zinc-100"
              onChange={(event) => {
                setCheckpointId(event.target.value);
                setSelectedOptionId(null);
              }}
              value={checkpoint.id}
            >
              {branchable.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.age} 岁 · {candidate.decisionType} ·
                  第 {candidate.choiceLogLength + 1} 次决定
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-xs font-bold text-enhanced-supporting">
            分支名称
            <input
              className="mt-2 h-12 w-full rounded-[10px] border border-enhanced-line bg-enhanced-surface px-3 text-sm text-zinc-100"
              maxLength={80}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              value={displayName}
            />
          </label>
          <p className="mt-4 text-xs leading-relaxed text-enhanced-supporting">
            原决定：{originalChoice.optionId}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold">选择另一条路</h2>
          <div className="mt-3 grid gap-2">
            {alternatives.map((option) => (
              <button
                aria-pressed={selectedOptionId === option.id}
                className={
                  selectedOptionId === option.id
                    ? "min-h-12 rounded-[10px] border border-emerald-400 bg-emerald-400/10 px-4 text-left text-sm font-bold text-emerald-200"
                    : "min-h-12 rounded-[10px] border border-white/10 bg-white/[0.035] px-4 text-left text-sm font-bold"
                }
                key={option.id}
                onClick={() => setSelectedOptionId(option.id)}
                type="button"
              >
                改选 {option.label}
              </button>
            ))}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="mt-5 min-h-12 w-full rounded-[10px] bg-enhanced-pitch px-5 text-sm font-bold text-enhanced-pitch-ink disabled:opacity-40"
            disabled={
              selectedOptionId === null ||
              displayName.trim().length === 0
            }
            onClick={createBranch}
            type="button"
          >
            保存平行人生
          </button>
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
        <p className="text-sm text-red-300">
          这两个生涯不能比较：
          {comparison.reasons
            .map((reason) => reason.code)
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
      <div className="mb-5 grid grid-cols-2 gap-3">
        <BranchName
          label="人生 A"
          name={comparison.branches.left.displayName}
        />
        <BranchName
          label="人生 B"
          name={comparison.branches.right.displayName}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CurveCard
          points={comparison.abilityCurve}
          title="能力曲线"
        />
        <CurveCard
          marketValue
          points={comparison.valueCurve}
          title="身价曲线"
        />
        <MetricCard
          metrics={comparison.totals}
          title="生涯总计"
        />
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
        <ClubCard comparison={comparison} />
        <section className="rounded-[14px] border border-white/10 bg-enhanced-surface p-4">
          <h2 className="text-sm font-extrabold">生涯结局</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <p>{comparison.ending.left ?? "进行中"}</p>
            <p>{comparison.ending.right ?? "进行中"}</p>
          </div>
        </section>
      </div>
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
      id="main-content"
      tabIndex={-1}
    >
      <header className="border-b border-enhanced-line px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-emerald-400">
              {eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">
              {title}
            </h1>
          </div>
          <button
            className="min-h-11 rounded-[10px] border border-enhanced-line bg-enhanced-surface px-4 text-sm font-bold"
            onClick={onBack}
            type="button"
          >
            返回档案
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        {children}
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
    <div className="rounded-[12px] border border-white/10 bg-enhanced-surface p-3">
      <p className="text-[10px] font-bold text-enhanced-supporting">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-extrabold">
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
    <section className="rounded-[14px] border border-white/10 bg-enhanced-surface p-4">
      <h2 className="text-sm font-extrabold">{title}</h2>
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
                  className="border-t border-white/[0.06]"
                  key={point.age}
                >
                  <td className="py-1.5">{point.age}</td>
                  <td className="py-1.5 text-right">
                    {formatCurveValue(point.left, marketValue)}
                  </td>
                  <td className="py-1.5 text-right">
                    {formatCurveValue(point.right, marketValue)}
                  </td>
                  <td className="py-1.5 text-right text-emerald-300">
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
    <section className="rounded-[14px] border border-white/10 bg-enhanced-surface p-4">
      <h2 className="text-sm font-extrabold">{title}</h2>
      <div className="mt-3 space-y-2">
        {Object.entries(metrics).map(([key, metric]) => (
          <ComparisonRow
            key={key}
            label={key}
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
    <section className="rounded-[14px] border border-white/10 bg-enhanced-surface p-4">
      <h2 className="text-sm font-extrabold">{title}</h2>
      {visibleRows.length === 0 ? (
        <p className="mt-3 text-xs text-enhanced-supporting">
          两边都暂无记录
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {visibleRows.map((row) => (
            <ComparisonRow
              key={row.category}
              label={row.category}
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
    <section className="rounded-[14px] border border-white/10 bg-enhanced-surface p-4">
      <h2 className="text-sm font-extrabold">效力俱乐部</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
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
                    {club.teamId} · {club.seasonCount} 季
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
    <div className="grid grid-cols-[minmax(0,1fr)_48px_48px] gap-2 text-xs">
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
          <ol className="mt-4 grid gap-2 lg:grid-cols-2">
            {[...loaded.ledger]
              .reverse()
              .map((entry) => (
                <li
                  className="rounded-[10px] border border-white/10 bg-enhanced-surface p-3 text-xs"
                  key={entry.id}
                >
                  <p className="font-bold">
                    {ledgerTitle(entry)}
                  </p>
                  <p className="mt-1 text-enhanced-supporting">
                    {entry.age} 岁 · {entry.decisionId}
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
      return `获得奖项：${entry.award}`;
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
      return `获得奖杯：${entry.trophy}`;
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
