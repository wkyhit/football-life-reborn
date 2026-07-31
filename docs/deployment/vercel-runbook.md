# Vercel Production rollback and restore runbook

This drill changes only the public Production alias. Run every dashboard and
browser action with `ego-browser` in the existing task space.
Do not rebuild, redeploy, or change repository configuration during recovery.

## Preconditions

Resolve both immutable targets from the Vercel dashboard before opening any
release action:

- the intended release created from the accepted Issue #9 merge;
- the previous known-good release currently eligible for recovery.

For each target, read back its full commit SHA, unique deployment URL,
Target: `Production`, Status: `Ready`, Git ref, and build/error state. Confirm
the intended release passed Production acceptance and the previous known-good
release passed its original health gate.

Do not act when either target is ambiguous, missing, not `Ready`, mapped to the
wrong commit, or represented by more than one candidate. Never choose a target
from relative age, display order, or a truncated commit alone.

## Dashboard drill

1. In the Vercel dashboard, open the exact intended and previous deployment
   cards resolved in Preconditions. Keep their commit and public unique URL
   evidence visible before selecting an action.
2. Roll back to the previous known-good release with the dashboard's
   Production rollback/promote control. Confirm only the already-built target;
   do not request a rebuild.
3. Wait for the Production alias to finish changing. Read the alias back from
   the dashboard and public origin; it must map to the previous release before
   continuing.
4. Run the rollback health check from clean storage: Enhanced root, Classic
   root, one direct route plus hard reload, immutable hashed asset headers, no
   failed first-party asset, no console error, and no unexpected `/api/`
   request.
5. Restore the intended release with the dashboard's Production
   rollback/promote control for the already-built intended deployment.
6. Again wait for the Production alias to finish changing and prove that the
   public origin maps to the intended merge commit.
7. Run the restored-release health check with the same clean-context checks,
   then verify one persisted deterministic decision/resume boundary and one
   storage-independent replay hash.

Stop after any mismatched alias, non-Ready transition, dashboard error, failed
health check, browser-control handoff, or unexpected build. Preserve the last
known-good alias and report the failed boundary instead of improvising another
action.

## Drill evidence block

- Drill started: `<ISO timestamp and timezone>`
- Intended release SHA / URL: `<merge SHA and unique public deployment URL>`
- Previous release SHA / URL: `<known-good SHA and unique public deployment URL>`
- Rollback action and completion: `<dashboard action and completion time>`
- Rollback alias read-back: `<public alias, expected SHA, observed status>`
- Rollback health check: `<ego-browser task and passed assertions>`
- Restore action and completion: `<dashboard action and completion time>`
- Restored alias read-back: `<public alias, intended SHA, observed status>`
- Restored-release health check: `<ego-browser task and passed assertions>`
- Console/network error scan: `<no errors or exact blocking evidence>`

Write the completed block to the Issue #9 and final pull-request timelines.
Never record credentials, account identifiers, project identifiers, or internal deployment identifiers. Public deployment URLs and Git commit SHAs are the
durable release evidence.
