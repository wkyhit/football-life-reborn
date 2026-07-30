export type UiMode = "classic" | "enhanced";

export const UI_MODE_STORAGE_KEY =
  "football-life.ui-mode";

type UiModeStorage = Pick<Storage, "getItem">;

export function resolveUiMode(
  search: string,
  storage: UiModeStorage | null,
): UiMode {
  const urlMode = new URLSearchParams(search).get("ui");

  if (isUiMode(urlMode)) {
    return urlMode;
  }

  try {
    const storedMode = storage?.getItem(
      UI_MODE_STORAGE_KEY,
    );

    return isUiMode(storedMode) ? storedMode : "classic";
  } catch {
    return "classic";
  }
}

function isUiMode(value: string | null | undefined): value is UiMode {
  return value === "classic" || value === "enhanced";
}
