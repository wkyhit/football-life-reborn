import {
  cleanup,
  render,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  HONOR_IDENTITIES,
  HONOR_IDENTITY_KEYS,
  HonorIdentity,
} from "./HonorIdentity";

const EXPECTED_HONORS = [
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
] as const;

describe("HonorIdentity", () => {
  afterEach(cleanup);

  it("maps every trophy and award category to distinct deterministic local SVG art", () => {
    expect(HONOR_IDENTITY_KEYS).toEqual(EXPECTED_HONORS);
    expect(Object.keys(HONOR_IDENTITIES)).toEqual(
      EXPECTED_HONORS,
    );
    expect(
      new Set(
        Object.values(HONOR_IDENTITIES).map(
          ({ motif }) => motif,
        ),
      ).size,
    ).toBe(EXPECTED_HONORS.length);

    for (const honor of EXPECTED_HONORS) {
      const { container, unmount } = render(
        <HonorIdentity honor={honor} size={36} />,
      );
      const mark = container.querySelector(
        "[data-honor-identity]",
      );

      expect(mark).toHaveAttribute("data-honor-identity", honor);
      expect(mark).toHaveAttribute(
        "data-honor-motif",
        HONOR_IDENTITIES[honor].motif,
      );
      expect(mark).toHaveAttribute("data-honor-art", "local-svg");
      expect(mark).toHaveStyle({
        height: "36px",
        width: "36px",
      });
      expect(mark?.querySelector("svg")).not.toBeNull();
      expect(mark?.textContent).toBe("");
      unmount();
    }
  });
});
