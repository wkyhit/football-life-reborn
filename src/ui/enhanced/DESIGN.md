# Enhanced UI design contract

## 1. Visual theme and atmosphere

Enhanced is a focused football season archive: compact, grounded, and kinetic. It keeps Classic's near-black canvas, emerald action color, amber rating hierarchy, and Chinese-first copy, then adds a clearer information grid and a persistent decision rail for desktop play.

The interface should feel like a personal match ledger, not a generic analytics dashboard. The timeline is the visual anchor. Club crests, ages, ratings, and season outcomes carry more weight than decorative containers.

## 2. Color palette and roles

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `oklch(0.125 0.008 164)` | Page background |
| Surface | `oklch(0.17 0.012 164)` | Timeline and setup regions |
| Raised surface | `oklch(0.22 0.014 164)` | Decision rail and dialogs |
| Strong text | `oklch(0.96 0.012 164)` | Headings and primary values |
| Supporting text | `oklch(0.7 0.02 164)` | Explanations and labels |
| Hairline | `oklch(0.34 0.018 164 / 0.55)` | Table and region separation |
| Pitch green | `oklch(0.73 0.16 160)` | Primary actions and positive state |
| Green ink | `oklch(0.13 0.02 160)` | Text on pitch green |
| Trophy amber | `oklch(0.78 0.15 76)` | Ratings, trophies, and career peaks |
| Alert red | `oklch(0.62 0.2 28)` | Errors and destructive warnings |

Green is never the only selected or positive signal. Text, icons, check marks, or `aria-pressed` accompany color.

## 3. Typography rules

The stack is `-apple-system, "SF Pro Text", "PingFang SC", "Noto Sans SC", system-ui, sans-serif` to keep Chinese glyphs stable and avoid a network font. Chinese body text uses a 1.7 line height. Dynamic numbers use tabular figures.

| Level | Size | Weight | Line height | Use |
| --- | --- | --- | --- | --- |
| Display | 32px | 800 | 1.12 | Landing identity |
| Section | 22px | 750 | 1.25 | Setup and decision headings |
| Body | 15px | 450 | 1.7 | Explanations |
| Compact | 13px | 550 | 1.45 | Timeline labels |
| Micro | 11px | 700 | 1.35 | Uppercase Latin markers |

Do not tighten Chinese letter spacing. Latin micro labels may use `0.12em` tracking.

## 4. Component stylings

- Primary buttons: 10px radius, 48px minimum height, pitch-green fill, green ink, visible two-ring focus, and `scale(0.97)` while pressed.
- Secondary buttons: 10px radius, raised surface, one hairline divider, strong text, and the same 48px height.
- Choice rows: full-width text-first rows with a fixed crest slot, a selected check mark, and no decorative shadow.
- Inputs: 10px radius, surface fill, hairline outline, strong text, adjacent inline validation, and a pitch-green focus ring.
- Filters: pill controls with text and count, 44px minimum hit area, and `aria-pressed`.
- Dialogs: raised solid surface, 16px radius, labeled heading, focus containment, Escape close, return focus, and contained overscroll.

## 5. Layout principles

Spacing uses `4, 8, 12, 16, 24, 32` pixels. Outer padding and immediate inner gaps use the same step unless a content boundary needs stronger separation.

Below 1024px, setup and career content remain a vertical flow with one internal scroll region and safe-area padding. At 1024px and above, career uses a flexible primary timeline column plus a fixed 380px decision rail. The rail never grows with timeline length.

## 6. Depth and elevation

Depth comes from luminance steps, not dark drop shadows:

- Level 0: canvas.
- Level 1: surface at a 2 percent white overlay equivalent.
- Level 2: raised surface at a 5 percent white overlay equivalent.
- Focus and active state: pitch-green ring or fill.

Cards are only used for a distinct interaction or record type. Sections that merely group text stay borderless.

## 7. Do and do not

- Do keep engine actions and persisted choice logs identical across modes.
- Do keep club marks and career numbers as the strongest visual anchors.
- Do expose loading, revealing, empty, and recovery states separately.
- Do preserve a 44px minimum pointer target and visible focus.
- Do use semantic landmarks and native controls before ARIA.
- Do not use gradients, glass blur, bounce motion, or `transition: all`.
- Do not put every content group in a rounded card.
- Do not hide overflow that contains decisions or career information.
- Do not change Classic tokens or screenshot fixtures from Enhanced code.

## 8. Responsive behavior

- `320px` to `767px`: one column, 16px inline padding, sticky bottom actions only when they do not cover content.
- `768px` to `1023px`: one column with a wider reading measure and 24px inline padding.
- `1024px` and wider: flexible timeline plus 380px decision rail with a 24px gap.
- All layouts support 200 percent browser zoom without horizontal page scrolling.
- Pointer targets remain at least 44px in both axes. Safe-area insets apply to mobile page edges.

## 9. Agent prompt guide

Quick tokens: canvas `oklch(0.125 0.008 164)`, surface `oklch(0.17 0.012 164)`, raised `oklch(0.22 0.014 164)`, text `oklch(0.96 0.012 164)`, muted `oklch(0.7 0.02 164)`, green `oklch(0.73 0.16 160)`, amber `oklch(0.78 0.15 76)`, radii `6px / 10px / 16px / pill`.

- Create a career shell on the canvas token with 24px desktop padding, a flexible timeline, a 380px raised decision rail, a 24px gap, 16px rail radius, and no drop shadow.
- Create a primary action at 48px height, 10px radius, 15px weight 700 text, pitch-green fill, green ink, a visible two-ring focus state, and press scale `0.97`.
- Create a compact season row at 13px weight 550, 1.45 line height, tabular numeric columns, a fixed 24px crest slot, hairline separators, and amber only for peak ratings.
- Create a filter pill at 44px minimum height, pill radius, surface fill, strong text, a check mark plus green fill when selected, and `aria-pressed`.
- Create an accessible solid dialog with raised background, 16px radius, 24px padding, a 22px labeled heading, focus containment, Escape close, return focus, and reduced-motion-safe opacity entry.
