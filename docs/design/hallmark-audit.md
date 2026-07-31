# Hallmark pre-redesign audit

Baseline commit: `67c33f9e4a31ad128cfd51fc4157270e95b45847`

Runner: `ego-browser`

Audit date: `2026-07-31`

Mode: read-only audit. No production UI file was changed while this
report or the baseline captures were produced.

## Context

- Audience: football fans who want a fast, understandable,
  replayable career simulation.
- Primary job: start, continue, compare, and share a deterministic
  football life without losing context.
- Tone: playful, with restrained sports-editorial hierarchy rather
  than game-dashboard clutter.
- Existing strengths to preserve: real catalog counts, a
  deterministic information model, clear club/rating anchors, the
  desktop career workbench, zero document-level overflow in the six
  responsive sentinel captures, semantic controls, and the frozen
  Classic boundary.

## Surface and evidence inventory

| Surface | Current implementation | Before evidence |
| --- | --- | --- |
| `landing` | Enhanced landing, pacing, daily challenges, and local archive entry | `landing-{320x844,375x812,414x896,768x1024,1280x830,1440x900}.png` |
| `setup-nationality` | Search, confederation filters, recent countries, and empty search | `setup-nationality-390x844.png` |
| `setup-identity` | Identity fields, jersey preview, and preferred foot | `setup-identity-390x844.png` |
| `setup-position` | Twelve position choices and start action | `setup-position-390x844.png` |
| `career` | Timeline and decision rail workbench | `career-{320x844,375x812,414x896,768x1024,1280x830,1440x900}.png` |
| `career-challenge` | Career workbench with live challenge progress | `career-challenge-390x844.png` |
| `summary` | Enhanced route currently renders the Classic summary | `summary-390x844.png` |
| `share` | Enhanced route currently renders the Classic share overlay | `share-390x844.png` |
| `archive-empty` | Empty local career library | `archive-empty-1280x830.png` |
| `archive-populated` | Career record with seven record actions | `archive-populated-1280x830.png` |
| `branch-create` | Checkpoint selector, branch name, and alternate choice | `branch-create-1280x830.png` |
| `branch-compare` | Curves, totals, categories, clubs, and endings | `branch-compare-1280x830.png` |
| `replay-ready` | Read-only replay currently renders the Classic summary | `replay-ready-390x844.png` |
| `replay-error` | Corrupt replay recovery | `replay-error-390x844.png` |
| `recovery` | Corrupt local storage currently renders the Classic recovery page | `recovery-390x844.png` |
| `save-error` | Real `Storage.setItem` failure and fixed alert | `save-error-390x844.png` |
| `loading` | No visible state: every relevant `Suspense` fallback is `null` | Documented in finding C4 |
| `install` | Manifest and metadata only; no in-app install availability, success, or unavailable surface | `public/manifest.webmanifest` and finding M11 |

The machine-readable inventory is
`tests/visual/enhanced/before/inventory.json`. It records exact paths,
source ownership, viewport widths, runner, and baseline commit.

## Responsive baseline

- Landing: no horizontal document overflow at all six required
  widths. Natural vertical overflow is 229 px at 320, 221 px at 375,
  75 px at 414, and zero at 768/1280/1440.
- Career: no horizontal document overflow at all six required widths.
  At 1280 the timeline is 828 px and the rail is 380 px; at 1440 the
  timeline grows to 988 px while the rail remains 380 px.
- At 320/375/414/768 the timeline and rail stack in that order and
  each uses the full viewport width.
- Recovery, replay error, save error, summary, share, challenge, and
  setup captures also had zero document-level horizontal overflow.

## Critical findings

### [critical] Design-system drift — src/app/App.tsx:325-338

  Tell — Design-system drift
  Where — src/app/App.tsx:325-338
  Severity — critical
  Fix — Give Enhanced its own recovery, summary, replay-summary, and share presentation components while keeping the existing controllers and payloads.

Enhanced calls the Classic `RecoveryScreen` directly, and its summary
path calls the Classic `SummaryScreen` plus Classic-marked share
overlay at `src/app/App.tsx:674-748`. Ready replay repeats the same
Classic summary at
`src/features/replay/ReplayRouteScreen.tsx:61-100`. The captures
visibly switch component voice, tokens, containment, and navigation at
the end of an Enhanced journey.

### [critical] Card-in-card — src/ui/classic/SummaryScreen.tsx:46-136

  Tell — Card-in-card
  Where — src/ui/classic/SummaryScreen.tsx:46-136
  Severity — critical
  Fix — Replace the outer summary card with a document-led Enhanced summary and reserve containment for individual records or actions only.

The Enhanced summary is one bordered article containing challenge,
metrics, national-team, title, honors, and club cards. The screenshot
reads as nested dashboard modules rather than a finished career
document.

