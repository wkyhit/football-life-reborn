# Classic content versioning and golden fixtures

## Replay identity

A Classic career is identified by all four inputs:

```text
seed + identity + ordered choiceLog + contentVersion
```

`identity` includes nationality, position, preferred number, and the
name fields that can affect authorized development paths. `choiceLog`
stores literal decision IDs, decision types, option IDs, and a forced
outcome only where a reviewed fixture needs to freeze an otherwise
seeded event branch.

The current full-catalog version is
`2026-07-30-classic-v1`, exported as `CLASSIC_CONTENT_VERSION`. The
headless replay API fails closed when given another version. It also
rejects a choice when its decision ID, type, or option is not valid for
the state reconstructed up to that point.

The content version is separate from the local-storage schema version.
A storage migration may change its envelope without changing simulation
results. A rules or catalog change must not silently reinterpret an
existing content version.

## Changing simulation behavior

The committed fixtures under `tests/golden/` are external behavior
contracts, not ordinary snapshots. Do not hand-edit
`tests/golden/fixtures.ts`.

A fixture may change only when a GitHub issue explicitly documents:

1. the observed behavior or approved rule being corrected;
2. whether the correction amends the current content version or creates
   a new one;
3. the affected seeds and before/after behavior;
4. migration and rollback treatment for existing careers; and
5. fresh golden, property, regression, and production-build evidence.

If a change creates a new content version, retain the old rules and
fixtures while saved careers can still reference them. Never overwrite
an old career with results produced by different rules.

## Regenerating reviewed fixtures

The generator searches deterministic seeds for the 30-case matrix and
six named special paths. It asserts that those special paths actually
occur before emitting literal inputs and expected final states.

```bash
npm run generate:golden
npm run test:golden
npm run test:golden
npm run test:property
```

Before accepting generated changes, run the generator twice and verify
that `tests/golden/fixtures.ts` is byte-identical. Review the literal
choice logs and final states in the diff. The golden suite must pass in
two independent invocations, and the 10,000-seed digest must remain
stable unless the governing issue approves its change.

When a generated or property case fails, reproduce it with its complete
printed seed. Do not replace or skip a failing seed to make the suite
green.
