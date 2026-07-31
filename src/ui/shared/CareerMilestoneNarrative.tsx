import {
  createMarketValuePresentation,
  createYuanPresentation,
  formatMarketValue,
  type CareerDecisionOptionPresentation,
  type CareerCurrencyPresentation,
  type CareerPresentation,
} from "../classic/careerPresentation";
import { formatYuan } from "../../domain/economy/economyPolicy";
import {
  HonorIdentity,
  type HonorIdentityKey,
} from "./HonorIdentity";

type MilestonePanel = Extract<
  CareerPresentation["panel"],
  { readonly kind: "milestone" }
>;
type EventResultPanel = Extract<
  CareerPresentation["panel"],
  { readonly kind: "event_result" }
>;
type EventResult = NonNullable<
  CareerPresentation["recentEventResult"]
>;
type SeasonRow = Extract<
  CareerPresentation["timeline"][number],
  { readonly kind: "season" }
>;

export function CareerEconomySummary({
  economy,
  marketValue,
  variant,
}: {
  readonly economy: CareerPresentation["economy"];
  readonly marketValue: number;
  readonly variant: "classic" | "enhanced";
}) {
  const enhanced = variant === "enhanced";
  const marketValuePresentation =
    createMarketValuePresentation(marketValue);
  const annualSalaryPresentation =
    economy?.annualSalary === null || economy === null
      ? null
      : createYuanPresentation(economy.annualSalary);
  const totalIncomePresentation =
    economy === null
      ? null
      : createYuanPresentation(economy.totalIncome);

  return (
    <dl
      className={
        enhanced
          ? "mt-3 grid grid-cols-3 divide-x divide-enhanced-line rounded-[8px] border border-enhanced-line bg-enhanced-surface"
          : "mt-2 grid grid-cols-3 divide-x divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900/50"
      }
      data-career-economy-summary=""
    >
      <EconomyMetric
        currency={marketValuePresentation.currency}
        fullValue={marketValuePresentation.full}
        label="身价"
        value={marketValuePresentation.compact}
        variant={variant}
      />
      <EconomyMetric
        {...(annualSalaryPresentation === null
          ? {}
          : {
              currency: annualSalaryPresentation.currency,
              fullValue: annualSalaryPresentation.full,
            })}
        label="年薪"
        value={
          economy === null
            ? "—"
            : economy.annualSalary === null
              ? "暂无合同"
              : enhanced
                ? annualSalaryPresentation?.compact ?? "—"
                : formatYuan(economy.annualSalary)
        }
        variant={variant}
      />
      <EconomyMetric
        {...(totalIncomePresentation === null
          ? {}
          : {
              currency: totalIncomePresentation.currency,
              fullValue: totalIncomePresentation.full,
            })}
        label="总收入"
        value={
          economy === null
            ? "—"
            : enhanced
              ? totalIncomePresentation?.compact ?? "—"
              : formatYuan(economy.totalIncome)
        }
        variant={variant}
      />
    </dl>
  );
}

