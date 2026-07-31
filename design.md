# Football Life Reborn — Enhanced design system

Status: `approved`

Scope: the complete Enhanced application. Classic remains a frozen compatibility surface and does not consume this system.

Approval source: the user’s explicit `/goal` instruction to implement Issue #8, frozen after the Hallmark preview and additive file plan were recorded in [Issue #8 comment 5138674560](https://github.com/wkyhit/football-life-reborn/issues/8#issuecomment-5138674560). Any later exception amends this file first.

## 1. Product context

- Audience: football fans who want a fast, understandable, replayable career simulation.
- Primary job: start, continue, compare, and share a deterministic football life without losing context.
- Tone: playful, with restrained sports-editorial hierarchy rather than game-dashboard clutter.
- Factual anchors: the player, club crest, season, age, rating, honors, consequence, and next decision. Decoration never outranks those facts.
- Runtime boundary: local-first, analytics-free, and static. Fonts and visual assets are bundled; no design dependency adds a runtime API.

## 2. Hallmark preview

- Genre: `playful`
- Theme route: `custom (tuned)`
- Vibe: `night-match ledger, playful, exact, restrained`
- Axes: `dark / display-condensed-bold / chromatic-green`
- Paper: `oklch(12.5% 0.008 164)`
- Ink: `oklch(96% 0.012 164)`
- Accent: `oklch(73% 0.16 160)`
- Display: `Big Shoulders Display`
- Body: `Geist`
- Outlier: `Geist Mono`
- Navigation: `N7 Brutal slab`, 2 px rule, tracked Latin wordmark, text-only utility actions
- Marketing close: `Ft5 Statement`, 28 ch line, wordmark below, one hairline
- CTA: `C1 Outlined chip` by default; a compact accent fill is reserved for the single primary action in a task step
- Enrichment: Tier A only. Club crests and generated share cards are product evidence, not decorative enrichment.

The custom tuned route preserves the existing near-black pitch brand while correcting its token and hierarchy drift. The catalog’s Hum theme is intentionally not used: its cream, multi-accent, mascot-led system would replace rather than refine the approved brand.

## 3. Macrostructure families

### Marketing/setup: `Narrative Workflow`

Landing is stage `0.0`; nationality, identity, and position are stages `1.0–3.0`. Use an `F4 Step sequence` with a persistent progress rail, one factual support strip, and one task action. The landing’s `61 / 192 / 12` values remain supporting product facts, never a fabricated Stat-Led hero.

Allowances:

- Landing may use a 7/5 off-centre split and one `Ft5` close.
- Setup pages may replace the footer with the existing functional back/next action rail.
- Nationality may use an Index-First list inside the workflow stage because browsing countries is the task.
- No centred badge → headline → two-CTA stack, equal feature-card row, or decorative testimonial/pricing tail.

Stamp:

```css
/* Hallmark · genre: playful · macrostructure: Narrative Workflow · theme: custom (tuned) · design-system: design.md · designed-as-app */
```

### App/workbench: `Workbench`

Career and branch comparison preserve the proven flexible timeline plus fixed `380px` decision rail on desktop. The product state is the visual, so no fake browser frame is added. An `F3 Tabular spec sheet` vocabulary governs seasons and comparisons; controls stay adjacent to the data they affect.

Allowances:

- Career retains one internal timeline scroller and a fixed decision rail.
- Comparison may use two asymmetric data columns, but both derive from the same row grammar.
- Challenge progress sits inside the current task rail; it does not become a third dashboard column.
- Mobile collapses to document order: current state, timeline, then action.

Stamp:

```css
/* Hallmark · genre: playful · macrostructure: Workbench · theme: custom (tuned) · design-system: design.md · designed-as-app */
```

### Content/document: `Index-First`

Archive, summary, share, replay, recovery, empty, loading, error, and install surfaces use an Index-First record grammar: short context line, linked or actionable rows, hairline groups, and a single next action. Summary is a career record, not a card grid. Replay error is a recoverable record, not a full-viewport generic error card.

