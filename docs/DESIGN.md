# Call Intelligence design system

## Principle: calm clarity with a pulse

- **Calm.** White cards on a soft cool background, hairline borders, generous space, color only where it means something.
- **Clarity.** One idea per card and one primary action per region. Numbers are big, labels are small but readable. An owner should know in five seconds what is costing money, who needs coaching, and what to do next.
- **Pulse.** One confident brand color (indigo-violet, the "listening" color) and a mint accent for positive momentum. Rings, bars, waveforms and counts animate in once, so the product feels alive because it listens to calls.

Borrowed principles, not pixels: Stripe for crisp data hierarchy, Lemlist for warm rounded friendliness, Salesforce for dense but clean record pages, Miro for approachable color and soft depth.

## Tokens (light only)

All tokens live in `src/app/globals.css`. The app is light only: no dark tokens, no theme switch, `color-scheme: light`, so it never follows the OS theme.

| Group | Values |
| --- | --- |
| Surfaces | app `#F6F7FB`, card `#FFFFFF`, subtle `#F2F4F8`, border `#E4E7EE`, strong border `#D5D9E3` |
| Text | primary `#0F1424`, secondary `#4A5266`, tertiary `#5F677B` (all pass 4.5:1 on white and the app background) |
| Brand | indigo 600 `#4F46E5`, hover 700 `#4338CA`, tints 50 `#EEF0FF` and 100 `#E0E4FF`; buttons are solid, the gradient lives only inside the logo mark |
| Focus | `0 0 0 3px rgba(79,70,229,.25)` |
| Elevation | cards: 1px border, inset top highlight and a soft diffused shadow (`--shadow-xs`); popovers and dialogs `0 12px 32px -8px rgba(15,20,36,.16)` |
| Radius | 8 inputs and buttons, 12 small cards, 16 cards, full for pills |
| Type | Geist, tabular numbers everywhere; page title 28/34, card title 16/24, body 14 to 15, label and caption 13 (nothing meaningful below 13px) |

### Meaning colors

Color encodes meaning only, and each meaning has one color family used for rings, bars, dots, heatmap and chips. Text uses the darker shade so it passes contrast.

| Meaning | Fill | Text on tint |
| --- | --- | --- |
| Good, hit, green tier | emerald `#059669` | `#047857` on `#ECFDF5` |
| Attention, close to green | amber `#D97706` | `#B45309` on `#FFFBEB` |
| Poor, needs work | orange-red `#EA580C` | `#C2410C` on `#FFF4ED` |
| Critical, failed, lost | rose `#E11D48` | `#BE123C` on `#FFF1F2` (used sparingly) |
| Gold tier | `#CA8A04` | `#A16207` on `#FEF9C3` |
| Neutral, info, categories | slate | `#475569` on `#F1F5F9` |

Call types are categories, not meanings, so type chips are neutral slate with an icon and the call-mix donut uses one indigo-to-slate ramp. Rates (pillar hit rates) use green for 100%; only scores use gold.

### Score severity bands (display only)

Grading logic is unchanged. Below splits into Close to green (75%+, amber), Needs work (45 to 74%, orange-red) and Critical (under 45%, rose), always shown with a text label.

## Components

`src/components/ui`: Button and IconButton (primary, secondary, ghost, soft, danger; sm, md, lg; loading), Badge, StatusDot, BandBadge, Kbd, StepPill, DeltaChip, Avatar (deterministic accessible pastel, rep, customer and unknown variants) and AvatarGroup, Card, KpiCard, ScoreRing (24 to 128px, animated, gold shimmer), ScoreBar, ProgressMeter, Sparkline, Tabs (sliding underline) and Segmented (sliding thumb), Input, SearchInput, Select, Checkbox, Switch, RangeSlider, MultiSelect, DateRangePicker, Tooltip, Popover, Menu, Dialog, Sheet, Quote, CountUp, Skeleton, EmptyState, ErrorState. Primitives come from Radix (`radix-ui`), variants from `class-variance-authority`, icons from Lucide at 1.6 stroke (set globally in `globals.css`). A live showcase in light and dark is at `/design` (development only).

