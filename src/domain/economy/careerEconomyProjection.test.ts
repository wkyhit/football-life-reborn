import { describe, expect, it } from "vitest";

import { CLASSIC_GOLDEN_FIXTURES } from "../../../tests/golden/fixtures";
import {
  replayClassicCareer,
  type ClassicCareerState,
} from "../classicEngine";
import {
  createCareerBranch,
  createDecisionCheckpoints,
} from "../checkpoint";
import { deterministicHash } from "../deterministicHash";
import { createCareerEconomyProjection } from "./careerEconomyProjection";

describe("career economy projection", () => {
  it("signs the academy contract and settles each completed season", () => {
    const career = replayClassicCareer({
      choices: [
        {
          decisionId: "decision-0-16-academy_offer",
          decisionType: "academy_offer",
          optionId: "join:arsenal",
        },
      ],
      identity: {
        lastName: "Loan",
        nationalityFifaCode: "ENG",
        position: "ST",
        preferredNumber: 19,
      },
      mode: "normal",
      seed: "golden:special:loan-heavy:0",
    });

    const projection = createCareerEconomyProjection(career);

    expect(projection.currentContract).toMatchObject({
      annualSalary: 20_000,
      clubId: "arsenal",
      competitionId: "premier-league",
      signedAtAge: 16,
      signedAtChoiceLogIndex: 0,
    });
    expect(projection.seasonSalaries).toEqual([
      {
        age: 16,
        annualSalary: 20_000,
        contractClubId: "arsenal",
        income: 20_000,
        seasonId:
          "golden:special:loan-heavy:0-season-0",
        seasonIndex: 0,
        suspended: false,
        teamId: "arsenal",
      },
      {
        age: 17,
        annualSalary: 20_000,
        contractClubId: "arsenal",
        income: 20_000,
        seasonId:
          "golden:special:loan-heavy:0-season-1",
        seasonIndex: 1,
        suspended: false,
        teamId: "arsenal",
      },
    ]);
    expect(projection.totalIncome).toBe(40_000);
    expect(
      projection.ledger.map((entry) => entry.kind),
    ).toEqual([
      "contract_signed",
      "salary_settled",
      "salary_settled",
    ]);
  });

  it("keeps the parent contract and salary throughout a loan", () => {
    const career = replayClassicCareer({
      choices: [
        {
          decisionId: "decision-0-16-academy_offer",
          decisionType: "academy_offer",
          optionId: "join:arsenal",
        },
        {
          decisionId: "decision-1-18-loan_offer",
          decisionType: "loan_offer",
          optionId: "loan:qpr",
        },
      ],
      identity: {
        lastName: "Loan",
        nationalityFifaCode: "ENG",
        position: "ST",
        preferredNumber: 19,
      },
      mode: "normal",
      seed: "golden:special:loan-heavy:0",
    });

    const projection = createCareerEconomyProjection(career);

    expect(projection.currentContract).toMatchObject({
      annualSalary: 20_000,
      clubId: "arsenal",
      signedAtChoiceLogIndex: 0,
    });
    expect(
      projection.ledger.map((entry) => entry.kind),
    ).toEqual([
      "contract_signed",
      "salary_settled",
      "salary_settled",
      "contract_retained",
      "salary_settled",
      "salary_settled",
    ]);
    expect(
      projection.seasonSalaries.map(
        ({ contractClubId, teamId }) => ({
          contractClubId,
          teamId,
        }),
      ),
    ).toEqual([
      { contractClubId: "arsenal", teamId: "arsenal" },
      { contractClubId: "arsenal", teamId: "arsenal" },
      { contractClubId: "arsenal", teamId: "qpr" },
      { contractClubId: "arsenal", teamId: "qpr" },
    ]);
    expect(projection.totalIncome).toBe(80_000);
  });

  it("retains the existing contract when the player stays", () => {
    const career = replayClassicCareer({
      choices: [
        {
          decisionId: "decision-0-16-academy_offer",
          decisionType: "academy_offer",
          optionId: "join:arsenal",
        },
        {
          decisionId: "decision-1-18-loan_offer",
          decisionType: "loan_offer",
          optionId: "stay",
        },
      ],
      identity: {
        lastName: "Loan",
        nationalityFifaCode: "ENG",
        position: "ST",
        preferredNumber: 19,
      },
      mode: "normal",
      seed: "golden:special:loan-heavy:0",
    });

    const projection = createCareerEconomyProjection(career);
    const retained = projection.ledger.filter(
      (entry) => entry.kind === "contract_retained",
    );

    expect(projection.currentContract).toMatchObject({
      annualSalary: 20_000,
      clubId: "arsenal",
      signedAtChoiceLogIndex: 0,
    });
    expect(retained.map((entry) => entry.reason)).toEqual([
      "stay",
    ]);
    expect(
      projection.ledger.filter(
        (entry) => entry.kind === "contract_signed",
      ),
    ).toHaveLength(1);
    expect(projection.totalIncome).toBe(80_000);
  });

  it("replaces the contract on a permanent transfer", () => {
    const career = replayClassicCareer({
      choices: [
        {
          decisionId: "decision-0-16-academy_offer",
          decisionType: "academy_offer",
          optionId: "join:wuxi-wugou",
        },
        {
          decisionId: "decision-1-17-transfer",
          decisionType: "transfer",
          optionId: "join:shaanxi-union",
        },
      ],
      identity: {
        lastName: "Veteran",
        nationalityFifaCode: "CHN",
        position: "CB",
        preferredNumber: 5,
      },
      mode: "long",
      seed: "golden:special:veteran-no-offers:0",
    });

    const projection = createCareerEconomyProjection(career);

    expect(projection.currentContract).toMatchObject({
      clubId: "shaanxi-union",
      competitionId: "china-league-one",
      signedAtAge: 17,
      signedAtChoiceLogIndex: 1,
    });
    expect(
      projection.ledger
        .filter(
          (entry) => entry.kind === "contract_signed",
        )
        .map((entry) => entry.contract.clubId),
    ).toEqual(["wuxi-wugou", "shaanxi-union"]);
    expect(
      projection.seasonSalaries.map(
        (season) => season.contractClubId,
      ),
    ).toEqual(["wuxi-wugou", "shaanxi-union"]);
  });

  it("retains repeated parent loans and signs only when the loan club keeps the player", () => {
    const fixture = requiredFixture("special-late-bloomer");
    const career = replayClassicCareer({
      choices: fixture.choices.slice(0, 6),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });

    const projection = createCareerEconomyProjection(career);

    expect(
      projection.ledger
        .filter(
          (entry) => entry.kind === "contract_signed",
        )
        .map((entry) => entry.contract.clubId),
    ).toEqual(["espanyol", "oviedo"]);
    expect(
      projection.ledger
        .flatMap((entry) =>
          entry.kind === "contract_retained" &&
          entry.reason === "loan"
            ? [entry.contract.clubId]
            : [],
        ),
    ).toEqual(["espanyol", "espanyol", "espanyol"]);
    expect(projection.currentContract).toMatchObject({
      clubId: "oviedo",
      signedAtChoiceLogIndex: 5,
    });
  });

  it("ends the old contract before a free agent signs a new club", () => {
    const fixture = requiredFixture(
      "matrix-long-creator-high",
    );
    const freeAgentChoiceIndex = fixture.choices.findIndex(
      (choice) =>
        choice.decisionType === "contract_nonrenewal",
    );
    const freeAgent = replayClassicCareer({
      choices: fixture.choices.slice(
        0,
        freeAgentChoiceIndex,
      ),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const freeAgentProjection =
      createCareerEconomyProjection(freeAgent);

    expect(freeAgentProjection.currentContract).toBeNull();
    expect(
      freeAgentProjection.ledger.at(-1)?.kind,
    ).toBe("contract_ended");
    expect(
      freeAgentProjection.optionQuotes.find(
        (option) => option.optionId === "join:mirandes",
      ),
    ).toMatchObject({
      certainty: "exact",
      clubId: "mirandes",
      kind: "new_contract",
    });

    const career = replayClassicCareer({
      choices: fixture.choices.slice(
        0,
        freeAgentChoiceIndex + 1,
      ),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });

    const projection = createCareerEconomyProjection(career);

    expect(projection.currentContract).toMatchObject({
      clubId: "mirandes",
      competitionId: "laliga-2",
      signedAtChoiceLogIndex: freeAgentChoiceIndex,
    });
    expect(
      projection.ledger
        .filter(
          (entry) => entry.kind !== "salary_settled",
        )
        .slice(-2)
        .map((entry) => entry.kind),
    ).toEqual(["contract_ended", "contract_signed"]);
    expect(
      projection.ledger
        .filter(
          (entry) => entry.kind === "contract_signed",
        )
        .at(-1),
    ).toMatchObject({
      reason: "free_agent",
    });
  });

  it("settles suspended seasons at zero and stops income at retirement", () => {
    const fixture = requiredFixture(
      "special-suspension-redemption",
    );
    const career = replayClassicCareer({
      choices: fixture.choices,
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });

    const projection = createCareerEconomyProjection(career);
    const suspended = projection.seasonSalaries.filter(
      (season) => season.suspended,
    );

    expect(suspended).toHaveLength(2);
    expect(
      suspended.map(({ annualSalary, income }) => ({
        annualSalary,
        income,
      })),
    ).toEqual([
      { annualSalary: 18_900_000, income: 0 },
      { annualSalary: 18_900_000, income: 0 },
    ]);
    expect(projection.seasonSalaries).toHaveLength(
      career.seasons.length,
    );
    expect(projection.totalIncome).not.toBe(
      projection.seasonSalaries.length *
        18_900_000,
    );
    expect(projection.currentContract).toBeNull();
    expect(
      projection.ledger
        .filter(
          (entry) => entry.kind !== "salary_settled",
        )
        .slice(-2)
        .map((entry) => entry.kind),
    ).toEqual(["contract_ended", "career_retired"]);
  });

  it("marks an outcome-dependent event transfer quote as estimated and then records one exact contract", () => {
    const fixture = requiredFixture("special-journeyman");
    const eventTransferIndex = fixture.choices.findIndex(
      (choice) =>
        choice.decisionType === "career_event" &&
        choice.optionId === "join:eibar",
    );
    const before = replayClassicCareer({
      choices: fixture.choices.slice(0, eventTransferIndex),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });

    const beforeProjection =
      createCareerEconomyProjection(before);
    const estimated = beforeProjection.optionQuotes.find(
      (option) => option.optionId === "join:eibar",
    );

    expect(estimated).toMatchObject({
      certainty: "estimated",
      clubId: "eibar",
      kind: "new_contract",
      optionId: "join:eibar",
      quote: {
        competitionId: "laliga-2",
        economyPolicyVersion:
          "2026-07-31-economy-v1",
      },
    });

    const after = replayClassicCareer({
      choices: fixture.choices.slice(
        0,
        eventTransferIndex + 1,
      ),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const signed = createCareerEconomyProjection(
      after,
    ).ledger.filter(
      (entry) => entry.kind === "contract_signed",
    );

    expect(signed.at(-1)?.contract).toMatchObject({
      clubId: "eibar",
      quote: {
        economyPolicyVersion:
          "2026-07-31-economy-v1",
      },
      signedAtChoiceLogIndex: eventTransferIndex,
    });
  });

  it("rejects a career state that its choice log cannot reproduce", () => {
    const fixture = requiredFixture("special-loan-heavy");
    const career = replayClassicCareer({
      choices: fixture.choices.slice(0, 1),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const corrupted = {
      ...career,
      overall: career.overall + 1,
    } as ClassicCareerState;

    expect(() =>
      createCareerEconomyProjection(corrupted),
    ).toThrow(
      "Career cannot be reproduced for economy projection",
    );
  });

  it("inherits the economy ledger before a branch point and replays idempotently", () => {
    const fixture = requiredFixture(
      "special-veteran-no-offers",
    );
    const parent = replayClassicCareer({
      choices: fixture.choices.slice(0, 2),
      contentVersion: fixture.contentVersion,
      identity: fixture.identity,
      mode: fixture.mode,
      seed: fixture.seed,
    });
    const checkpoint = createDecisionCheckpoints(parent)[1]!;
    const branch = createCareerBranch({
      branchId: "economy-stay-branch",
      checkpoint,
      choice: {
        decisionId: checkpoint.decisionId,
        decisionType: checkpoint.decisionType,
        optionId: "stay",
      },
      parent,
      parentCareerId: "economy-parent",
    });
    const parentBefore = {
      hash: deterministicHash(parent),
      rngState: parent.rngState,
    };

    const parentProjection =
      createCareerEconomyProjection(parent);
    const branchProjection =
      createCareerEconomyProjection(branch.career);

    expect(branchProjection.ledger.slice(0, 2)).toEqual(
      parentProjection.ledger.slice(0, 2),
    );
    expect(
      branchProjection.seasonSalaries.slice(0, 1),
    ).toEqual(
      parentProjection.seasonSalaries.slice(0, 1),
    );
    expect(branchProjection.currentContract?.clubId).toBe(
      "wuxi-wugou",
    );
    expect(parentProjection.currentContract?.clubId).toBe(
      "shaanxi-union",
    );
    expect(
      createCareerEconomyProjection(branch.career),
    ).toEqual(branchProjection);
    expect({
      hash: deterministicHash(parent),
      rngState: parent.rngState,
    }).toEqual(parentBefore);
  });

  it("projects every frozen golden career without a lifecycle gap", () => {
    const reports = CLASSIC_GOLDEN_FIXTURES.map((fixture) => {
      const career = replayClassicCareer({
        choices: fixture.choices,
        contentVersion: fixture.contentVersion,
        identity: fixture.identity,
        mode: fixture.mode,
        seed: fixture.seed,
      });
      const projection =
        createCareerEconomyProjection(career);

      expect(
        createCareerEconomyProjection(career),
      ).toEqual(projection);
      expect(projection.seasonSalaries).toHaveLength(
        career.seasons.length,
      );
      expect(
        projection.seasonSalaries.every(
          (season) =>
            season.income ===
            (season.suspended
              ? 0
              : season.annualSalary),
        ),
      ).toBe(true);
      expect(projection.totalIncome).toBe(
        projection.seasonSalaries.reduce(
          (total, season) => total + season.income,
          0,
        ),
      );

      return {
        choiceCount: career.choiceLog.length,
        id: fixture.id,
        seasonCount: projection.seasonSalaries.length,
        totalIncome: projection.totalIncome,
      };
    });

    expect(reports).toHaveLength(36);
    expect(
      reports.every(
        ({ choiceCount, seasonCount, totalIncome }) =>
          choiceCount > 0 &&
          seasonCount > 0 &&
          Number.isSafeInteger(totalIncome),
      ),
    ).toBe(true);
  });
});

function requiredFixture(
  id: string,
): (typeof CLASSIC_GOLDEN_FIXTURES)[number] {
  const fixture = CLASSIC_GOLDEN_FIXTURES.find(
    (candidate) => candidate.id === id,
  );

  if (fixture === undefined) {
    throw new Error(`Missing golden fixture: ${id}`);
  }

  return fixture;
}
