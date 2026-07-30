# Career archive, portability, and recovery

Phase 5 adds a local Enhanced-mode archive without changing the frozen
Classic state or simulation contract. A career is still reproduced from
its exact `seed + choiceLog + contentVersion + identity + mode`. Archive
metadata, checkpoints, and the causal ledger are derived around that
state and are validated by replay when read or imported.

## Local storage contract

Archive schema version 1 uses these browser-local keys:

| Key | Purpose |
| --- | --- |
| `football-life-reborn:archive:index:v1` | Compact archive entries used to render the list |
| `football-life-reborn:archive:career:v1:<id>` | Full career, checkpoints, and ledger for one entry |
| `football-life-reborn:archive:active-id:v1` | ID of the career currently open in Enhanced mode |
| `football-life-reborn:career-transfer:quarantine:<hash>` | Exact rejected, unsupported, conflicting, or over-capacity import bytes |
| `football-life-reborn:migration:classic-session-v1-to-archive-v1:stage` | Copy-first migration source and source hash |
| `football-life-reborn:migration:classic-session-v1-to-archive-v1:receipt` | Completed migration receipt |

The index contains only the stable ID, display name, timestamps,
identity, seed, pacing mode, content version, status, compact progress,
and final-summary preview. Full career data is kept in its own payload.
Entries are ordered by most recent `updatedAt`, then by ID, so the same
stored bytes produce the same list order.

Archive names are trimmed and must contain 1 to 80 characters. Archive
IDs contain 1 to 80 ASCII letters, digits, underscores, or hyphens.

## Capacity and deletion

The archive holds at most 20 full careers. When it is full, create,
duplicate, import, migration, and undo operations return an explicit
capacity result. Nothing silently evicts the oldest entry.

Free space through a deliberate workflow:

1. Export any career that needs a durable backup.
2. Choose **Delete**, then **Confirm delete**.
3. Use **Undo delete** during the same page session if the deletion was
   accidental.
4. Import the exported JSON when the career is needed again.

The undo buffer is memory-only and single-use. It does not survive a
reload or browser restart. An exported JSON file is the durable backup.
Delete and update operations roll index and payload writes back when a
storage write fails.

## Export and import format

Exports are UTF-8 JSON documents with:

- `format: "football-life-reborn/career-archive"`
- `formatVersion: 1`
- an `archive` object containing the ID, name, timestamps, exact Classic
  career, all pre-decision checkpoints, and the causal ledger
- a deterministic `checksum`

The checksum is a consistency guard, not a cryptographic signature.
Before an import becomes visible, the parser:

1. accepts only the exact version-1 document shape;
2. checks the format marker, format version, and checksum;
3. requires the supported Classic content version;
4. replays the career from its deterministic inputs and compares the
   complete state;
5. recomputes and compares every checkpoint and ledger entry; and
6. rejects an existing archive ID instead of overwriting it.

Invalid JSON, schema mismatches, checksum failures, replay mismatches,
unsupported versions, duplicate IDs, and over-capacity imports preserve
the original bytes under a content-addressed quarantine key whenever
browser storage is available. Reimporting the same bytes reuses the same
quarantine record rather than discarding it.

Do not hand-edit an export to resolve a conflict. Keep the original file,
rename or delete the conflicting local archive through the UI, and retry
the unchanged export.

## Copy-first Classic migration

Enhanced mode performs the legacy Classic-session migration only when no
active archive ID exists. The pipeline is deliberately copy-first:

1. Read the original
   `football-life-reborn:classic-session:v1` bytes.
2. Copy those exact bytes into the versioned stage with a source hash,
   deterministic `legacy-<hash>` archive ID, and stable timestamp.
3. Validate and replay the staged copy.
4. Create the archive payload and swap in the archive index entry.
5. Write the completion receipt.

The original Classic key and staged copy are never removed. If execution
stops before the copy, after the copy, or after the index swap, reopening
Enhanced mode resumes from the existing stage. A rerun accepts an
existing archive only when its career is byte-equivalent, writes a
missing receipt, and then remains byte-for-byte stable on later runs.

An invalid source, stage, receipt, ID conflict, or full archive stops the
migration without replacing the original Classic data. Classic mode does
not run the archive migration and never writes archive entries.

## Checkpoints, parallel lives, and ledger

A checkpoint is created only at a valid pre-decision boundary. It records
the age, decision ID and type, choice-log length, RNG state, seed, content
version, and deterministic state hash.

Creating a parallel life:

- verifies that the checkpoint belongs to the selected parent;
- replays the parent choice-log prefix to the checkpoint;
- requires a different choice from the historical parent choice;
- creates an independent archive ID; and
- leaves the parent career and choice-log bytes unchanged.

Two lives can be compared only when seed, content version, identity, and
pacing mode all match. The comparison covers ability and market-value
curves, club tenures, totals, all trophy and award categories,
national-team stats/results/trophies, divergence point, and ending.

The causal ledger is another deterministic replay projection. Entries
link growth, role, event, injury, suspension, value, trophy, and award
effects to the triggering decision and, where applicable, season. It
does not add fields to or change the outcome of `ClassicCareerState`.

## Recovery playbook

Use these steps in order:

1. Reload Enhanced mode after an interrupted save or migration. The
   repository and migration are idempotent and attempt safe recovery.
2. If an archive is full, export and explicitly delete one entry. Do not
   clear site data.
3. If an import reports a conflict, keep the original export and remove
   or rename the local conflicting entry through the archive UI.
4. If an import is rejected or unsupported, retain both the source file
   and its quarantine record. A newer compatible build can retry the
   exact bytes.
5. If only the active pointer is invalid, archive payloads remain
   independent and can still be opened from the archive list.
6. If a migration stage or receipt is invalid, preserve the original
   Classic key and all migration keys for diagnosis. Do not manually
   rewrite hashes, checkpoints, ledgers, or career state.

All data stays in the current browser profile. There is no account,
backend, cloud synchronization, or automatic cross-device copy.
