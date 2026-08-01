# Enhanced career workbench contract

Status: current

Governing delivery:
[Issue #25](https://github.com/wkyhit/football-life-reborn/issues/25) /
[PR #26](https://github.com/wkyhit/football-life-reborn/pull/26)

The career workbench is an Enhanced presentation over the deterministic
Classic career controller. It may add read-only presentation facts and
interaction state, but it does not change football simulation, RNG
consumption, catalog data, economy rules, state hashing, or Classic markup and
behavior.

## Information architecture

The route has three bounded regions:

1. a compact career header with identity, age, club, Overall, primary metrics,
   market value, and annual salary;
2. a semantic season timeline whose chrome stays fixed while only year rows
   scroll;
3. an independently scrollable decision rail containing challenge progress,
   decision options, held results, and milestone state.

The page itself must not gain horizontal overflow or blank document-level
scroll space. When content exceeds the available height, the timeline rows and
decision rail own scrolling; the application shell remains viewport-bound.

## Responsive behavior

| Boundary | Required layout |
| --- | --- |
| Desktop, at least 1024 CSS px wide | Flexible timeline plus a fixed 380 px decision rail. Both columns remain within the viewport and do not overlap. |
| Mobile and portrait tablet | Header, timeline, and decision rail stack in task order. Timeline and rail retain separate internal scroll regions. |
| At most 359 CSS px wide | Timeline tracks, gaps, and padding compact before content is removed. |
| At most 260 CSS px wide | Secondary player badges and the redundant current-page nav label hide; the primary fact strip compacts; timeline and rail split the remaining height and keep independent scrolling. |
| At most 220 CSS px wide | The last two visual metric columns hide. The semantic table still exposes all six columns and every cell to assistive technology. |
| At most 1023 CSS px wide, at most 500 CSS px high, landscape | Timeline and decision rail switch to a side-by-side 3:2 layout; header density reduces and the rail uses a left divider rather than stacking below. |

The pinned acceptance sizes are 195×415, 390×667, 568×320, and 1280×830.
Interactive controls and amount disclosures remain at least 44×44 CSS px.
Compact historical season summaries remain at least 44 CSS px high.

## Timeline and follow state

- The timeline heading and six column headers sit outside the scrollable year
  region.
- In decision state, the current row uses `aria-current="step"`; season facts
  that do not yet exist remain `—`. In reveal state, follow anchors the latest
  revealed completed season, which is not marked current. The active anchor is
  centered within the visible timeline to within 1 CSS px when follow is
  active. Dynamic row or container height changes recalculate the center.
- Arrow/Page/Home/End/Enter/Space history navigation, a primary pointer down,
  touch start, wheel input, or scrollbar interaction suspends follow so the
  player can inspect history without being pulled back.
- When follow is suspended, `回到最新` is visible. Activating it restores
  follow and recenters the current row.
- Reduced motion uses an instant scroll; otherwise the return may use the
  approved functional smooth motion.
- Completed seasons default to compact summaries and expose their economy and
  story detail through native disclosure. Unwritten future rows remain
  distinguishable from completed seasons.

## Metrics and money

The timeline is one semantic table with these six columns:

| Player type | Columns |
| --- | --- |
| Outfield | 年龄 / 俱乐部 / 能力 / 出场 / 进球 / 助攻 |
| Goalkeeper | 年龄 / 俱乐部 / 能力 / 出场 / 零封 / 失球 |

Visual compaction never removes the corresponding row header or cells from the
accessibility tree. Completed rows retain club identity, Overall, and
position-correct metrics; the current decision row exposes its age/current
state while unknown season facts stay `—`.

The amount contract is:

- market value: EUR;
- salary, contract amounts, and income: CNY;
- first level: compact value;
- second level: exact localized value through a native
  `details`/`summary` disclosure when compact and exact values differ.

Exact values are available by tap, click, and keyboard focus/activation. Hover
is never the only access path. Opening and closing a disclosure keeps focus on
its summary.

## Decision and result lifecycle

The visible state sequence is:

```text
decision
  -> selected / simulating
  -> [held event result -> acknowledgement] when present
  -> one or more season reveals
  -> [held milestone -> acknowledgement] when present
  -> next decision or summary
```

- Decision cards expose salary, contract role, star/core indicators, and the
  primary risk or consequence without opening secondary detail.
- The committed option remains visible with `aria-pressed="true"` and is
  disabled while simulation/result state is pending. Repeated pointer,
  keyboard, or touch activation commits only one transition.
- A user-triggered event result does not disappear on a timer. It remains next
  to the selected card, shows the resolved outcome and actual contract, moves
  focus to `确认结果`, and advances only after acknowledgement.
- Automatic season simulation does not introduce an extra result
  acknowledgement when no user-triggered event result exists.
- Key-event and milestone dialogs use Enhanced tokens, expose labelled dialog
  semantics, acknowledge each event once, and restore an available pre-dialog
  focus target when they close.

## Persistence

Each committed choice appends exactly one ordered choice-log entry. When that
choice produces one or more seasons, the first resulting visible season story
records:

- the event/decision and selected option;
- the actual resolved outcome when the choice has an event result;
- the actual contract result, including exact annual salary when applicable.

A choice that produces no season, such as immediate retirement, does not invent
a yearly story. Hard reload, local resume, archive reopen, and branch replay
reconstruct visible workbench stories deterministically. Read-only replay
reconstructs the same completed career and Summary, but it does not currently
render the workbench's yearly stories. No path may duplicate a choice or invent
a fallback amount.

## Compatibility boundaries

- Classic continues to show its original career metrics and interaction
  structure. It does not render the Enhanced shell, semantic workbench table,
  exact-money disclosure, selected-result receipt, or Enhanced yearly-story
  markup.
- Renderer-neutral additions to
  `src/ui/classic/careerPresentation.ts` are allowed only when Classic
  rendering, golden careers, stored data, and reference screenshots remain
  unchanged.
- Replay uses the current v3 contract described in
  [Daily challenges and replay links](challenges-and-replay.md). Ordinary
  replay remains storage-independent and never acquires Daily Challenge
  identity.

## Release acceptance

Preview runs the complete
[`career-workbench` story](deployment/preview-acceptance.md). Production
repeats its high-risk viewport, event, persistence, Classic, and replay
boundaries under
[Production acceptance](deployment/production-acceptance.md).

The Issue #25 Production release passed the real application journey,
responsive matrix, exact-money interaction, goalkeeper semantics, held event
flow, Classic isolation, storage-free replay, anonymous access, cache/resource
checks, and application-root axe scan. The durable, exact-commit evidence is in
the
[PR #26 Production acceptance comment](https://github.com/wkyhit/football-life-reborn/pull/26#issuecomment-5149241659).

Browser acceptance uses `ego-browser`. Chrome and Playwright are not remote
Preview or Production release executors.
