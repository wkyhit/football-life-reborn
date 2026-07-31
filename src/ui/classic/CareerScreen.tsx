import type {
  CareerDecisionOptionPresentation,
  CareerPresentation,
  CareerTimelineRowPresentation,
} from "./careerPresentation";
import {
  HonorIdentity,
  type HonorIdentityKey,
} from "../shared/HonorIdentity";
import { ClubIdentity } from "./components/ClubIdentity";

type CareerScreenProps = {
  readonly onChoose: (decisionId: string, optionId: string) => void;
  readonly view: CareerPresentation;
};

export function CareerScreen({
  onChoose,
  view,
}: CareerScreenProps) {
  return (
    <main
      className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100"
      data-classic-career-shell=""
      id="main-content"
    >
      <CareerHeader view={view} />
      <CareerTimeline view={view} />
      <CareerPanel onChoose={onChoose} view={view} />
    </main>
  );
}

function CareerHeader({ view }: { readonly view: CareerPresentation }) {
  const { header, totals } = view;

  return (
    <header
      className="shrink-0 border-b border-zinc-800 bg-zinc-950/95 px-4 pb-2 pt-4"
      data-classic-career-header=""
    >
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-amber-600/50 bg-gradient-to-br from-amber-700 to-amber-900 text-2xl font-black tabular-nums text-amber-50">
          <span className="text-[8px] font-bold leading-none opacity-70">
            能力
          </span>
          <span className="leading-none">{header.overall}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
              {header.countryFlag} {header.countryCode}
            </span>
            <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
              #{header.number} {header.position}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 truncate">
            {header.club ? (
              <ClubIdentity club={header.club} size={20} />
            ) : null}
            <span className="truncate text-lg font-black text-zinc-50">
              {header.club?.shortName ?? "自由身"}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] text-zinc-500">年龄</div>
          <div className="text-xl font-black tabular-nums text-zinc-100">
            {header.age}
          </div>
          <div className="text-[11px] font-bold text-emerald-400">
            <span className="mr-0.5 font-normal text-zinc-500">
              身价
            </span>
            {formatMarketValue(header.marketValue)}
          </div>
        </div>
      </div>

      <div className="-mx-1 mt-1">
        <dl className="grid grid-flow-col auto-cols-fr divide-x divide-zinc-800">
          {(
            [
              ["出场", totals.appearances],
              ["进球", totals.goals],
              ["助攻", totals.assists],
              ["奖杯", totals.trophies],
            ] as const
          ).map(([label, value]) => (
            <div className="px-2 py-2.5 text-center" key={label}>
              <dt className="text-[10px] font-medium tracking-wide text-zinc-500">
                {label}
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-zinc-100">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

function CareerTimeline({
  view,
}: {
  readonly view: CareerPresentation;
}) {
  return (
    <section
      aria-label="生涯时间线"
      className="min-h-0 flex-1 overflow-y-auto px-4 py-2"
      data-classic-timeline-scroll=""
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <div className="grid grid-cols-[26px_minmax(0,1fr)_38px_30px_28px_28px] items-center gap-1 px-2.5 py-1.5 text-[9px] font-bold tracking-wide text-zinc-600">
          <span>岁</span>
          <span>球队</span>
          <span className="text-center">能力</span>
          <span className="text-right">场</span>
          <span className="text-right">球</span>
          <span className="text-right">助</span>
        </div>

        <div className="divide-y divide-zinc-800/50 border-t border-zinc-800/70">
          {view.timeline.map((row) => (
            <TimelineRow key={row.age} row={row} />
          ))}
          <div className="grid grid-cols-[26px_minmax(0,1fr)_38px_30px_28px_28px] items-center gap-1 bg-zinc-800/30 px-2.5 py-[7px]">
            <span className="text-center text-[14px] leading-none">
              {view.nationalTeam.countryFlag}
            </span>
            <span className="truncate text-[13px] font-bold text-zinc-600">
              {view.nationalTeam.name}
            </span>
            <span />
            <TimelineNumber>
              {view.nationalTeam.stats.appearances}
            </TimelineNumber>
            <TimelineNumber>
              {view.nationalTeam.stats.goals}
            </TimelineNumber>
            <TimelineNumber>
              {view.nationalTeam.stats.assists}
            </TimelineNumber>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineRow({
  row,
}: {
  readonly row: CareerTimelineRowPresentation;
}) {
  const gridClass =
    "grid grid-cols-[26px_minmax(0,1fr)_38px_30px_28px_28px] items-center gap-1 px-2.5 py-[6px]";

  if (row.kind === "current") {
    return (
      <div className={`${gridClass} bg-emerald-500/5`}>
        <span className="text-[12px] font-black tabular-nums text-emerald-400">
          {row.age}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          决策中…
        </span>
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (row.kind === "empty") {
    return (
      <div className={gridClass}>
        <span className="text-[12px] font-black tabular-nums text-zinc-700">
          {row.age}
        </span>
        <span className="text-[12px] text-zinc-800">—</span>
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className={`${gridClass} animate-rise`}>
      <span className="text-[12px] font-black tabular-nums text-zinc-400">
        {row.age}
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <ClubIdentity club={row.club} size={18} />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-bold text-zinc-100">
            {row.club.shortName}
          </span>
          <span className="block truncate text-[9px] text-zinc-600">
            {row.club.subtitle.replace(" · 次级联赛", "")}
          </span>
        </span>
      </span>
      <span className="text-center">
        <span className="inline-block min-w-[30px] rounded-md border border-amber-600/50 bg-gradient-to-br from-amber-700 to-amber-900 px-1 py-0.5 text-center text-[11px] font-black tabular-nums text-amber-50">
          {row.overall}
        </span>
      </span>
      <SeasonNumber>{row.stats.appearances}</SeasonNumber>
      <SeasonNumber>{row.stats.goals}</SeasonNumber>
      <SeasonNumber>{row.stats.assists}</SeasonNumber>
      <SeasonNarrative row={row} />
    </div>
  );
}

function SeasonNarrative({
  row,
}: {
  readonly row: Extract<
    CareerTimelineRowPresentation,
    { readonly kind: "season" }
  >;
}) {
  const items: Array<{
    honor: HonorIdentityKey | null;
    id: string;
    kind: "honor" | "national" | "status";
    label: string;
  }> = [
    ...row.honors.map((honor, index) => ({
      honor:
        honor.kind === "award"
          ? honor.award
          : honor.trophy,
      id: `honor-${index}-${honor.label}`,
      kind: "honor" as const,
      label: honor.label,
    })),
    ...row.nationalTournaments.map(({ label }, index) => ({
      honor: null,
      id: `national-${index}-${label}`,
      kind: "national" as const,
      label,
    })),
    ...row.statuses.map(({ label }, index) => ({
      honor: null,
      id: `status-${index}-${label}`,
      kind: "status" as const,
      label,
    })),
    ...(row.tierChange === null
      ? []
      : [
          {
            honor: null,
            id: `tier-${row.tierChange.from}-${row.tierChange.to}`,
            kind: "status" as const,
            label: row.tierChange.label,
          },
        ]),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label={`${row.age} 岁赛季事件`}
      className="col-start-2 col-end-7 mt-1 flex flex-wrap gap-1"
      data-classic-season-narrative=""
    >
      {items.map((item) => (
        <li
          className={
            item.kind === "honor"
              ? "inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300"
              : item.kind === "national"
                ? "inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold text-sky-300"
                : "inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-300"
          }
          key={item.id}
        >
          {item.honor === null ? null : (
            <HonorIdentity honor={item.honor} size={14} />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function TimelineNumber({ children }: { readonly children: number }) {
  return (
    <span className="text-right text-[12px] tabular-nums text-zinc-700">
      {children}
    </span>
  );
}

function SeasonNumber({ children }: { readonly children: number }) {
  return (
    <span className="text-right text-[12px] tabular-nums text-zinc-300">
      {children}
    </span>
  );
}

function CareerPanel({
  onChoose,
  view,
}: {
  readonly onChoose: CareerScreenProps["onChoose"];
  readonly view: CareerPresentation;
}) {
  const { panel } = view;

  if (panel.kind === "simulating") {
    return (
      <aside
        className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 py-6 text-center"
        data-classic-career-panel=""
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-bold text-zinc-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          赛季进行中…
        </span>
      </aside>
    );
  }

  return (
    <aside
      className="shrink-0 border-t border-zinc-800 bg-zinc-950"
      data-classic-career-panel=""
    >
      <div className="max-h-[46dvh] overflow-y-auto px-4 pb-5 pt-3">
        <div className="animate-rise">
          <div className="text-[10px] font-bold tracking-wide text-emerald-500">
            {panel.age} 岁 · 决策
          </div>
          <h2 className="mt-1 text-lg font-black text-zinc-50">
            {panel.title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
            {panel.description}
          </p>
          <div className="mt-3 space-y-2">
            {panel.options.map((option) => (
              <DecisionOption
                key={option.id}
                onChoose={() =>
                  onChoose(panel.decisionId, option.id)
                }
                option={option}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function DecisionOption({
  onChoose,
  option,
}: {
  readonly onChoose: () => void;
  readonly option: CareerDecisionOptionPresentation;
}) {
  return (
    <button
      className="block w-full rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 text-left transition-colors active:bg-zinc-700"
      onClick={onChoose}
      type="button"
    >
      <span className="flex items-center gap-2.5">
        {option.club ? (
          <ClubIdentity club={option.club} size={34} />
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-zinc-100">
            {option.title}
          </span>
          <span
            className={`block text-[11px] text-zinc-500 ${
              option.club ? "truncate" : "whitespace-normal leading-4"
            }`}
          >
            {option.subtitle}
          </span>
        </span>
        {option.role ? (
          <span className="shrink-0 text-right">
            <span
              className={`block text-[11px] font-bold ${roleToneClass(option.roleTone)}`}
            >
              {option.role}
            </span>
            <span className="block text-[10px] text-zinc-600">
              {option.stars}
            </span>
          </span>
        ) : null}
      </span>
    </button>
  );
}

function roleToneClass(
  tone: CareerDecisionOptionPresentation["roleTone"],
): string {
  switch (tone) {
    case "positive":
      return "text-lime-400";
    case "primary":
      return "text-emerald-400";
    case "warning":
      return "text-yellow-400";
    case "danger":
      return "text-red-400";
  }
}

function formatMarketValue(valueEuro: number): string {
  if (valueEuro >= 100_000_000) {
    return `€${trimDecimal(valueEuro / 100_000_000)}亿`;
  }

  return `€${trimDecimal(valueEuro / 10_000)}万`;
}

function trimDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
