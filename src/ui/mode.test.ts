import { describe, expect, it, vi } from "vitest";

import {
  UI_MODE_STORAGE_KEY,
  resolveUiMode,
} from "./mode";

describe("UI mode resolver", () => {
  it("gives an explicit URL mode priority, then uses a valid local preference, then Enhanced", () => {
    const enhancedPreference = storageWith("enhanced");
    const classicPreference = storageWith("classic");

    expect(
      resolveUiMode("?ui=classic", enhancedPreference),
    ).toBe("classic");
    expect(
      resolveUiMode("?ui=enhanced", classicPreference),
    ).toBe("enhanced");
    expect(resolveUiMode("", enhancedPreference)).toBe(
      "enhanced",
    );
    expect(resolveUiMode("?ui=unknown", storageWith("other"))).toBe(
      "enhanced",
    );
    expect(resolveUiMode("", null)).toBe("enhanced");
    expect(enhancedPreference.getItem).toHaveBeenCalledWith(
      UI_MODE_STORAGE_KEY,
    );
  });

  it("falls back to Enhanced when local preferences are inaccessible", () => {
    expect(
      resolveUiMode("", {
        getItem: () => {
          throw new DOMException("Storage blocked");
        },
      }),
    ).toBe("enhanced");
  });
});

function storageWith(
  value: string | null,
): Pick<Storage, "getItem"> {
  return {
    getItem: vi.fn((key) =>
      key === UI_MODE_STORAGE_KEY ? value : null,
    ),
  };
}