Allowances:

- Archive may expose filters in a compact rail and branch actions inline with a record.
- Summary may use one large career outcome followed by grouped record rows.
- Share is an overlay on the summary record, not a second page identity.
- Recovery/error pages may emphasise one instruction, but never centre a lone card in `100dvh`.
- Loading uses a shape-matched skeleton; install uses a native availability/status row.

Stamp:

```css
/* Hallmark · genre: playful · macrostructure: Index-First · theme: custom (tuned) · design-system: design.md · designed-as-app */
```

## 4. Colour

`tokens.css` is the only colour source for Enhanced. Every neutral carries the pitch-green hue; there is no pure black, pure white, zero-chroma grey, RGB, HSL, or hex colour in the system.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Paper | `--color-paper` | `oklch(12.5% 0.008 164)` | App canvas |
| Paper 2 | `--color-paper-2` | `oklch(17% 0.012 164)` | Grouped rows and timeline |
| Paper 3 | `--color-paper-3` | `oklch(22% 0.014 164)` | Raised rail, dialog, active row |
| Ink | `--color-ink` | `oklch(96% 0.012 164)` | Primary copy and values |
| Ink 2 | `--color-ink-2` | `oklch(82% 0.014 164)` | Secondary headings |
| Muted | `--color-muted` | `oklch(70% 0.020 164)` | Supporting copy |
| Neutral | `--color-neutral` | `oklch(56% 0.016 164)` | De-emphasised labels |
| Rule | `--color-rule` | `oklch(34% 0.018 164)` | Primary separators |
| Rule 2 | `--color-rule-2` | `oklch(28% 0.016 164)` | Quiet separators |
| Accent | `--color-accent` | `oklch(73% 0.16 160)` | Active state and one primary action |
| Accent ink | `--color-accent-ink` | `oklch(13% 0.020 160)` | Copy on accent |
| Focus | `--color-focus` | `oklch(84% 0.17 95)` | Outer focus ring |
| Warning | `--color-warning` | `oklch(78% 0.15 76)` | Rating, trophy, caution |
| Error | `--color-error` | `oklch(62% 0.20 28)` | Failure and destructive warning |

Accent occupies at most 3% of a normal viewport and 5% in a task-dense rail. Warning and error are semantic signals, not decorative accents. A selected, positive, warning, or error state always carries text, an icon, a check, or an ARIA state in addition to colour.

Focus reserves a transparent 2 px outline at rest, then swaps it to the
focus token at a 1 px offset without changing geometry. A 1 px paper
box-shadow separates that outline from either a dark canvas or the green
primary-action fill.

## 5. Typography

- Display: `Big Shoulders Display`, weight 700, roman. It is limited to the Latin wordmark, short Latin labels, season years, ratings, and other display numerals.
- Body: `Geist`, weight 400; weight 700 for headings. Chinese glyphs fall through to `PingFang SC` or `Noto Sans SC`.
- Outlier: `Geist Mono`, weight 500. It carries only step labels and tabular data labels.
- All three web fonts are bundled through the build. No Google Fonts or Fontshare runtime request is allowed.
- The build may emit exactly four Latin WOFF2 files (display 700, body 400/700, mono 500), with a combined raw transfer ceiling of 64 KiB. No WOFF fallback or unused script subset is shipped.
- Display headings are roman. No italic heading or isolated italic emphasis word.
- The scale is a 1.25 major third. Body copy is at least 16 px with 1.6 line height; supporting UI copy never drops below 12 px.
- Chinese text never receives positive tracking. Uppercase Latin labels may use at most `0.10em`.
- Interactive labels stay on one line. Long explanation text wraps independently.
- All season, age, rating, goal, appearance, and archive counts use tabular numerals.

## 6. Space, layout, and depth

