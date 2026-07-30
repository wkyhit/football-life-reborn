import type { ArchiveStorageLike } from "./archiveRepository";

export const ACTIVE_ARCHIVE_ID_STORAGE_KEY =
  "football-life-reborn:archive:active-id:v1" as const;

export function readActiveArchiveId(
  storage: ArchiveStorageLike,
): string | null {
  try {
    const value = storage.getItem(
      ACTIVE_ARCHIVE_ID_STORAGE_KEY,
    );

    return value !== null &&
      /^[A-Za-z0-9_-]{1,80}$/.test(value)
      ? value
      : null;
  } catch {
    return null;
  }
}

export function writeActiveArchiveId(
  storage: ArchiveStorageLike,
  id: string | null,
): boolean {
  try {
    if (id === null) {
      storage.removeItem(ACTIVE_ARCHIVE_ID_STORAGE_KEY);
    } else {
      storage.setItem(ACTIVE_ARCHIVE_ID_STORAGE_KEY, id);
    }

    return true;
  } catch {
    return false;
  }
}