### [critical] Full-viewport centred hero — src/features/replay/ReplayRouteScreen.tsx:114-149

  Tell — Full-viewport centred hero
  Where — src/features/replay/ReplayRouteScreen.tsx:114-149
  Severity — critical
  Fix — Use the shared content/document recovery family with an edge-aligned diagnosis, next step, and return action instead of a centered one-card viewport.

The replay error is a `min-h-dvh` centered card with a heading, short
copy, and one full-width CTA—the default generated error-page shape.

### [critical] Absent loading surface — src/app/App.tsx:186-202

  Tell — Missing state discipline
  Where — src/app/App.tsx:186-202
  Severity — critical
  Fix — Add one tokenized Enhanced loading shell and use it for every lazy route and overlay boundary, with delayed progress announcement and reduced-motion behavior.

Archive, onboarding, career, summary share, and replay share also use
`fallback={null}` at `src/app/App.tsx:342-369`,
`src/app/App.tsx:388-390`, `src/app/App.tsx:728-748`, and
`src/app/App.tsx:783-803`. A slow chunk produces a blank route rather
than the issue's required loading state.

### [critical] Inter-everywhere, one-font variant — src/ui/enhanced/DESIGN.md:26-38

  Tell — Inter-everywhere
  Where — src/ui/enhanced/DESIGN.md:26-38
  Severity — critical
  Fix — Lock separate roman display, Chinese body, and mono/data roles in the root design system while retaining local-system fallbacks and no required font request.

The system stack is assigned to both body and display roles through
`src/styles.css:34-41`. Weight and size are the only typographic
hierarchy, so landing, setup, archive, comparison, and career share the
same generic voice.

## Major findings

### [major] Mid-render token improvisation — src/styles.css:24-34

  Tell — Mid-render token improvisation
  Where — src/styles.css:24-34
  Severity — major
  Fix — Export the full Hallmark palette and route every Enhanced color and font utility through named tokens.

Named Enhanced tokens exist, but route code mixes them with raw
`white/*`, `black/*`, `zinc-*`, `emerald-*`, `amber-*`, and `red-*`
utilities. Representative drift appears at
`src/ui/enhanced/career/EnhancedCareerScreen.tsx:89-135`,
`src/ui/classic/SummaryScreen.tsx:37-165`, and
`src/features/archive/EnhancedArchiveScreen.tsx:402-425`.

### [major] Eyebrow on every section — src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx:49-50

  Tell — Eyebrow on every section
  Where — src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx:49-50
  Severity — major
  Fix — Keep at most one genuinely orienting label per page family and let headings, rules, and position carry the rest of the hierarchy.

The same uppercase micro-label pattern repeats at landing
`206-207`, nationality `69-70`, career `201-203` and `487-489`,
archive `338-340`, branch creator, comparison, challenge, and replay
error. It has become a route-independent tic.

### [major] Generic emoji as feature icon — src/ui/classic/SummaryScreen.tsx:113-127

  Tell — Generic emoji as feature icon
  Where — src/ui/classic/SummaryScreen.tsx:113-127
  Severity — major
  Fix — Reuse the deterministic local honor identity system for title recognition and remove the sparkle glyph and decorative title gradient.

The `✨` title mark breaks the otherwise deliberate crest and honor
identity language, and it is visible inside the Enhanced summary path.

### [major] Glassmorphism without purpose — src/features/archive/EnhancedArchiveScreen.tsx:335-335

  Tell — Glassmorphism without purpose
  Where — src/features/archive/EnhancedArchiveScreen.tsx:335
  Severity — major
  Fix — Use an opaque tokenized masthead whose elevation comes from a rule and surface lightness.

The sticky archive header adds `backdrop-blur`, and the full-screen
share overlay repeats it at
`src/features/share-card/ShareCardOverlay.tsx:89-92`, despite the
existing design contract explicitly prohibiting glass blur.

### [major] Shadow-glow on dark — src/features/replay/ReplayRouteScreen.tsx:121-124

  Tell — Shadow-glow on dark
  Where — src/features/replay/ReplayRouteScreen.tsx:121-124
  Severity — major
  Fix — Express depth through surface lightness and rules; remove `shadow-2xl`, `shadow-xl`, and the floating summary archive shadow.

The same dark-surface shadow language appears on the save alert at
`src/app/App.tsx:380-386` and the Enhanced summary archive action at
`src/app/App.tsx:676-685`.

### [major] Wrap-to-two-lines clickable text — src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx:173-198

  Tell — Wrap-to-two-lines clickable text
  Where — src/ui/enhanced/onboarding/EnhancedLandingScreen.tsx:173-198
  Severity — major
  Fix — Make the challenge name the one-line button label and move its explanation into adjacent non-clickable copy or a selected detail region.