export function CareerSeasonEconomy({
  row,
  variant,
}: {
  readonly row: SeasonRow;
  readonly variant: "classic" | "enhanced";
}) {
  const enhanced = variant === "enhanced";
  const marketValue = createMarketValuePresentation(
    row.marketValue,
  );
  const salary =
    row.economy === null
      ? null
      : createYuanPresentation(row.economy.annualSalary);
  const income =
    row.economy === null
      ? null
      : createYuanPresentation(row.economy.income);

  if (enhanced) {
    return (
      <div
        className="col-start-2 col-end-7 mt-1 min-w-0 rounded-[6px] bg-enhanced-surface px-2 py-1"
        data-career-season-economy=""
      >
        <dl className="grid min-w-0 grid-cols-2 gap-x-2">
          <EconomyMetric
            compact
            currency={marketValue.currency}
            fullValue={marketValue.full}
            label="身价"
            value={marketValue.compact}
            variant="enhanced"
          />
          <EconomyMetric
            compact
            {...(salary === null
              ? {}
              : {
                  currency: salary.currency,
                  fullValue: salary.full,
                })}
            label="年薪"
            value={salary?.compact ?? "—"}
            variant="enhanced"
          />
        </dl>
        <details
          className="mt-1 border-t border-enhanced-line"
          data-enhanced-season-details=""
        >
          <summary className="flex min-h-11 cursor-pointer items-center justify-between text-xs font-bold text-enhanced-pitch outline-none focus-visible:ring-2 focus-visible:ring-enhanced-focus">
            收入与赛季故事
            <span aria-hidden="true">＋</span>
          </summary>
          <div className="pb-1">
            <dl>
              <EconomyMetric
                compact
                {...(income === null
                  ? {}
                  : {
                      currency: income.currency,
                      fullValue: income.full,
                    })}
                label="收入"
                value={income?.compact ?? "—"}
                variant="enhanced"
              />
            </dl>
            {row.story ? (
              <section
                className="mt-2 border-t border-enhanced-line pt-2 text-xs"
                data-enhanced-season-choice-story=""
              >
                <strong className="text-enhanced-pitch">
                  年度选择
                </strong>
                <p className="mt-1 text-enhanced-strong">
                  {row.story.decisionTitle} · {row.story.choiceLabel}
                </p>
                {row.story.outcome ? (
                  <p
                    className="mt-1 text-enhanced-strong"
                    data-semantic-tone={row.story.outcome.tone}
                  >
                    结果：{row.story.outcome.title} ·{" "}
                    {row.story.outcome.summary}
                  </p>
                ) : null}
                {row.story.contractSummary ? (
                  <p className="mt-1 font-bold text-enhanced-supporting">
                    {row.story.contractSummary}
                  </p>
                ) : null}
              </section>
            ) : null}
            <CareerSeasonNarrative
              contained
              row={row}
              variant="enhanced"
            />
          </div>
        </details>
      </div>
    );
  }

  return (
    <dl
      className="col-start-2 col-end-7 mt-1 grid min-w-0 grid-cols-3 gap-x-2 rounded-md bg-zinc-950/45 px-2 py-1"
      data-career-season-economy=""
    >
      <EconomyMetric
        compact
        currency={marketValue.currency}
        fullValue={marketValue.full}
        label="身价"
        value={formatMarketValue(row.marketValue)}
        variant={variant}
      />
      <EconomyMetric
        compact
        {...(salary === null
          ? {}
          : {
              currency: salary.currency,
              fullValue: salary.full,
            })}
        label="年薪"
        value={
          row.economy === null
            ? "—"
            : formatYuan(row.economy.annualSalary)
        }
        variant={variant}
      />
      <EconomyMetric
        compact
        {...(income === null
          ? {}
          : {
              currency: income.currency,
              fullValue: income.full,
            })}
        label="收入"
        value={
          row.economy === null
            ? "—"
            : formatYuan(row.economy.income)
        }
        variant={variant}
      />
    </dl>
  );
}

function EconomyMetric({
  compact = false,
  currency,
  fullValue,
  label,
  value,
  variant,
}: {
  readonly compact?: boolean;
  readonly currency?: CareerCurrencyPresentation["currency"];
  readonly fullValue?: string;
  readonly label: string;
  readonly value: string;
  readonly variant: "classic" | "enhanced";
}) {
  const enhanced = variant === "enhanced";

  return (
    <div
      className={
        compact
          ? "min-w-0"
          : enhanced
            ? "min-w-0 px-2 py-2 text-center"
            : "min-w-0 px-2 py-1.5 text-center"
      }
    >
      <dt
        className={
          compact
            ? enhanced
              ? "text-[9px] font-bold text-enhanced-supporting"
              : "text-[9px] font-medium text-zinc-500"
            : enhanced
              ? "text-xs font-bold text-enhanced-supporting"
              : "text-[10px] font-medium text-zinc-500"
        }
      >
        {label}
      </dt>
      <dd
        aria-label={
          fullValue === undefined
            ? undefined
            : `${label}：${fullValue}`
        }
        className={`min-w-0 font-bold tabular-nums ${
          enhanced
            ? "break-words leading-tight"
            : "whitespace-nowrap"
        } ${
          compact
            ? enhanced
              ? "text-[9px] text-enhanced-ink-2"
              : "text-[9px] text-zinc-300"
            : enhanced
              ? "mt-0.5 text-xs text-enhanced-strong"
              : "mt-0.5 text-[11px] text-zinc-200"
        }`}
        data-currency={currency}
        title={fullValue}
      >
        {value}
      </dd>
    </div>
  );
}

