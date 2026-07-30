export const PACING_CONFIGS = {
  long: {
    lowRotationPeriodsBeforeNonRenewal: 3,
    periodLengthSeasons: 1,
    personalEventCount: [6, 7],
    substitutePeriodsBeforeNonRenewal: 2,
  },
  normal: {
    lowRotationPeriodsBeforeNonRenewal: 2,
    periodLengthSeasons: 2,
    personalEventCount: [3, 4],
    substitutePeriodsBeforeNonRenewal: 1,
  },
  express: {
    lowRotationPeriodsBeforeNonRenewal: 2,
    periodLengthSeasons: 3,
    personalEventCount: [2, 3],
    substitutePeriodsBeforeNonRenewal: 1,
  },
} as const;

export type PacingMode = keyof typeof PACING_CONFIGS;
