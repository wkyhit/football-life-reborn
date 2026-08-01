# Economy migration and benchmark runbook

Status: accepted release contract
Issue #18 Slices 3, 6, and 8

## Architecture decision record

Decision status: accepted on 2026-07-31.

Contract economy remains a deterministic projection beside the frozen
football state. New writes use schema v2; v1 active sessions, archives,
transfers, and replay inputs remain readable through explicit,
versioned adapters. Migration preserves the original bytes, writes a
recoverable backup before any v2 target, and records completion only
after read-back succeeds.

This keeps football RNG, the Classic content version, and the existing
football state hash unchanged while allowing contract and income data
to evolve independently. The trade-off is a one-time replay cost for
legacy data. That cost is bounded below and must not be moved into UI
components or replaced by cached totals as the reconstruction source.

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

Within one repository instance, a successfully backfilled v1 archive
index is cached against its exact raw index bytes. The first list may
read and replay each indexed v1 payload; repeated lists read only the
v2 and v1 index keys. Any v1 index-byte change invalidates the cache,
and a v2 index always takes precedence. This is safe because retained
v1 payloads are immutable rollback inputs; archive detail loading still
reads and validates the selected payload.

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

## Release performance budgets

Run the deterministic budget suite from the repository root:

```sh
npm run test:performance
```

`tests/performance/economy-release-budgets.test.ts` freezes three
release workloads:

- all 14 long-mode golden careers projected 25 times after warm-up in
  at most 1,500 ms;
- a maximum-capacity migration of 20 v1 archives in at most 120 storage
  reads and 45 storage writes, with no deletes;
- a maximum-capacity v1 archive list that may read all 20 payloads once
  but performs only the two index reads on subsequent lists.

The elapsed-time budget intentionally has wide CI headroom;
deterministic fixture count and storage-operation budgets are the
primary regression signals. Tightening a budget requires evidence from
both local and CI runs. Raising one requires an Issue decision and an
explanation in this runbook.

## Percentile benchmark

Regenerate the frozen table from the repository root:

```sh
npm run generate:benchmark
```

The generator runs 10,000 complete Classic careers through the public
engine and records the 1st through 100th percentile of peak Overall.
Its fixed inputs are:

- seed namespace: `football-life-reborn:percentile:v1`;
- choice strategy: `fnv1a64-uniform-valid-option-v1`;
- benchmark version: `2026-07-31-max-overall-v1`;
- every 61-country, 12-position, and 3-pacing-mode dimension;
- current Classic content and economy policy versions.

The generated artifact lives at
`src/domain/economy/percentileTable.generated.ts`. The accepted
artifact has 100 monotonic entries, reports
`fnv1a64:9e9a27c38474e25e`, and prints:

```text
fnv1a64:9e9a27c38474e25e · 10000 careers
```

`src/domain/economy/percentileBenchmark.test.ts` rebuilds the artifact
twice, checks the frozen metadata and digest, and exercises percentile
boundaries. Regenerate and review the artifact whenever Classic
content, the economy policy, or the benchmark contract changes. A
digest change without an intentional input-version change is a
reproducibility failure.

## Historical Issue #9 handoff gate

The Phase 8 Issue #9 release began only after the Issue #18 branch passed and
recorded:

```sh
npm run test:golden
npm run test:property
npm run test:performance
npm test
npm run test:budget
npm run typecheck
npm run lint
```

Browser evidence must use the project-designated `ego-browser` and
cover Classic and Enhanced at 390×844 and 1280×830, the
320/375/414/768/1280/1440 width matrix, attacker and goalkeeper paths,
the required event/transfer/loan/suspension/honor/retirement stories,
keyboard and focus behavior, reader semantics, reduced motion, reload,
v1 migration, import, replay, and branching consistency. Playwright and
Chrome output are not accepted as Issue #18 browser evidence.

The handoff comment included the exact Issue #18 commit, Preview
deployment URL, command results, `ego-browser` task-space evidence, and
any intentional Classic screenshot delta. Production deployment, recovery
readiness, and the final public story journey were then governed by Issue #9.
Current releases use the generic
[Vercel delivery](deployment/vercel-delivery.md) and
[Production acceptance](deployment/production-acceptance.md) contracts rather
than treating Issue #9 as a permanent release boundary.

No temporary compatibility branch remains in the economy path. The v1
readers and migration adapters are deliberate versioned support
surfaces and must be removed only by a separately approved retention
decision.
