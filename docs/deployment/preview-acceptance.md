# Vercel Preview product acceptance

This contract defines the remote product gate for every exact-commit Vercel
Preview. The mutable commit, deployment URL, Ready status, build duration, and
test result belong in the GitHub issue or pull-request timeline; they are not
committed here.

All remote interaction and Vercel read-back use `ego-browser`. Browser checks
must run against the unique Preview URL for the exact pushed commit, from clean
storage unless a story explicitly verifies persistence. Chrome and Playwright
are not part of this delivery gate.

Production builds do not publish `visual.html`. Local visual fixtures remain
useful for deterministic development tests, but a remote request for that path
falls through the SPA rewrite and cannot prove a career or summary state.
Preview acceptance therefore drives real application entry, setup, career,
archive, summary, challenge, and replay states.

## Preview story matrix

| Story ID | Required remote behavior |
| --- | --- |
| `attacker-career` | Create a seeded attacker, inspect salary and consequence hierarchy, choose through the actual-result/reveal sequence, retire, and verify contract history, income, percentile, honors, and narrative. |
| `career-workbench` | From clean storage, create real attacker and goalkeeper careers through the application setup flow. At 195×415, 390×667, 568×320, and 1280×830 require bounded document geometry, fixed timeline chrome, a readable centered current year, compact history, first-level salary/role/stars/risk, a selected choice beside its held result, persisted yearly choice/outcome/contract detail, 44×44 exact-money disclosure, position-correct metrics and semantic rows, deliberate follow suspension, and a working return-to-latest action. Repeat the Classic compatibility check at 390×667. |
| `mid-career-resume` | Reload a saved career, resume it from local storage, and verify that the raw saved state and deterministic output do not change. |
| `share-card` | Download the rendered PNG, verify 1080×1720 dimensions, decode its QR payload, and require the current public origin. |
| `archive-round-trip` | Export an archive, clear/delete its local entry, import the downloaded file, reopen it, and recover the same summary. |
| `parallel-branch` | Branch at a real checkpoint, choose another outcome, finish the branch, and compare both deterministic lives. |
| `one-club-challenge` | Enter the challenge from clean state, complete all goals while retaining one club, and verify the challenge summary. |
| `replay-deep-link` | Open the generated replay hash with empty storage, hard reload, and require the same read-only result with no runtime API request or hash leakage into resource URLs. |
| `ui-resilience` | Verify empty, loading, error/recovery, long-name, and missing-crest fallbacks plus responsive, accessibility, motion, zoom, keyboard, console, network, and performance boundaries. |

The `career-workbench` story enforces the stable product behavior in
[`docs/career-workbench.md`](../career-workbench.md); the table above is the
remote release matrix, not a replacement for that functional contract.

Stop at the first failed boundary. Fix it, rerun that story from a clean
fixture, and then restart the remaining matrix; a homepage-only smoke cannot
replace any story.

## UI and viewport matrix

- Exercise Classic and Enhanced entry/setup/career/summary surfaces.
- Treat 195×415 and 390×667 as required career-workbench reflow/mobile
  boundaries, and 568×320 as its short-landscape boundary.
- Check 320, 375, 414, 768, 1280, and 1440 CSS-pixel widths with no document
  overflow, clipped action, or failed first-party asset.
- Verify 200% reflow by halving the CSS viewport while preserving readable
  content and usable controls.
- Apply `prefers-reduced-motion: reduce`; require spatial transforms to
  collapse, animation to stop, and transitions to become 150 ms opacity-only
  without hiding state changes.
- Audit the application `#root` with `axe-core` WCAG 2 A/AA and 2.1 A/AA
  rules. Browser-owned ego overlays are outside the application scope.
- Traverse the semantic focus order, require visible `:focus-visible` styling,
  native button/link/input semantics, a working skip target, labelled dialogs,
  and live status updates.

Classic supporting copy must retain at least 4.5:1 contrast against the canvas,
translucent surface, and selected accent-soft backgrounds.

## Runtime and performance gate

- Drain browser events before each story and fail on an uncaught exception,
  console error, mixed content, or first-party response status of 400 or above.
- Require no unexpected `/api/` or other business-data network request; all
  career, challenge, archive, and replay behavior remains client-side.
- Require initial JavaScript at or below 150 KB gzip, CSS at or below 15 KB
  gzip, and cumulative layout shift below 0.1.
- Direct routes and replay hashes must render after a hard reload. HTML
  revalidates, while hashed assets retain immutable one-year caching.
- Downloads must be inspected as files rather than inferred from a successful
  button click.

The exact Preview is accepted only after these product checks and the
deployment mapping in `vercel-delivery.md` both pass.
