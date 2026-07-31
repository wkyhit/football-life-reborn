import type { PersonalAward } from "../../domain/awards";
import type { CareerTrophy } from "../../domain/careerEvents";

export const HONOR_IDENTITY_KEYS = [
  "league",
  "cup",
  "continental_primary",
  "continental_secondary",
  "club_world_cup",
  "national_continental",
  "world_cup",
  "golden_boot",
  "golden_glove",
  "ballon_dor",
] as const satisfies readonly (
  | CareerTrophy
  | PersonalAward
)[];

export type HonorIdentityKey =
  (typeof HONOR_IDENTITY_KEYS)[number];

type HonorMotif =
  | "ball"
  | "boot"
  | "club-globe"
  | "continental-diamond"
  | "continental-star"
  | "domestic-cup"
  | "glove"
  | "league-shield"
  | "national-flag"
  | "world-globe";

type HonorIdentityDefinition = {
  readonly accent: string;
  readonly background: string;
  readonly label: string;
  readonly motif: HonorMotif;
};

export const HONOR_IDENTITIES: Readonly<
  Record<HonorIdentityKey, HonorIdentityDefinition>
> = Object.freeze({
  league: {
    accent: "#FACC15",
    background: "#422006",
    label: "联赛冠军",
    motif: "league-shield",
  },
  cup: {
    accent: "#FB7185",
    background: "#4C0519",
    label: "国内杯赛冠军",
    motif: "domestic-cup",
  },
  continental_primary: {
    accent: "#67E8F9",
    background: "#164E63",
    label: "顶级洲际赛事冠军",
    motif: "continental-star",
  },
  continental_secondary: {
    accent: "#C4B5FD",
    background: "#2E1065",
    label: "次级洲际赛事冠军",
    motif: "continental-diamond",
  },
  club_world_cup: {
    accent: "#5EEAD4",
    background: "#134E4A",
    label: "世俱杯冠军",
    motif: "club-globe",
  },
  national_continental: {
    accent: "#93C5FD",
    background: "#172554",
    label: "洲际国家队冠军",
    motif: "national-flag",
  },
  world_cup: {
    accent: "#FDE68A",
    background: "#451A03",
    label: "世界杯冠军",
    motif: "world-globe",
  },
  golden_boot: {
    accent: "#FDBA74",
    background: "#431407",
    label: "金靴奖",
    motif: "boot",
  },
  golden_glove: {
    accent: "#86EFAC",
    background: "#052E16",
    label: "金手套奖",
    motif: "glove",
  },
  ballon_dor: {
    accent: "#FDE047",
    background: "#422006",
    label: "金球奖",
    motif: "ball",
  },
});

type HonorIdentityProps = {
  readonly honor: HonorIdentityKey;
  readonly size: number;
};

export function HonorIdentity({
  honor,
  size,
}: HonorIdentityProps) {
  const identity = HONOR_IDENTITIES[honor];

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[28%] border"
      data-honor-art="local-svg"
      data-honor-identity={honor}
      data-honor-motif={identity.motif}
      style={{
        backgroundColor: identity.background,
        borderColor: `${identity.accent}66`,
        color: identity.accent,
        height: size,
        width: size,
      }}
    >
      <svg
        fill="none"
        height={Math.round(size * 0.72)}
        viewBox="0 0 48 48"
        width={Math.round(size * 0.72)}
      >
        <HonorGlyph motif={identity.motif} />
      </svg>
    </span>
  );
}

function HonorGlyph({
  motif,
}: {
  readonly motif: HonorMotif;
}) {
  const lineProps = {
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.6,
  };

  switch (motif) {
    case "league-shield":
      return (
        <>
          <path
            d="M12 9h24v13c0 8-4.8 13.8-12 17-7.2-3.2-12-9-12-17V9Z"
            {...lineProps}
          />
          <path d="m24 15 2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.2-4.3 2.2.8-4.8-3.5-3.4 4.8-.7L24 15Z" {...lineProps} />
        </>
      );
    case "domestic-cup":
      return (
        <>
          <path d="M16 9h16v9c0 6-3.2 10-8 10s-8-4-8-10V9Z" {...lineProps} />
          <path d="M16 13h-5v3c0 4 2.6 7 6.5 7M32 13h5v3c0 4-2.6 7-6.5 7M24 28v7M17 39h14M20 35h8" {...lineProps} />
        </>
      );
    case "continental-star":
      return (
        <>
          <circle cx="24" cy="24" r="15" {...lineProps} />
          <path d="m24 12 3.3 7 7.7 1-5.6 5.4 1.4 7.6-6.8-3.7-6.8 3.7 1.4-7.6-5.6-5.4 7.7-1 3.3-7Z" {...lineProps} />
        </>
      );
    case "continental-diamond":
      return (
        <>
          <path d="m24 7 15 17-15 17L9 24 24 7Z" {...lineProps} />
          <path d="m24 14 8.5 10-8.5 10-8.5-10L24 14Z" {...lineProps} />
        </>
      );
    case "club-globe":
      return (
        <>
          <circle cx="24" cy="24" r="16" {...lineProps} />
          <path d="M8 24h32M24 8c5 4.2 7.5 9.5 7.5 16S29 35.8 24 40c-5-4.2-7.5-9.5-7.5-16S19 12.2 24 8Z" {...lineProps} />
          <circle cx="24" cy="24" r="4" fill="currentColor" />
        </>
      );
    case "national-flag":
      return (
        <>
          <path d="M13 40V9M14 11c8-4 12 4 21 0v17c-9 4-13-4-21 0" {...lineProps} />
          <path d="m24 15 1.5 3 3.5.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4-2.5-2.4 3.5-.5 1.5-3Z" {...lineProps} />
        </>
      );
    case "world-globe":
      return (
        <>
          <circle cx="24" cy="19" r="10" {...lineProps} />
          <path d="M18 29c1 3 3 5 6 6M30 29c-1 3-3 5-6 6M18 40h12M21 35h6M15 19h18M24 9c3 3 4.5 6.3 4.5 10S27 26 24 29c-3-3-4.5-6.3-4.5-10S21 12 24 9Z" {...lineProps} />
        </>
      );
    case "boot":
      return (
        <>
          <path d="M10 31c6-1 10-5 11-12l8 5c3 2 6 3 10 3v8H15c-3 0-5-1-5-4Z" {...lineProps} />
          <path d="M22 22h8M19 27h8M15 35v4M23 35v4M31 35v4" {...lineProps} />
        </>
      );
    case "glove":
      return (
        <>
          <path d="M14 23V12c0-2 3-2 3 0v8-11c0-2 3-2 3 0v11-13c0-2 3-2 3 0v13-11c0-2 3-2 3 0v12-8c0-2 3-2 3 0v15c0 8-4 12-11 12-6 0-10-4-10-10v-7c0-3 4-4 6 0Z" {...lineProps} />
        </>
      );
    case "ball":
      return (
        <>
          <circle cx="24" cy="22" r="15" {...lineProps} />
          <path d="m24 14 6 4-2 7h-8l-2-7 6-4ZM9 21l9-3M14 33l6-8M39 21l-9-3M34 33l-6-8M19 8l5 6 5-6M18 37h12M24 37v4" {...lineProps} />
        </>
      );
  }
}
