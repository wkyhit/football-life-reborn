# Football Life Reborn

A private research project that clean-room reimplements the observable behavior and visual design of the Football Life career simulator, then evolves it with an enhanced UI, local career archives, parallel-life branching, and deterministic challenges.

## Status

Planning and issue decomposition. No product implementation has started.

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