The spacing scale follows a 4 px grid and uses named roles only: `4, 8, 12, 16, 24, 32, 40, 64, 96`. Raw spacing values are not added inside component markup.

- Smallest page gutter: 16 px plus safe-area inset.
- Tablet page gutter: 24 px.
- Desktop page gutter: 32–40 px, capped by a `76rem` shell.
- Workbench decision rail: `23.75rem` (`380px`), unchanged.
- Grid/image tracks always use `minmax(0, 1fr)`.
- Depth comes from paper lightness and rules. Dark drop shadows, coloured glows, glass blur, and card-in-card are banned.
- Cards exist only for a distinct record or interaction. Section grouping uses whitespace and hairlines.
- `html` and `body` use `overflow-x: clip`, never `hidden`.

## 7. Component voice and eight states

Every interactive primitive implements: default, hover, focus-visible, active, disabled, loading, error, success.

- Hover exists only under `@media (hover: hover) and (pointer: fine)` and has a keyboard focus equivalent.
- Focus is instant and never animated.
- Active translates by 1 px; it does not scale.
- Disabled uses opacity, cursor, and an adjacent reason or accessible description.
- Loading keeps the control’s width stable, preserves a readable label, and delays spinner paint long enough to prevent a flash.
- Error names what failed and what to do; no “Oops” or generic “Something went wrong”.
- Success is silent when the visible result already proves it. Copy actions temporarily change their own label to `已复制`.
- Inputs keep one border width in every state, reserve a right-side status slot, validate after blur, and keep helper/error height stable.
- Targets are at least `44 × 44` CSS px.
- Native controls and landmarks come before ARIA. Dialogs use native `<dialog>` behavior where practical.

CTA voice is short, factual, and verb-led: `开始普通生涯`, `继续上次生涯`, `选择国家`, `保存分支`, `复制回放链接`, `返回档案`. `OK`, `Submit`, `Click here`, decorative exclamation marks, and breathless marketing claims are banned.

## 8. Motion

Only `transform` and `opacity` animate. Named durations are `120ms`, `220ms`, and `420ms`; named easings are the Hallmark enter, exit, and state curves.

Per page, use no more than three primitives:

1. one orchestrated first-paint entrance;
2. one control press/selection response;
3. one functional progress or modal transition.

No parallax, infinite decorative loop, bounce/overshoot, `transition: all`, layout-property animation, or universal scroll reveal. Below `40rem`, scroll-triggered motion is disabled.

With `prefers-reduced-motion: reduce`, spatial transforms disappear and state changes become opacity-only at no more than `150ms`. Functional loaders remain visible without rotation if their status can be conveyed by text.

## 9. Responsive and accessibility gates

The acceptance widths are 320, 375, 414, 768, 1280, and 1440. Every width must have:

- zero document horizontal overflow;
- no wrapped button, tab, nav, breadcrumb, or inline footer label;
- safe heading wrapping with `overflow-wrap: anywhere` and `min-width: 0`;
- section heads collapsed to one column on mobile;
- 200% zoom completion without loss of content or controls;
- keyboard-only completion with visible focus;
- minimum 4.5:1 body contrast, 3:1 large-text/control-boundary contrast, and 3:1 focus contrast in context;
- reduced-motion behavior that preserves status and task completion.

Classic screenshots and behavior remain byte-for-byte unchanged.

## 10. Additive file plan

No production file is deleted. Files outside this list require an issue amendment before modification.

Create:

- `design.md`
- `tokens.css`
- `tokens.json`
- `.hallmark/log.json`
- `src/ui/enhanced/components/EnhancedAction.tsx`
- `src/ui/enhanced/components/EnhancedAppBar.tsx`
- `src/ui/enhanced/components/EnhancedStateSurface.tsx`
- `src/ui/enhanced/summary/EnhancedSummaryScreen.tsx`
- `src/ui/enhanced/recovery/EnhancedRecoveryScreen.tsx`
- `tests/design/design-system.contract.test.ts`
- `tests/design/shell-redesign.contract.test.ts`
- `tests/design/route-families.contract.test.ts`
- `tests/components/interactive-states.spec.tsx`
- `tests/design/hallmark-release-gate.test.ts`
- `tests/visual/enhanced/after/inventory.json` and approved PNG evidence