export function CareerDecisionEconomyDetails({
  option,
  variant,
}: {
  readonly option: CareerDecisionOptionPresentation;
  readonly variant: "classic" | "enhanced";
}) {
  const enhanced = variant === "enhanced";
  const content = (
    <>
      {option.consequences.length > 0 ? (
        <span
          className={
            enhanced
              ? "mt-3 block space-y-2 border-t border-enhanced-line pt-3"
              : "mt-2 block space-y-1 border-t border-zinc-700/70 pt-2"
          }
          data-career-decision-consequences=""
          role="list"
        >
          <span className="sr-only">可能后果：</span>
          {option.consequences.map((consequence) => (
            <span
              className={
                enhanced
                  ? "flex items-start gap-2 text-xs leading-4"
                  : "flex items-start gap-2 text-[11px] leading-4"
              }
              data-semantic-tone={consequence.tone}
              key={`${consequence.semanticLabel}:${consequence.text}`}
              role="listitem"
            >
              <span
                className={`shrink-0 font-bold ${consequenceToneClass(consequence.tone, variant)}`}
              >
                {consequence.semanticLabel}
                {consequence.probabilityLabel === null
                  ? ""
                  : ` · ${consequence.probabilityLabel}`}
              </span>
              <span
                className={
                  enhanced
                    ? "text-enhanced-strong"
                    : "text-zinc-300"
                }
              >
                {consequence.text}
              </span>
            </span>
          ))}
        </span>
      ) : null}
      {option.contract ? (
        <span
          className={`block font-bold ${
            enhanced ? "mt-3 text-xs" : "mt-2 text-[11px]"
          } ${contractToneClass(option.contract.tone, variant)}`}
          data-career-decision-contract=""
          data-semantic-tone={option.contract.tone}
        >
          {option.contract.label}
        </span>
      ) : null}
      {option.honorOpportunities.length > 0 ? (
        <span
          className={
            enhanced
              ? "mt-1 block text-xs leading-4 text-enhanced-trophy"
              : "mt-1 block text-[10px] leading-4 text-amber-300"
          }
          data-career-decision-honors=""
        >
          荣誉机会：
          {option.honorOpportunities.join(" · ")}
        </span>
      ) : null}
    </>
  );

  if (!enhanced) {
    return content;
  }

  return (
    <details
      className="border-t border-enhanced-line px-3 pb-2"
      data-enhanced-decision-details=""
    >
      <summary className="flex min-h-11 cursor-pointer items-center justify-between text-xs font-bold text-enhanced-pitch outline-none focus-visible:ring-2 focus-visible:ring-enhanced-focus">
        合同与完整故事
        <span aria-hidden="true">＋</span>
      </summary>
      <div className="pb-1">{content}</div>
    </details>
  );
}

type CareerMilestoneNarrativeProps = Pick<
  MilestonePanel,
  | "honors"
  | "nationalTournaments"
  | "statuses"
  | "tierChange"
> & {
  readonly variant: "classic" | "enhanced";
};

export function CareerMilestoneNarrative({
  honors,
  nationalTournaments,
  statuses,
  tierChange,
  variant,
}: CareerMilestoneNarrativeProps) {
  const enhanced = variant === "enhanced";
  const radius = enhanced ? "rounded-[8px]" : "rounded-lg";

  return (
    <ul className={`${enhanced ? "mt-4" : "mt-3"} flex flex-wrap gap-2`}>
      {honors.map((honor, index) => {
        const identity =
          honor.kind === "award"
            ? honor.award
            : honor.trophy;

        return (
          <li
            className={`${radius} inline-flex items-center ${
              enhanced ? "gap-2" : "gap-1.5"
            } border ${
              enhanced
                ? "border-amber-400/25 bg-amber-400/10 px-2.5 py-2 text-xs font-bold text-amber-100"
                : "border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs font-bold text-amber-200"
            }`}
            key={`honor-${index}-${honor.label}`}
          >
            <HonorIdentity
              honor={identity}
              size={enhanced ? 22 : 20}
            />
            {honor.label}
          </li>
        );
      })}
      {nationalTournaments.map(({ label }, index) => (
        <li
          className={`${radius} border ${
            enhanced
              ? "border-cyan-400/25 bg-cyan-400/10 px-2.5 py-2 text-xs font-bold text-cyan-100"
              : "border-sky-500/30 bg-sky-500/10 px-2.5 py-2 text-xs font-bold text-sky-200"
          }`}
          key={`national-${index}-${label}`}
        >
          {label}
        </li>
      ))}
      {statuses.map(({ label, tone }, index) => (
        <li
          className={`${radius} border px-2.5 py-2 text-xs font-bold ${milestoneToneClass(tone, variant)}`}
          data-semantic-tone={tone}
          key={`status-${index}-${label}`}
        >
          {label}
        </li>
      ))}
      {tierChange ? (
        <li
          className={`${radius} border px-2.5 py-2 text-xs font-bold ${milestoneToneClass(tierChange.tone, variant)}`}
          data-semantic-tone={tierChange.tone}
        >
          {tierChange.label}
        </li>
      ) : null}
    </ul>
  );
}

