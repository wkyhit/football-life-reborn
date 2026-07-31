# `economy-v1` contract

Status: frozen

Policy version: `2026-07-31-economy-v1`

Frozen: 2026-07-31 (Asia/Shanghai)

## Provenance and boundary

The maintainer-approved contract is
[Issue #18](https://github.com/wkyhit/football-life-reborn/issues/18).
The reference implementation at
`https://football-life.pages.dev` was a one-time research input. The
application never fetches economy rules, remote configuration, player
data, or rankings at runtime.

`economy-v1` is a deterministic projection beside the frozen football
simulation. It accepts no RNG state, consumes no random value, does not
change the football RNG cursor, and is not included in the existing
football core-state hash.

## Market-value source

The economy policy reuses the canonical `MARKET_VALUE_CURVE` and
`baseMarketValue` from `src/domain/economics.ts`. This keeps one
interpolation implementation for both the existing football valuation
and contract quotes.

| Overall | Market value |
| ---: | ---: |
| 50 | ¥100,000 |
| 55 | ¥250,000 |
| 60 | ¥500,000 |
| 65 | ¥1,200,000 |
| 70 | ¥3,000,000 |
| 75 | ¥5,000,000 |
| 80 | ¥15,000,000 |
| 85 | ¥50,000,000 |
| 90 | ¥100,000,000 |
| 95 | ¥150,000,000 |
| 99 | ¥250,000,000 |

Values between nodes use linear interpolation. Inputs below 50 or above
99 clamp to the closest node, matching the existing football
valuation.

## Annual salary

```text
rawSalary =
  interpolatedMarketValue(overall)
  × 0.15
  × effectiveWealth
```

The quote uses the post-choice Overall, destination competition, and
career Peak Overall.

| Competition ID | Wealth | Annual cap | Fame competition |
| --- | ---: | ---: | --- |
| `premier-league` | 1.35 | — | no |
| `championship` | 0.35 | — | no |
| `laliga` | 1.05 | — | no |
| `laliga-2` | 0.25 | — | no |
| `serie-a` | 1.00 | — | no |
| `bundesliga` | 1.00 | — | no |
| `ligue-1` | 0.95 | — | no |
| `csl` | 0.90 | ¥3,000,000 | no |
| `china-league-one` | 0.30 | ¥800,000 | no |
| `j1-league` | 0.55 | — | no |
| `saudi-pro-league` | 2.00 | — | yes |
| `brasileirao` | 0.50 | — | no |

For a fame competition, `effectiveWealth` is 4.0 at Peak Overall 90
or higher, 2.7 at Peak Overall 80–89, and otherwise the competition
wealth.

Apply the rules in this order:

1. Calculate `rawSalary`.
2. If it is at least ¥1,000,000, round to ¥100,000; otherwise round to
   ¥10,000.
3. Enforce the ¥10,000 minimum.
4. Apply the destination competition cap.

`saudi-pro-league` is a policy key approved by Issue #18. It does not
add or mutate clubs in the frozen Classic catalog.

## Verification and change process

`src/domain/economy/economyPolicy.test.ts` freezes:

- all eleven market-value nodes and every node boundary ±1;
- all twelve competition policies, both fame thresholds, both caps,
  the rounding switch, and minimum salary;
- JSON-serializable output with no RNG input and no football-state
  mutation;
- 10,000 fixed inputs with digest
  `fnv1a64:4e0f8d3cd8d607a8`.

Do not edit this policy version in place after release. A rule change
requires a new policy version, exact-vector and migration fixtures, an
Issue amendment, a replay/backfill compatibility decision, and updated
documentation. Existing careers remain pinned to their recorded policy
version.
