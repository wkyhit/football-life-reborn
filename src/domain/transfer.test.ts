import { describe, expect, it } from "vitest";

import { createClassicRngState } from "./classicRng";
import { CLASSIC_CATALOG } from "./catalog/classicCatalog";
import {
  ageAdjustedTransferOverall,
  careerRetirementMinimum,
  createCatalogTransferCandidateProvider,
  generateFreeAgentOffers,
  generateLoanOffers,
  generateTransferOffers,
  loanOfferProbability,
  playerReputationLevel,
  relegationProbability,
  resolveLoanReturn,
  resolveTierChange,
  shouldTriggerContractNonRenewal,
} from "./transfer";

const provider = createCatalogTransferCandidateProvider(CLASSIC_CATALOG);

describe("Classic transfer, loan, and contract policy", () => {
  it("maps ability and age into frozen reputation and retirement bands", () => {
    expect(
      [49, 50, 64, 65, 72, 73, 77, 78, 82, 83, 86, 87, 99].map(
        playerReputationLevel,
      ),
    ).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(ageAdjustedTransferOverall(70, 20)).toBe(77);
    expect(ageAdjustedTransferOverall(70, 28)).toBe(70);
    expect(ageAdjustedTransferOverall(70, 34)).toBe(62);
    expect(ageAdjustedTransferOverall(45, 34)).toBe(45);
    expect(careerRetirementMinimum(29)).toBe(50);
    expect(careerRetirementMinimum(33)).toBe(58);
    expect(careerRetirementMinimum(38)).toBe(68);
    expect(careerRetirementMinimum(42)).toBe(77);
  });

  it("generates deterministic distinct transfer offers without catalog traversal in policy", () => {
    const input = {
      age: 24,
      currentClubId: "shanghai-port",
      nationalityConfederation: "AFC" as const,
      nationalityFifaCode: "CHN",
      overall: 80,
    };
    const first = generateTransferOffers({
      candidates: provider.all(),
      count: 2,
      player: input,
      rngState: createClassicRngState("phase-2:transfer"),
    });
    const second = generateTransferOffers({
      candidates: provider.all(),
      count: 2,
      player: input,
      rngState: createClassicRngState("phase-2:transfer"),
    });

    expect(first).toEqual(second);
    expect({
      offerIds: first.offers.map((offer) => offer.id),
      rngState: first.rngState,
    }).toEqual({
      offerIds: ["nice", "west-ham"],
      rngState: 658_288_649,
    });
    expect(first.offers).toHaveLength(2);
    expect(new Set(first.offers.map((offer) => offer.id)).size).toBe(2);
    expect(first.offers.map((offer) => offer.id)).not.toContain(
      input.currentClubId,
    );
    expect(
      first.offers.every(
        (offer) =>
          Math.abs(
            offer.internationalReputation -
              playerReputationLevel(input.overall),
          ) <= 1,
      ),
    ).toBe(true);
  });

  it("limits loans to young low-role players and returns valid local opportunities", () => {
    expect(
      loanOfferProbability({
        activeLoan: false,
        age: 20,
        completedLoan: false,
        hasEnoughSuitableClubs: true,
        predictedRole: "low_rotation",
      }),
    ).toBe(0.3);
    expect(
      loanOfferProbability({
        activeLoan: false,
        age: 20,
        completedLoan: false,
        hasEnoughSuitableClubs: true,
        predictedRole: "substitute",
      }),
    ).toBe(0.7);
    expect(
      loanOfferProbability({
        activeLoan: false,
        age: 25,
        completedLoan: false,
        hasEnoughSuitableClubs: true,
        predictedRole: "substitute",
      }),
    ).toBe(0);

    const offers = generateLoanOffers({
      candidates: provider.all(),
      count: 3,
      currentClubId: "shanghai-port",
      nationalityConfederation: "AFC",
      nationalityFifaCode: "CHN",
      overall: 76,
      rngState: createClassicRngState("phase-2:loan"),
    });

    expect(offers).not.toBeNull();
    expect({
      offerIds: offers!.offers.map((offer) => offer.id),
      rngState: offers!.rngState,
    }).toEqual({
      offerIds: [
        "beijing-guoan",
        "zhejiang",
        "shandong-taishan",
      ],
      rngState: 1_629_282_870,
    });
    expect(offers!.offers).toHaveLength(3);
    expect(
      offers!.offers.every(
        (offer) =>
          offer.countryFifaCode === "CHN" ||
          offer.confederation === "AFC",
      ),
    ).toBe(true);
    expect(
      offers!.offers.every(
        (offer) => offer.id !== "shanghai-port",
      ),
    ).toBe(true);
  });

  it("resolves loan retention and pacing-specific non-renewal pressure", () => {
    expect(resolveLoanReturn("starter")).toBe("retained");
    expect(resolveLoanReturn("high_rotation")).toBe("retained");
    expect(resolveLoanReturn("low_rotation")).toBe("not_retained");
    expect(resolveLoanReturn("third_keeper")).toBe("not_retained");

    expect(
      shouldTriggerContractNonRenewal({
        age: 26,
        lowRoleStreak: 2,
        mode: "normal",
        substituteStreak: 0,
      }),
    ).toBe(true);
    expect(
      shouldTriggerContractNonRenewal({
        age: 25,
        lowRoleStreak: 10,
        mode: "express",
        substituteStreak: 10,
      }),
    ).toBe(false);
    expect(
      shouldTriggerContractNonRenewal({
        age: 28,
        lowRoleStreak: 2,
        mode: "long",
        substituteStreak: 1,
      }),
    ).toBe(false);

    const younger = generateFreeAgentOffers({
      candidates: provider.all(),
      currentClubId: "shanghai-port",
      nationalityConfederation: "AFC",
      nationalityFifaCode: "CHN",
      overall: 76,
      age: 30,
      rngState: createClassicRngState("phase-2:free-agent"),
    });
    const veteran = generateFreeAgentOffers({
      candidates: provider.all(),
      currentClubId: "shanghai-port",
      nationalityConfederation: "AFC",
      nationalityFifaCode: "CHN",
      overall: 76,
      age: 32,
      rngState: createClassicRngState("phase-2:free-agent"),
    });

    expect(younger.allowRetire).toBe(false);
    expect({
      offerIds: younger.offers.map((offer) => offer.id),
      rngState: younger.rngState,
    }).toEqual({
      offerIds: [
        "shimizu-s-pulse",
        "kyoto-sanga",
        "fc-tokyo",
      ],
      rngState: 3_244_744_197,
    });
    expect(younger.offers).toHaveLength(3);
    expect(veteran.allowRetire).toBe(true);
    expect({
      offerIds: veteran.offers.map((offer) => offer.id),
      rngState: veteran.rngState,
    }).toEqual({
      offerIds: ["foshan-nanshi", "dalian-zhixing"],
      rngState: 3_844_932_735,
    });
    expect(veteran.offers).toHaveLength(2);
  });

  it("applies promotion and relegation as explicit tier overrides", () => {
    expect(
      resolveTierChange({
        clubDomesticReputation: 2,
        currentTier: 2,
        hasLowerTier: false,
        hasTopTier: true,
        overall: 72,
        relegationRoll: 1,
        suspended: false,
        wonLeague: true,
      }),
    ).toEqual({ relegated: false, tierOverride: 1 });

    expect(relegationProbability(72, 0)).toBeGreaterThan(0);
    expect(relegationProbability(90, 0)).toBe(0);
    expect(relegationProbability(72, 1)).toBe(0);
    expect(
      resolveTierChange({
        clubDomesticReputation: 0,
        currentTier: 1,
        hasLowerTier: true,
        hasTopTier: true,
        overall: 72,
        relegationRoll: 0,
        suspended: false,
        wonLeague: false,
      }),
    ).toEqual({ relegated: true, tierOverride: 2 });
  });
});