export function CareerSeasonNarrative({
  contained = false,
  row,
  variant,
}: {
  readonly contained?: boolean;
  readonly row: SeasonRow;
  readonly variant: "classic" | "enhanced";
}) {
  const enhanced = variant === "enhanced";
  const items: Array<{
    honor: HonorIdentityKey | null;
    id: string;
    kind: "honor" | "national" | "status";
    label: string;
    tone: "negative" | "neutral" | "positive" | "warning";
  }> = [
    ...row.honors.map((honor, index) => ({
      honor:
        honor.kind === "award"
          ? honor.award
          : honor.trophy,
      id: `honor-${index}-${honor.label}`,
      kind: "honor" as const,
      label: honor.label,
      tone: "positive" as const,
    })),
    ...row.nationalTournaments.map(({ label }, index) => ({
      honor: null,
      id: `national-${index}-${label}`,
      kind: "national" as const,
      label,
      tone: "neutral" as const,
    })),
    ...row.statuses.map(({ label, tone }, index) => ({
      honor: null,
      id: `status-${index}-${label}`,
      kind: "status" as const,
      label,
      tone,
    })),
    ...(row.tierChange === null
      ? []
      : [
          {
            honor: null,
            id: `tier-${row.tierChange.from}-${row.tierChange.to}`,
            kind: "status" as const,
            label: row.tierChange.label,
            tone: row.tierChange.tone,
          },
        ]),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label={`${row.age} 岁赛季事件`}
      className={`${
        contained ? "mt-2" : "col-start-2 col-end-7 mt-1"
      } flex flex-wrap gap-1`}
      data-classic-season-narrative={enhanced ? undefined : ""}
      data-enhanced-season-narrative={enhanced ? "" : undefined}
    >
      {items.map((item) => (
        <li
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold ${
            item.kind === "honor"
              ? enhanced
                ? "rounded-[5px] border border-amber-400/25 bg-amber-400/10 text-amber-200"
                : "rounded border border-amber-500/30 bg-amber-500/10 text-amber-300"
              : item.kind === "national"
                ? enhanced
                  ? "rounded-[5px] border border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
                  : "rounded border border-sky-500/30 bg-sky-500/10 text-sky-300"
                : seasonToneClass(item.tone, variant)
          }`}
          data-semantic-tone={item.tone}
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

export function CareerEventResultNarrative({
  headingId,
  panel,
  variant,
}: {
  readonly headingId?: string;
  readonly panel: EventResultPanel;
  readonly variant: "classic" | "enhanced";
}) {
  const enhanced = variant === "enhanced";

  return (
    <>
      <p
        className={
          enhanced
            ? "text-[10px] font-bold tracking-[0.12em] text-emerald-400"
            : "text-[10px] font-bold tracking-wide text-emerald-500"
        }
      >
        {enhanced
          ? `EVENT RESULT · ${panel.age} 岁`
          : `${panel.age} 岁 · 事件结果`}
      </p>
      <h2
        className={
          enhanced
            ? "mt-1.5 text-[22px] font-extrabold leading-tight"
            : "mt-1 text-lg font-black text-zinc-50"
        }
        id={headingId}
      >
        {panel.title}
      </h2>
      <p
        className={
          enhanced
            ? "mt-2 text-xs font-bold text-enhanced-supporting"
            : "mt-1 text-xs font-bold text-zinc-500"
        }
      >
        {panel.choiceLabel}
      </p>
      <p
        className={`${
          enhanced
            ? "mt-4 rounded-[10px] px-3 py-3"
            : "mt-3 rounded-xl px-3 py-2.5"
        } border text-sm font-bold ${resultToneClass(panel.tone, variant)}`}
      >
        {panel.summary}
      </p>
      {panel.contractSummary ? (
        <p
          className={`${enhanced ? "mt-3" : "mt-2"} text-xs font-bold ${contractResultToneClass(panel.contractResult, variant)}`}
          data-career-event-contract-result=""
          data-semantic-tone={contractResultTone(
            panel.contractResult,
          )}
        >
          {panel.contractSummary}
        </p>
      ) : null}
    </>
  );
}

export function CareerRecentEventResult({
  result,
  variant,
}: {
  readonly result: EventResult;
  readonly variant: "classic" | "enhanced";
}) {
  const enhanced = variant === "enhanced";

  return (
    <div
      className={`${
        enhanced
          ? "mb-4 rounded-[9px] px-3 py-2.5"
          : "mb-3 rounded-lg px-3 py-2"
      } border text-xs ${resultToneClass(result.tone, variant)}`}
      data-enhanced-recent-event-result={enhanced ? "" : undefined}
      data-classic-recent-event-result={enhanced ? undefined : ""}
    >
      <strong className="block">{result.title}</strong>
      <span className={`${enhanced ? "mt-1" : "mt-0.5"} block`}>
        {result.summary}
      </span>
      {result.contractSummary ? (
        <span
          className={`${enhanced ? "mt-2" : "mt-1"} block font-bold ${contractResultToneClass(result.contractResult, variant)}`}
          data-career-event-contract-result=""
          data-semantic-tone={contractResultTone(
            result.contractResult,
          )}
        >
          {result.contractSummary}
        </span>
      ) : null}
    </div>
  );
}

function consequenceToneClass(
  tone: CareerDecisionOptionPresentation["consequences"][number]["tone"],
  variant: "classic" | "enhanced",
): string {
  if (variant === "enhanced") {
    switch (tone) {
      case "positive":
        return "text-enhanced-success";
      case "neutral":
        return "text-enhanced-supporting";
      case "warning":
        return "text-enhanced-trophy";
      case "negative":
        return "text-enhanced-alert";
    }
  }

  switch (tone) {
    case "positive":
      return "text-lime-400";
    case "neutral":
      return "text-zinc-400";
    case "warning":
      return "text-yellow-400";
    case "negative":
      return "text-red-400";
  }
}

type SemanticTone =
  | "negative"
  | "neutral"
  | "positive"
  | "warning";
type ContractTone = NonNullable<
  CareerDecisionOptionPresentation["contract"]
>["tone"];

function contractToneClass(
  tone: ContractTone,
  variant: "classic" | "enhanced",
): string {
  if (variant === "classic") {
    return "text-emerald-300";
  }

  switch (tone) {
    case "positive":
      return "text-enhanced-success";
    case "neutral":
      return "text-enhanced-supporting";
    case "warning":
      return "text-enhanced-trophy";
  }
}

function contractResultTone(
  result: EventResult["contractResult"],
): Exclude<SemanticTone, "negative"> {
  if (result === null) {
    return "neutral";
  }

  switch (result.kind) {
    case "new_contract":
      return "positive";
    case "contract_unchanged":
      return "neutral";
    case "no_contract":
      return "warning";
  }
}

function contractResultToneClass(
  result: EventResult["contractResult"],
  variant: "classic" | "enhanced",
): string {
  return contractToneClass(contractResultTone(result), variant);
}

function milestoneToneClass(
  tone: SemanticTone,
  variant: "classic" | "enhanced",
): string {
  if (variant === "classic") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  }

  switch (tone) {
    case "positive":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
    case "negative":
      return "border-rose-400/25 bg-rose-400/10 text-rose-100";
    case "warning":
      return "border-amber-400/25 bg-amber-400/10 text-amber-100";
    case "neutral":
      return "border-white/10 bg-white/[0.04] text-zinc-300";
  }
}

function seasonToneClass(
  tone: SemanticTone,
  variant: "classic" | "enhanced",
): string {
  const radius = variant === "enhanced" ? "rounded-[5px]" : "rounded";
  return `${radius} border ${milestoneToneClass(tone, variant)}`;
}

function resultToneClass(
  tone: EventResult["tone"],
  variant: "classic" | "enhanced",
): string {
  if (variant === "enhanced") {
    switch (tone) {
      case "positive":
        return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
      case "negative":
        return "border-rose-400/25 bg-rose-400/10 text-rose-100";
      case "warning":
        return "border-amber-400/25 bg-amber-400/10 text-amber-100";
      case "neutral":
        return "border-white/10 bg-white/[0.04] text-zinc-300";
    }
  }

  switch (tone) {
    case "positive":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "negative":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "neutral":
      return "border-zinc-700 bg-zinc-800/70 text-zinc-300";
  }
}
