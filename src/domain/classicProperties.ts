import {
  playClassicCareer,
  projectClassicGoldenState,
  replayClassicCareer,
} from "./classicEngine";
import type {
  ClassicCareerState,
  ClassicChoicePolicy,
  ClassicIdentity,
} from "./classicEngine";
import {
  CLASSIC_CATALOG,
  CLASSIC_CONTENT_VERSION,
} from "./catalog/classicCatalog";
import {
  classicPick,
  deriveClassicRngState,
  nextClassicFloat,
} from "./classicRng";
import type { PacingMode } from "./pacing";
import type {
  ClassicPosition,
  ClassicSeasonStats,
} from "./role";
import { calculateCareerTotals } from "./summary";

export type ClassicInvariantFailure = {
  readonly errors: readonly string[];
  readonly index: number;
  readonly seed: string;
};

export type ClassicInvariantReport = {
  readonly digest: string;
  readonly executed: number;
  readonly failures: readonly ClassicInvariantFailure[];
  readonly replayed: number;
};

const POSITIONS: readonly ClassicPosition[] = [
  "LW",
  "ST",
  "RW",
  "LM",
  "CAM",
  "RM",
  "LB",
  "CM",
  "RB",
  "CDM",
  "CB",
  "GK",
];
const MODES: readonly PacingMode[] = [
  "long",
  "normal",
  "express",
];
const RETIREMENT_REASONS = new Set([
  "no_offers",
  "retirement_age",
  "voluntary",
]);
const UINT32_MAXIMUM = 0xffff_ffff;
const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

export function runClassicCareerInvariantBatch(input: {
  readonly count: number;
  readonly seedNamespace: string;
}): ClassicInvariantReport {
  if (!Number.isInteger(input.count) || input.count < 0) {
    throw new RangeError(
      `Invariant batch count must be a non-negative integer: ${input.count}`,
    );
  }

  const failures: ClassicInvariantFailure[] = [];
  let digest = FNV_OFFSET_BASIS;
  let replayed = 0;

  for (let index = 0; index < input.count; index += 1) {
    const seed = `${input.seedNamespace}:${index}`;

    try {
      const identity = propertyIdentity(index);
      const mode = MODES[index % MODES.length]!;
      const state = playClassicCareer({
        contentVersion: CLASSIC_CONTENT_VERSION,
        identity,
        mode,
        policy: propertyChoicePolicy(seed),
        seed,
      });
      const errors = collectClassicCareerInvariantErrors(state);
      const replay = replayClassicCareer({
        choices: state.choiceLog,
        contentVersion: state.contentVersion,
        identity,
        mode,
        seed,
      });
      replayed += 1;
      const stateJson = JSON.stringify(state);
      const replayJson = JSON.stringify(replay);

      if (replayJson !== stateJson) {
        errors.push("replay does not equal the generated state");
      }

      digest = updateFnvDigest(
        digest,
        JSON.stringify({
          choices: state.choiceLog,
          projected: projectClassicGoldenState(state),
        }),
      );

      if (errors.length > 0) {
        failures.push({
          errors: Object.freeze(errors),
          index,
          seed,
        });
      }
    } catch (error) {
      failures.push({
        errors: [
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error),
        ],
        index,
        seed,
      });
    }
  }

  return {
    digest: digest.toString(16).padStart(8, "0"),
    executed: input.count,
    failures: Object.freeze(failures),
    replayed,
  };
}

