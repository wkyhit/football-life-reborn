import { useState } from "react";

import type { CareerClubPresentation } from "../careerPresentation";
import { classicCrestUrl } from "./classicCrests";

export {
  CLASSIC_CREST_IDS,
  classicCrestUrl,
} from "./classicCrests";

type ClubIdentityProps = {
  readonly club: CareerClubPresentation;
  readonly size: number;
};

export function ClubIdentity({
  club,
  size,
}: ClubIdentityProps) {
  const crestUrl = classicCrestUrl(club.id);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showCrest =
    crestUrl !== null && crestUrl !== failedUrl;
  const crestState = showCrest
    ? "image"
    : crestUrl === null
      ? "intentional-fallback"
      : "load-failure";

  return (
    <span
      aria-hidden="true"
      className="relative flex shrink-0 items-center justify-center rounded-md text-[8px] font-black leading-none"
      data-classic-club-mark=""
      data-crest-id={club.id}
      data-crest-state={crestState}
      style={{
        backgroundColor: showCrest ? "transparent" : club.color,
        color: isLightColor(club.color) ? "#18181b" : "#ffffff",
        height: size,
        width: size,
      }}
    >
      {showCrest ? (
        <img
          alt=""
          className="h-full w-full object-contain drop-shadow-[0_0_3px_rgba(255,255,255,0.55)]"
          decoding="async"
          height={size}
          loading="lazy"
          onError={() => setFailedUrl(crestUrl)}
          src={crestUrl}
          width={size}
        />
      ) : (
        club.abbreviation.slice(0, 3)
      )}
    </span>
  );
}

function isLightColor(color: string): boolean {
  const match = /^#([\dA-Fa-f]{2})([\dA-Fa-f]{2})([\dA-Fa-f]{2})$/.exec(
    color,
  );

  if (match === null) {
    return false;
  }

  const red = Number.parseInt(match[1]!, 16);
  const green = Number.parseInt(match[2]!, 16);
  const blue = Number.parseInt(match[3]!, 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 170;
}
