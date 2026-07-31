# Economy migration and benchmark runbook

Status: economy migration v1 implemented; percentile benchmark pending
Issue #18 Slice 6

## Compatibility matrix

| Surface | Legacy read | Current write | Backfill source |
| --- | --- | --- | --- |
| Active Classic session | schema v1 key | schema v2 key | identity, mode, seed, choice log |
| Archive index and payload | schema v1 keys | schema v2 keys | archived career and choice log |
| Career transfer | format v1 | format v2 | transferred career and choice log |
| Replay hash | codec v1 | codec v2 | compact identity, seed, choices, football hash |
| Branch archive | schema v1 archive | schema v2 archive | branch career choice log |

Every v1 reader maps the missing policy field to
`2026-07-31-economy-v1`. Backfill always calls
`createCareerEconomyProjection`; no reader estimates income from cached
index values. New envelopes include `economyPolicyVersion`. Archive
indexes cache `totalIncome` only for list rendering.

The football career state, Classic content version, RNG cursor, and
football `stateHash` remain unchanged. Economy compatibility is checked
separately.

## Local-storage migration

Application startup calls `migrateEconomyStorageV1ToV2` before loading
the active career. The migration uses this order:

1. Read the completion receipt. A valid receipt makes subsequent runs
   byte-for-byte no-ops.
2. Copy all discoverable v1 active-session, archive-index, and indexed
   archive-payload bytes to
   `football-life-reborn:migration:economy-v1-to-v2:backup`.
3. Hash and validate that backup through the public v1 readers.
4. Validate any existing v2 targets and reject conflicting archive
   IDs.
5. Snapshot every v2 target that may be written.
6. Write and read back the v2 active session, archive payloads, and
   archive index.
7. Write
   `football-life-reborn:migration:economy-v1-to-v2:receipt` last.

The report records active-session disposition, migrated and preserved
archive IDs, all retained legacy keys, and the backup source hash.
Statuses are `empty`, `migrated`, `already_migrated`,
`invalid_source`, `invalid_target`, or `unavailable`.

The migration never deletes a v1 key. A user action that explicitly
starts a new career may remove both active-session keys so that the
retained v1 session cannot reappear after the v2 session is discarded.
Archive v1 keys remain rollback inputs.

## Failure and rollback

Invalid or incomplete v1 data is backed up before validation and is not
partially written to v2. A storage/quota failure during any v2 write or
the final receipt restores all touched v2 keys to their pre-migration
bytes. The backup and every v1 source key remain in place. A failed
rollback is reported distinctly and never replaced with a success
receipt.

For an operational rollback:

1. Preserve the backup and receipt bytes as evidence.
2. Remove only the v2 active-session key and the v2 archive IDs listed
   in `report.migratedArchiveIds`; do not broadly clear site storage.
3. Restore any source bytes from `backup.sources` only if a retained v1
   key no longer matches them.
4. Remove the economy migration receipt so the validated migration can
   run again.
5. Reload and verify the v1 career through the backward reader before
   attempting another migration.

Transfer and replay inputs do not mutate local storage while decoding.
A v1 transfer/replay is normalized in memory, its original checksum is
verified first, and import persistence then uses the v2 archive writer.

## Verification fixtures

`src/storage/migrations/migrations.test.ts` freezes:

- v1 active-session and real branched-archive backfill;
- retained legacy bytes and recoverable backup contents;
- v2 read-back with the same deterministic career and total income;
- duplicate-run byte stability;
- missing fields and damaged payload rejection;
- quota failure with complete v2 rollback.

Repository, transfer, and replay suites separately freeze their v1
readers, v2 writers, policy-version checks, derived economy equality,
and unchanged football hashes.

## Percentile benchmark

The deterministic 10,000-career generator, its 100-entry frozen table,
input metadata, and artifact hash are delivered in Issue #18 Slice 6.
This section must be replaced with the exact generator command, seed
contract, runtime, and reproducibility digest before Issue #18 closes.