Modify:

- `package.json` and `package-lock.json` for bundled font packages only
- `src/styles.css`
- `src/app/App.tsx`
- `src/ui/enhanced/DESIGN.md` (compatibility pointer to this root contract)
- `src/ui/enhanced/EnhancedShell.tsx`
- `src/ui/enhanced/EnhancedOnboarding.tsx`
- `src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx`
- `src/ui/enhanced/onboarding/EnhancedNationalityScreen.tsx`
- `src/ui/enhanced/career/EnhancedCareerScreen.tsx`
- `src/features/archive/EnhancedArchiveScreen.tsx`
- `src/features/challenges/ChallengeProgressPanel.tsx`
- `src/features/replay/ReplayRouteScreen.tsx`
- `src/features/share-card/ShareCardOverlay.tsx`
- `src/ui/shared/Dialog.tsx` only through an additive Enhanced variant
- existing component/App tests adjacent to those owners
- `tests/build/budgets.test.ts` to admit `.woff2` only and enforce the four-file / 64 KiB font ceiling
- `README.md`
- `docs/design/hallmark-audit.md`

Frozen:

- `src/ui/classic/**`
- `tests/visual/classic/**`
- domain, deterministic engine, replay codec, storage schema, catalog data, share-card semantics, and route ownership

### Issue #18 approved amendment

