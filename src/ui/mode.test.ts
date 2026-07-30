import { describe, expect, it, vi } from "vitest";

import {
  UI_MODE_STORAGE_KEY,
  resolveUiMode,
} from "./mode";

describe("UI mode resolver", () => {
  it("gives an explicit URL mode priority, then uses a valid local preference, then Classic", () => {
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
      "classic",
    );
    expect(resolveUiMode("", null)).toBe("classic");
    expect(enhancedPreference.getItem).toHaveBeenCalledWith(
      UI_MODE_STORAGE_KEY,
    );
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