## Logo

Three concepts are in `brand/explorations`:

- **A, waveform spark (chosen).** Four rounded voice bars; the last turns mint and throws an upward spark. It says "a call becomes insight" in one glance, stays legible at 16px with a thicker cut, and doesn't lean on pest imagery or resemble Gong, Loom, Zoom, Slack, Stripe, Lemlist, Salesforce or Miro marks.
- B, speech bubble with a waveform: read as a chat or messaging product.
- C, shield with a pulse line: read as a security or health product.

Rules:

- **Clear space:** at least half the mark's height on every side.
- **Minimum size:** 16px for the small cut (`brand/mark-small.svg`), 24px for the full mark.
- **Do:** use it on the gradient tile, or in mono white or dark on photos and print.
- **Don't:** recolor the bars, rotate the mark, add effects, put the gradient tile on a busy background, or stretch the wordmark.
- **Variants:** `<Logo variant="mark" | "tile" | "full" | "mono" | "stacked" />` in `src/components/logo.tsx`; favicon set, PWA icons and the Open Graph card are generated from the same SVG.

## Motion

| Token | Use |
| --- | --- |
| fast 120ms | press feedback (`scale(.97)`) |
| count-up | under 500ms, once per browser session; skipped for reduced motion, automated browsers and `?static=1` |
| base 200ms | hover, color, card lift 2px |
| slow 360ms | row fold after "done" |
| rise 520ms | entrance rise, 12px, ease `cubic-bezier(.32,.72,0,1)` |
| chart 800ms | rings, bars and sparklines drawing in |
| spring 380/30 | tab underline and segmented thumb (Motion `layoutId`) |

Rules: animate once on first view, stagger lists by 30ms, never animate keyboard-triggered actions, exits are faster than entrances. `prefers-reduced-motion` turns off every non-essential animation.

## Accessibility

WCAG 2.2 AA target. Visible focus ring on every control, skip link, Radix dialogs trap focus, tabs and tables use ARIA roles, toasts use a live region, charts have aria labels and a hidden data table, color always paired with a label or icon, touch targets at least 32px desktop and 40px on mobile action bars. Axe scans run in the Playwright smoke tests (`e2e/smoke.spec.ts`).

## Product decisions

1. **Lead with money and the leak.** The Overview opens with a sentence built from real numbers ("$708 a year is still on the table. Your biggest leak is Offer Final Information, missed on 15 of 16 calls.") because owners act on dollars and one clear problem, not on charts. `headline()` is a pure, tested function with empty and perfect-state fallbacks.
2. **Severity, not alarm.** Splitting Below into three bands turns a wall of red into a priority order.
3. **Every number is a door.** KPI cards, heatmap cells, breakdown bars, pillar cards and donut slices all deep-link into a filtered call list, and filters live in the URL so a view can be shared.
4. **Evidence first.** Each passed step shows the quote and a "Quote verified" badge, markers on the waveform show where steps happened, and "Flag as wrong" captures disagreement for a future calibration loop.
5. **Honest data.** Calls carry no call date, so the trend chart says "in the order analyzed" instead of inventing dates, deltas show "New" until history exists, and the waveform says when its shape is approximate.
6. **Act without leaving.** Assign, snooze, mark done with Undo, draft follow-up texts, send coaching, all optimistic with toasts.
7. **Keyboard complete.** Cmd+K palette, G then O, C or R, U to upload, J and K between calls, Space and arrows for audio, ? for help.

## Status and count rules

Every call is exactly one of scored, not scorable, failed, processing or queued, and the parts always add up to the total. Counts are written with `plural()` and steps with `missedOn()` ("missed on 15 of the 16 calls where it applied"), both in `src/lib/display.ts` and unit-tested. Failed and processing calls are excluded from every metric.