[Issue #18](https://github.com/wkyhit/football-life-reborn/issues/18)
is the approved, additive exception for deterministic contract economy
and career storytelling after the Phase 7 baseline. This amendment does
not unfreeze the football engine, football RNG cursor/core hash, Classic
content version/catalog, route ownership, or existing Classic visual
reference images. Any production file not named below still requires a
new amendment before modification.

Create:

- `src/domain/economy/economyPolicy.ts`
- `src/domain/economy/careerEconomyProjection.ts`
- `src/domain/economy/careerStory.ts`
- `src/domain/economy/percentileBenchmark.ts`
- `src/domain/economy/percentileTable.generated.ts`
- `src/ui/shared/positionPresentation.ts`
- `docs/economy-v1.md`
- `docs/economy-migration-and-benchmark.md`

Modify:

- `src/domain/economics.ts` only to expose the existing market-value nodes without changing football valuation behavior
- `src/domain/nationalTeam.ts` only to expose the existing call-up threshold contract
- `src/storage/classicSessionRepository.ts`
- `src/storage/archiveRepository.ts`
- `src/storage/careerTransfer.ts`
- `src/storage/migrations/migrations.ts`
- `src/features/replay/codec.ts`
- `src/features/replay/replay.ts`
- `src/features/replay/route.ts` only to map the approved economy-policy compatibility result to an explicit recovery message
- `src/features/branching/compareBranches.ts`
- `src/features/season-reveal/seasonReveal.ts`
- `src/features/share-card/shareCard.ts`
- `src/features/share-card/shareCardContract.ts`
- `src/features/share-card/ShareCardOverlay.tsx`
- `src/features/archive/EnhancedArchiveScreen.tsx`
- `src/ui/classic/PositionScreen.tsx` only to consume shared, behavior-equivalent position metadata
- `src/ui/classic/careerPresentation.ts`
- `src/ui/classic/summaryPresentation.ts`
- `src/ui/classic/CareerScreen.tsx` and `src/ui/classic/SummaryScreen.tsx` only for the approved minimal economy/story parity
- `src/ui/shared/CareerMilestoneNarrative.tsx` only to render shared structured decision-economy details and committed contract results without calculating economy facts
- `src/ui/enhanced/EnhancedOnboarding.tsx`
- `src/ui/enhanced/career/EnhancedCareerScreen.tsx`
- `src/ui/enhanced/summary/EnhancedSummaryScreen.tsx`
- `src/app/App.tsx`
- `src/styles.css`
- `README.md`

Adjacent tests, benchmark generation fixtures, and Issue #18 evidence
may be added or updated, but existing football golden fixtures and
Classic visual reference PNGs remain immutable acceptance inputs.

## 11. Portable exports

### CSS source

The root `tokens.css` is canonical. `src/styles.css` imports it before Tailwind and maps existing `enhanced-*` utilities to its roles so Slice 2 does not require route markup changes.

### Tailwind v4

```css
@theme inline {
  --color-enhanced-canvas: var(--color-paper);
  --color-enhanced-surface: var(--color-paper-2);
  --color-enhanced-raised: var(--color-paper-3);
  --color-enhanced-strong: var(--color-ink);
  --color-enhanced-supporting: var(--color-muted);
  --color-enhanced-line: var(--color-rule);
  --color-enhanced-pitch: var(--color-accent);
  --color-enhanced-pitch-ink: var(--color-accent-ink);
  --color-enhanced-trophy: var(--color-warning);
  --color-enhanced-alert: var(--color-error);
  --font-enhanced-display: var(--font-display);
  --font-enhanced-body: var(--font-body);
  --font-enhanced-mono: var(--font-outlier);
  --spacing-enhanced-xs: var(--space-xs);
  --spacing-enhanced-sm: var(--space-sm);
  --spacing-enhanced-md: var(--space-md);
  --spacing-enhanced-lg: var(--space-lg);
  --radius-enhanced-card: var(--radius-card);
  --radius-enhanced-input: var(--radius-input);
}
```

### DTCG

The root `tokens.json` mirrors the CSS values with the W3C Design Tokens Community Group `$value` and `$type` shape. The canonical role paths are `color.*`, `font.*`, `size.*`, `space.*`, `duration.*`, and `radius.*`.

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(12.5% 0.008 164)", "$type": "color" },
    "ink": { "$value": "oklch(96% 0.012 164)", "$type": "color" },
    "accent": { "$value": "oklch(73% 0.16 160)", "$type": "color" },
    "accent-ink": { "$value": "oklch(13% 0.020 160)", "$type": "color" }
  }
}
```

### shadcn/ui

The project does not currently use shadcn/ui. This compatibility mapping is documented but not emitted into runtime CSS:

```css
:root {
  --background: 12.5% 0.008 164;
  --foreground: 96% 0.012 164;
  --card: 17% 0.012 164;
  --card-foreground: 96% 0.012 164;
  --popover: 22% 0.014 164;
  --popover-foreground: 96% 0.012 164;
  --primary: 73% 0.16 160;
  --primary-foreground: 13% 0.020 160;
  --secondary: 22% 0.014 164;
  --secondary-foreground: 82% 0.014 164;
  --muted: 28% 0.016 164;
  --muted-foreground: 70% 0.020 164;
  --accent: 73% 0.16 160;
  --accent-foreground: 13% 0.020 160;
  --destructive: 62% 0.20 28;
  --destructive-foreground: 96% 0.012 164;
  --border: 34% 0.018 164;
  --input: 34% 0.018 164;
  --ring: 84% 0.17 95;
  --radius: 0.625rem;
}
```

## 12. Change discipline

- Additive implementation only; no deletion is approved.
- Preserve routes, component ownership, factual copy intent, engine/controller behavior, storage formats, and static runtime.
- Amend this file before introducing a page-local token, font, macrostructure, or motion exception.
- Keep one `.hallmark/log.json` entry with `scope: app`.
- Browser acceptance, responsive captures, keyboard verification, 200% zoom, reduced motion, and Vercel interaction use ego-browser only.