export function collectClassicCareerInvariantErrors(
  state: ClassicCareerState,
): string[] {
  const errors: string[] = [];

  if (state.phase !== "summary") {
    errors.push(`phase must be summary, received ${state.phase}`);
  }
  if (state.summary === null) {
    errors.push("summary is missing");
  }
  if (state.currentDecision !== null) {
    errors.push("summary state still has a decision");
  }
  if (state.retirementReason === null) {
    errors.push("retirement reason is missing");
  } else if (!RETIREMENT_REASONS.has(state.retirementReason)) {
    errors.push(
      `retirement reason is invalid: ${state.retirementReason}`,
    );
  }
  if (state.contentVersion !== CLASSIC_CONTENT_VERSION) {
    errors.push(
      `content version drifted: ${state.contentVersion}`,
    );
  }
  if (state.choiceCursor !== state.choiceLog.length) {
    errors.push(
      `choice cursor ${state.choiceCursor} != log length ${state.choiceLog.length}`,
    );
  }
  if (!isUint32(state.rngState)) {
    errors.push(`rngState is not uint32: ${state.rngState}`);
  }
  if (!inRange(state.overall, 40, 99)) {
    errors.push(`final overall is out of range: ${state.overall}`);
  }
  if (!isNonNegativeInteger(state.marketValue)) {
    errors.push(
      `final market value is invalid: ${state.marketValue}`,
    );
  }
  if (
    state.currentClubId !== null &&
    !CLASSIC_CATALOG.clubById.has(state.currentClubId)
  ) {
    errors.push(`unknown current club: ${state.currentClubId}`);
  }

  pushDuplicateErrors(
    errors,
    "choice decision ID",
    state.choiceLog.map((choice) => choice.decisionId),
  );
  pushDuplicateErrors(
    errors,
    "season ID",
    state.seasons.map((season) => season.id),
  );
  pushDuplicateErrors(
    errors,
    "national period ID",
    state.nationalTeamPeriods.map((period) => period.id),
  );
  pushDuplicateErrors(
    errors,
    "completed event key",
    state.eventPlan.completedEventKeys,
  );
  pushDuplicateErrors(
    errors,
    "completed event slot",
    state.eventPlan.completedSlotAges.map(String),
  );

  if (
    state.eventPlan.completedEventKeys.length >
    state.eventPlan.targetCount
  ) {
    errors.push("completed event count exceeds target");
  }
  if (state.eventPlan.injuryCount > 2) {
    errors.push(
      `injury count exceeds two: ${state.eventPlan.injuryCount}`,
    );
  }

  let previousPeriodIndex = -1;

  for (const [index, season] of state.seasons.entries()) {
    if (season.index !== index) {
      errors.push(
        `season ${index} stores index ${season.index}`,
      );
    }
    if (season.age !== 16 + index) {
      errors.push(
        `season ${index} age ${season.age} is not ${16 + index}`,
      );
    }
    if (season.periodIndex < previousPeriodIndex) {
      errors.push(
        `season ${index} period index moved backward`,
      );
    }
    previousPeriodIndex = season.periodIndex;
    if (!inRange(season.overall, 40, 99)) {
      errors.push(
        `season ${index} overall is out of range: ${season.overall}`,
      );
    }
    if (!isNonNegativeInteger(season.marketValue)) {
      errors.push(
        `season ${index} market value is invalid: ${season.marketValue}`,
      );
    }
    if (!CLASSIC_CATALOG.clubById.has(season.teamId)) {
      errors.push(
        `season ${index} has unknown club ${season.teamId}`,
      );
    }
    pushStatsErrors(errors, `season ${index}`, season.stats);
  }

  for (const period of state.nationalTeamPeriods) {
    if (
      !CLASSIC_CATALOG.countryByFifaCode.has(
        period.nationalityFifaCode,
      )
    ) {
      errors.push(
        `national period has unknown country ${period.nationalityFifaCode}`,
      );
    }
    if (!isUint32(period.rngState)) {
      errors.push(
        `national period ${period.id} has invalid RNG state`,
      );
    }
    pushStatsErrors(
      errors,
      `national period ${period.id}`,
      period.stats,
    );
  }

  if (state.summary !== null) {
    const totals = calculateCareerTotals(
      state.seasons,
      state.nationalTeamPeriods,
    );

    if (
      JSON.stringify(totals) !==
      JSON.stringify(state.summary.totals)
    ) {
      errors.push("summary totals do not equal raw records");
    }
    if (state.summary.ending !== state.retirementReason) {
      errors.push("summary ending does not equal state ending");
    }
    if (!inRange(state.summary.maxOverall, 40, 99)) {
      errors.push(
        `summary max overall is invalid: ${state.summary.maxOverall}`,
      );
    }
    if (
      !isNonNegativeInteger(state.summary.maxMarketValue)
    ) {
      errors.push(
        `summary max value is invalid: ${state.summary.maxMarketValue}`,
      );
    }
    pushStatsErrors(
      errors,
      "summary national stats",
      state.summary.nationalStats,
    );

    for (const club of state.summary.clubs) {
      if (!CLASSIC_CATALOG.clubById.has(club.teamId)) {
        errors.push(
          `summary has unknown club ${club.teamId}`,
        );
      }
      pushStatsErrors(
        errors,
        `summary club ${club.teamId}`,
        club.stats,
      );
    }
  }

  return errors;
}

function propertyIdentity(index: number): ClassicIdentity {
  if (index % 997 === 0) {
    return {
      lastName: "贝利",
      nationalityFifaCode: "BRA",
      position: "ST",
      preferredNumber: 10,
    };
  }

  const country =
    CLASSIC_CATALOG.countries[
      index % CLASSIC_CATALOG.countries.length
    ]!;
  const position =
    POSITIONS[
      Math.floor(index / CLASSIC_CATALOG.countries.length) %
        POSITIONS.length
    ]!;

  return {
    lastName: `Property-${index}`,
    nationalityFifaCode: country.fifaCode,
    position,
    preferredNumber: (index % 99) + 1,
  };
}

function propertyChoicePolicy(
  seed: string,
): ClassicChoicePolicy {
  return (state, decision) => {
    if (decision.type === "no_offers_retirement") {
      return decision.options[0]!.id;
    }

    const nonRetirement = decision.options.filter(
      (option) => option.kind !== "retire",
    );
    const options =
      state.playerAge < 42 && nonRetirement.length > 0
        ? nonRetirement
        : decision.options;
    const selected = classicPick(
      deriveClassicRngState(
        seed,
        "property-choice",
        decision.id,
      ),
      options,
    ).item;

    if (decision.type !== "career_event") {
      return selected.id;
    }

    const outcome = nextClassicFloat(
      deriveClassicRngState(
        seed,
        "property-outcome",
        decision.id,
      ),
    );

    return {
      forcedOutcome:
        outcome.value < 0.5 ? "negative" : "positive",
      optionId: selected.id,
    };
  };
}

function pushStatsErrors(
  errors: string[],
  label: string,
  stats: ClassicSeasonStats,
): void {
  for (const [key, value] of Object.entries(stats)) {
    if (!isNonNegativeInteger(value)) {
      errors.push(`${label} ${key} is invalid: ${value}`);
    }
  }
}

function pushDuplicateErrors(
  errors: string[],
  label: string,
  values: readonly string[],
): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
}

function updateFnvDigest(
  initial: number,
  value: string,
): number {
  let digest = initial;

  for (let index = 0; index < value.length; index += 1) {
    digest ^= value.charCodeAt(index);
    digest = Math.imul(digest, FNV_PRIME);
  }

  return digest >>> 0;
}

function isUint32(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value > 0 &&
    value <= UINT32_MAXIMUM
  );
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function inRange(
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  return value >= minimum && value <= maximum;
}
