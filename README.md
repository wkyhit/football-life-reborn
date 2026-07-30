# Football Life Reborn

A private research project that clean-room reimplements the observable behavior and visual design of the Football Life career simulator, then evolves it with an enhanced UI, local career archives, parallel-life branching, and deterministic challenges.

## Status

Phase 1 now provides a playable deterministic vertical slice on its
issue branch. It covers one Chinese striker career from age 16 through
retirement. Later roadmap phases remain intentionally out of scope until
their preceding pull requests are accepted.

## Phase 1 scope

- Classic landing and player setup for China, identity, and striker
  position.
- Standard pacing with one decision every two simulated seasons.
- A frozen 16-club Chinese Super League catalog.
- Eight event types covering academy offers, transfers, loans, training,
  workload, and retirement.
- Seeded simulation from the `seed=<id>` URL query and an ordered
  `choiceLog`.
- Schema-versioned local recovery with non-destructive quarantine for
  corrupt or unsupported data.

The same `seed + choiceLog + contentVersion` must always produce the same
career. Simulation code does not use wall-clock time, render count, or
ambient randomness.

## Local development

Requirements:

- Node.js 22.22.0, recorded in `.nvmrc`.
- npm 10 or later.

Install and start the application:

```bash
fnm use --install-if-missing
npm ci
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`. To replay a
known seed, open a URL such as:

```text
http://localhost:5173/?seed=phase-1%3Amy-career
```

The active save uses `football-life-reborn:career:v1`. Invalid data is
copied to a content-addressed
`football-life-reborn:career:quarantine:<hash>` key before a new career can
replace the active slot.

## Verification

Install the Playwright-managed Chromium revision once:

```bash
npx playwright install chromium
```

Run the complete Phase 1 gate:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The E2E suite completes the full career in pinned Chromium at 390×667 and
1280×830. Failure traces, screenshots, and reports are written under
`output/playwright/`.

## GitHub roadmap

- [Roadmap epic](https://github.com/wkyhit/football-life-reborn/issues/1)
- [Phase 1: playable deterministic vertical slice](https://github.com/wkyhit/football-life-reborn/issues/2)
- [Phase 2: Classic simulation and content parity](https://github.com/wkyhit/football-life-reborn/issues/3)
- [Phase 3: Classic visual parity and local share card](https://github.com/wkyhit/football-life-reborn/issues/4)
- [Phase 4: Enhanced UI, accessibility, and metadata](https://github.com/wkyhit/football-life-reborn/issues/5)
- [Phase 5: career archive and parallel-life branching](https://github.com/wkyhit/football-life-reborn/issues/6)
- [Phase 6: deterministic challenges and replayable sharing](https://github.com/wkyhit/football-life-reborn/issues/7)
- [Phase 7: Hallmark audit and full Enhanced UI redesign](https://github.com/wkyhit/football-life-reborn/issues/8)
- [Phase 8: Vercel deployment and production journey verification](https://github.com/wkyhit/football-life-reborn/issues/9)

## Delivery workflow

- GitHub issues are the source of truth.
- Each phase is delivered through red → green → refactor TDD slices.
- Development progress and verification evidence are recorded in the relevant issue.
- Every implementation pull request links its phase issue.
- The frozen Classic experience remains the visual and behavioral compatibility baseline.
- Enhanced pages share one Hallmark-governed design system and must pass its audit, responsive, accessibility, and anti-slop release gates.
- Vercel Preview, Production, promotion, full-story browser verification, and rollback evidence are required before roadmap closure.

## Product boundaries

- Private research use.
- Static, local-first application with no required runtime backend.
- No accounts, payments, multiplayer, live match engine, or competitive leaderboard in the approved scope.
- Brand, club, and crest usage has been confirmed as authorized for this project.
- The deployment target is Vercel's provided domain; a custom domain and public marketing launch are outside the approved roadmap.
