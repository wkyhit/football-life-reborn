# Football Life Reborn

A clean-room research project that reimplements the observable behavior and
visual design of the Football Life career simulator, then evolves it with an
Enhanced UI, local career archives, parallel-life branching, deterministic
challenges, and storage-independent replay.

## Status

Phases 1 through 3 provide the deterministic simulator, frozen full
Classic catalog, and Classic visual/share-card compatibility baseline.
Phase 4 adds an Enhanced presentation over the same engine and career
state. `/` opens Enhanced by default, while `?ui=classic` preserves the
frozen compatibility experience. Phase 5 adds an Enhanced-only local
career archive, validated import/export, copy-first migration,
decision-boundary parallel lives, branch comparison, and a causal ledger.
Phase 6 adds three deterministic daily challenges, live rule progress,
challenge result cards, and storage-independent replay links.
Phase 7 gives the complete Enhanced application one Hallmark-governed
visual system while preserving the Classic and simulation contracts.
Phase 8 establishes exact-commit Vercel Git Integration delivery,
Production acceptance, and recovery boundaries. Post-roadmap
[Issue #23](https://github.com/wkyhit/football-life-reborn/issues/23) and
[Issue #25](https://github.com/wkyhit/football-life-reborn/issues/25)
harden the real career journey: complete late-career timelines, explicit Seed
intent, replay v3 presentation identity, viewport-contained workbench layout,
centered timeline follow, persistent decision feedback, exact-money
disclosure, and position-correct metrics. Issue #25 was delivered by
[PR #26](https://github.com/wkyhit/football-life-reborn/pull/26) and passed
the full Production acceptance contract.

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

## Phase 2 deterministic contract

The full Classic engine is bound to content version
`2026-07-30-classic-v1`. Its catalog contains 61 countries, 192 clubs,
11 competitions, 8 domestic cups, and 6 confederation mappings. A replay
accepts the original identity, seed, literal ordered choice log, and
content version; it rejects unknown versions and any choice whose
decision ID, type, or option does not match the reconstructed state.

Thirty-six reviewed careers under `tests/golden/` freeze representative
external behavior. A separate 10,000-seed suite exercises all countries,
positions, and pacing modes while checking exact replay and global state
invariants. See
[`docs/classic-versioning.md`](docs/classic-versioning.md) for the
content-version and fixture-change policy.

### Frozen-v1 narrative compatibility

The `2026-07-30-classic-v1` contract also covers the story a player can
observe around each deterministic transition:

- career-event choices show their frozen probability and consequence
  copy before selection, then show the single outcome already resolved
  by the engine;
- season history retains club and national trophies, personal awards,
  national-tournament results, suspension, relegation, and observable
  tier changes;
- ordinary seasons, event results, major milestones, and the next
  decision keep a stable reveal order, while reduced motion presents the
  same information immediately;
- the timeline, milestone reveal, and summary reuse local category art,
  while club marks remain limited to the 114 authorized crest files plus
  explicit fallback and load-failure states.

Reveal cursors and animation state are transient presentation data. The
player's preferred foot is likewise kept outside the frozen Classic
engine and state hash, but is carried by the version-3 session, archive,
transfer, and replay presentation profile. Legacy data without that
profile remains readable and is shown as `未记录`.

The current reference site may continue to change after this version was
frozen. Those live differences are evidence for a future versioned issue,
not permission to alter probabilities, catalog data, RNG consumption,
saved-career replay, or golden outputs in v1. Enhanced may restyle this
shared narrative contract, but it must not redefine or omit its
information.

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

Enhanced mode also keeps up to 20 named local careers. It never evicts an
archive entry automatically, and exported JSON is the durable recovery
path for explicit deletion or moving a career between browser profiles.
See [`docs/career-archive.md`](docs/career-archive.md) for the archive,
transfer, migration, branching, and recovery contracts.

Daily challenges use the `Asia/Shanghai` calendar date and remain separate
from ordinary careers. Every completed career—ordinary or challenge—can
be copied as a compact `#r=` replay URL and opened without browser storage.
Replay codec v3 identifies the route kind explicitly, so an ordinary
replay never acquires Daily Challenge identity. See
[`docs/challenges-and-replay.md`](docs/challenges-and-replay.md) for the
rules, replay schema, version policy, privacy properties, and
non-competitive product boundary.

## Enhanced and Classic UI contract

Enhanced is governed by the approved root [design.md](./design.md).
[tokens.css](./tokens.css) is its canonical runtime token source and
[tokens.json](./tokens.json) is the portable DTCG export. The system uses
three route families — Narrative Workflow / Workbench / Index-First —
with one playful night-match-ledger voice across setup, career, archive,
summary/share, branching, challenge, replay, recovery, and global states.

Enhanced presentation changes remain additive:

- route ownership, factual information architecture, engine/controller
  behavior, deterministic replay, storage formats, and share-card
  semantics do not change with the visual system;
- page and component styling consumes named colour, typography, spacing,
  radius, duration, and motion roles from the root system;
- every interactive primitive exposes semantic default, hover,
  focus-visible, active, disabled, loading, error, and success behavior;
- the machine-readable release verdict lives at
  `.hallmark/release.json`, with reviewed `ego-browser` evidence under
  `tests/visual/enhanced/after/`.

Classic is the frozen compatibility baseline. Classic renderers and tokens,
Classic reference screenshots, the `2026-07-30-classic-v1` engine/content
contract, and serialized career formats do not consume Enhanced tokens and
must remain unchanged. The renderer-neutral presentation DTO in
`src/ui/classic/careerPresentation.ts` may gain additive read-only facts for
Enhanced consumers only when Classic markup, behavior, and golden output stay
byte-identical.

### Career workbench

The Enhanced career route is a viewport-contained workbench with a semantic,
independently scrollable timeline and decision rail. The latest/current year
follows the center of the visible timeline until the player deliberately
browses history; `回到最新` restores follow. At narrow and short-landscape
boundaries, secondary visual detail compacts or hides before primary career
facts, while the complete table remains available to assistive technology.

Decision cards keep salary, role, star/core indicators, and primary risk at
the first level. A committed option remains visibly selected beside its held
result, event results require explicit acknowledgement, and the yearly story
persists the selected option, actual outcome, and actual contract exactly
once. Market value is presented in EUR; salary, contracts, and income are
presented in CNY. Compact values expose their exact amount through a
focusable, touch-sized disclosure.

See [the career workbench contract](docs/career-workbench.md) for the
responsive, interaction, semantic, and compatibility rules.

## UI modes and deployment

- `/` opens the responsive Enhanced presentation by default.
- `?ui=enhanced` explicitly selects Enhanced.
- `?ui=classic` always forces the Classic compatibility view.
- The Enhanced mode adds visible resume, country discovery, random player
  setup, semantic landmarks, keyboard/focus support, zoom support, and
  reduced-motion behavior without forking simulation state.
- Vercel Git integration deploys every non-`main` branch push to Preview
  and every `main` push to Production. The application remains a static,
  local-first build; career data stays in browser storage.
- Production is available at
  [football-life-reborn.vercel.app](https://football-life-reborn.vercel.app/).
- Release evidence follows the versioned
  [Production acceptance](docs/deployment/production-acceptance.md) contract;
  mutable commit, deployment, browser, and rollback results remain in the
  governing release pull-request and issue timelines. The latest product
  release evidence is recorded on
  [PR #26](https://github.com/wkyhit/football-life-reborn/pull/26#issuecomment-5149241659)
  and
  [Issue #25](https://github.com/wkyhit/football-life-reborn/issues/25#issuecomment-5149243876).
- Recovery follows the dashboard-only
  [rollback and restore runbook](docs/deployment/vercel-runbook.md).

## Verification

Run the current local quality gate:

```bash
npm run lint
npm run typecheck
npm test
npm run test:golden
npm run test:property
npm run test:performance
npm run test:deployment
npm run test:budget
```

Remote Preview and Production browser acceptance uses `ego-browser` against
the exact deployed commit. The repository retains `test:e2e` and
`test:visual` as optional local Playwright diagnostics, but Chrome and
Playwright output are not release acceptance evidence.

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

Post-roadmap product releases:

- [Career narrative parity](https://github.com/wkyhit/football-life-reborn/issues/14)
- [Deterministic economy and contract storytelling](https://github.com/wkyhit/football-life-reborn/issues/18)
- [Complete career UX and Replay v3](https://github.com/wkyhit/football-life-reborn/issues/23)
- [Responsive workbench and persistent decision feedback](https://github.com/wkyhit/football-life-reborn/issues/25)

## Delivery workflow

- GitHub issues are the source of truth.
- Each phase is delivered through red → green → refactor TDD slices.
- Development progress and verification evidence are recorded in the relevant issue.
- Every implementation pull request links its phase issue.
- The frozen Classic experience remains the visual and behavioral compatibility baseline.
- Enhanced pages share one Hallmark-governed design system and must pass its audit, responsive, accessibility, and anti-slop release gates.
- Vercel Preview, automatic exact-merge-SHA Production, full-story
  `ego-browser` verification, and rollback readiness are required before
  release closure.

## Product boundaries

- Research-oriented public source and a publicly reachable Vercel demo.
- Static, local-first application with no required runtime backend.
- No accounts, payments, multiplayer, live match engine, or competitive leaderboard in the approved scope.
- Brand, club, and crest usage has been confirmed as authorized for this project.
- The deployment target is Vercel's provided domain; a custom domain and public marketing launch are outside the approved roadmap.