At 320 px each challenge button carries a heading and wrapping
description. The resume action at `81-96` uses the same two-line
affordance pattern.

### [major] Radio-tab scroll-jump risk — src/ui/enhanced/onboarding/EnhancedNationalityScreen.tsx:95-128

  Tell — Horizontal radio-tab belt
  Where — src/ui/enhanced/onboarding/EnhancedNationalityScreen.tsx:95-128
  Severity — major
  Fix — Wrap the small filter set or switch to a compact labelled select at narrow widths, preserving focus without a horizontal jump.

The root also lacks Hallmark's required `overflow-x: clip` in
`src/styles.css:52-61`; current captures are clean, but the contract is
not protected against long localized copy.

### [major] Incomplete eight-state controls — src/features/archive/EnhancedArchiveScreen.tsx:584-608

  Tell — Missing state discipline
  Where — src/features/archive/EnhancedArchiveScreen.tsx:584-608
  Severity — major
  Fix — Route actions through shared control primitives with default, hover, focus-visible, active, disabled, loading, error, and success states.

Archive actions only distinguish normal and danger. Landing pacing,
setup buttons, replay recovery, summary actions, branch choices, and
share actions similarly implement arbitrary subsets rather than the
required eight-state contract.

### [major] Internal implementation copy leaks — src/features/archive/EnhancedArchiveScreen.tsx:765-805

  Tell — Unfinished product copy
  Where — src/features/archive/EnhancedArchiveScreen.tsx:765-805
  Severity — major
  Fix — Introduce presentation labels for decision types, option verbs, metrics, trophy categories, team names, national results, and endings before rendering.

The branch creator shows `academy_offer`, raw option IDs, and
`Join eibar`. Comparison renders `appearances`, `cleanSheets`,
`goalsConceded`, `cup`, `not_selected`, club IDs, and `no_offers` via
`src/features/archive/EnhancedArchiveScreen.tsx:1055-1164` and
`928-933`.

### [major] Fragmented app navigation — src/ui/enhanced/EnhancedShell.tsx:9-18

  Tell — Route-local chrome
  Where — src/ui/enhanced/EnhancedShell.tsx:9-18
  Severity — major
  Fix — Give the shell one restrained product identity and context-aware primary navigation while keeping route ownership intact.

The shell is `display: contents`; landing has no app navigation,
career adds a local archive button, summary floats another archive
button, archive has only “back,” and replay has a separate return CTA.
Users lose the same product-level orientation as routes change.

### [major] Missing install interaction surface — index.html:17-17

  Tell — Missing state discipline
  Where — index.html:17-17
  Severity — major
  Fix — Add a progressive install action with unavailable, ready, installing, success, and installed states; keep the existing manifest and static runtime.

The PWA manifest and metadata are correct, but there is no user-facing
install availability or completion surface anywhere in Enhanced.

### [major] Undersized supporting type — src/features/challenges/ChallengeProgressPanel.tsx:29-73

  Tell — Weak execution hierarchy
  Where — src/features/challenges/ChallengeProgressPanel.tsx:29-73
  Severity — major
  Fix — Raise persistent supporting copy to a readable compact token and reserve 9–10 px text for non-essential machine labels only.

Challenge rules, timeline headers, summary metadata, replay links, and
archive status repeatedly use 9–10 px type. At 320 px and 200 percent
zoom, essential explanatory text becomes the weakest visual layer.

## Minor findings

### [minor] Every section padded the same — src/features/archive/EnhancedArchiveScreen.tsx:1012-1124

  Tell — Every section padded the same
  Where — src/features/archive/EnhancedArchiveScreen.tsx:1012-1124
  Severity — minor
  Fix — Establish a comparison-document rhythm: dense curves and metrics, open narrative bands, and a distinct ending close instead of uniform `rounded-[14px] p-4` sections.

The equal two-column card grid gives ability, value, totals, trophies,
awards, national team, clubs, and ending the same container and weight.

### [minor] Desktop archive hierarchy leaves an accidental void — src/features/archive/EnhancedArchiveScreen.tsx:358-425

  Tell — Weak execution hierarchy
  Where — src/features/archive/EnhancedArchiveScreen.tsx:358-425
  Severity — minor
  Fix — Use a content/document family with a useful index column or a full-width record ledger rather than one small card in a six-column-width canvas.

At 1280 the only record occupies roughly the left half of the content
area while the rest of the viewport is unstructured empty canvas. The
space feels unfinished rather than intentionally restrained.

## Audit result

Summary — 5 critical · 12 major · 2 minor

Verdict — ships as slop outside the otherwise solid career workbench.
The redesign should preserve the workbench geometry and deterministic
information hierarchy, then bring setup, summary/share, archive,
branching, replay, recovery, loading, error, and install surfaces into
one approved system.
