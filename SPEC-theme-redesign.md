# SPEC: theme-redesign ("Service Tag")

Status: APPROVED 2026-11-05 with the default answers to all three open questions. Slice 1 in progress.

Direction chosen 2026-11-05 from three mocks (https://claude.ai/artifact/K8Mey2sPN5v2A2snJ9SqEB): **A. Service Tag**.

## Goal

Replace the Harbour theme, which reads as a generic generated SaaS template, with a practical, dense look. It is based on the test tags and service stickers that electricians and gas fitters leave on equipment. Landlords should scan their due checks faster, and the product should stop looking like every other template.

## Non-goals

- No feature, data or wording changes beyond what a layout needs. The compliance wording rules in `CLAUDE.md` still apply.
- No dark mode (the app has none today).
- No change to the Compliance Pack PDF (it keeps Noto Sans).
- No change to email templates in this phase. They get a follow-up once the web theme settles.

## Problems being fixed

1. Every block is a white rounded card with a border, so there is no hierarchy.
2. The dashboard opens with four pastel stat tiles.
3. The nav, filters, buttons, badges and eyebrow chip all use the same pill shape.
4. The Bricolage Grotesque + Figtree pairing and the teal + amber on sage palette are common AI defaults.
5. The landing page follows the stock SaaS order (eyebrow chip, hero, floating mock card, 1-2-3-4 cards, dark CTA band).
6. Deadline rows are padded cards, so 7 checks fill a screen.

## Design tokens (`src/app/globals.css`)

Token names stay the same where the role is the same, so most of the ~800 existing utility uses re-theme without edits.

| Token | Value | Role | Contrast |
|---|---|---|---|
| `canvas` | `#fbfbf9` | page background | |
| `surface` | `#ffffff` | panels, tables, inputs | |
| `ink` | `#16191d` | text, primary button, app bar | 17.0 on canvas |
| `ink-muted` | `#5d646d` | secondary text | 5.8 on canvas |
| `line` | `#e3e4e0` | dividers and table rules (decorative) | |
| `line-strong` (new) | `#80857f` | input and secondary-button borders | 3.6 on canvas (WCAG 1.4.11) |
| `brand` | `#16191d` | was teal; links, focus ring and active nav now use ink | |
| `brand-soft` | `#f1f1ed` | hover and selected rows | |
| `deep` | `#16191d` | app bar and headings | |
| `tag` (replaces `accent`) | `#f5c518` | safety yellow: logo tag, the "due soon" stamp, and one landing highlight. Never as text on white | ink on tag is 10.8 |
| `tag-soft` | `#fff6cc` | "due soon" stamp background | |
| `tag-ink` | `#7a5b00` | "due soon" stamp text | 5.8 on tag-soft |
| `danger` | `#b42318` | overdue, errors | 6.4 on canvas |
| `success` | `#1d6b43` | up to date | 6.3 on canvas |
| `warning` | `#7a5b00` | alias of `tag-ink` | |
| `bar-muted` (new) | `#a7adb5` | inactive nav items on the app bar | 7.8 on ink |

The `-soft` danger, success and warning tints stay for alerts only, never as whole cards.

Radius: `--radius-sm` 2px, `--radius-md` 3px, `--radius-lg` 4px. `rounded-full` remains only for the avatar initial and the dashboard filter toggles.

## Typography

- IBM Plex Sans (400, 500, 600, 700) for all UI and headings, through `next/font/google` (self-hosted, so CSP stays `'self'`).
- IBM Plex Mono (400, 500, 600) for dates, counts, status stamps, table headers and eyebrow labels. Use `tabular-nums`.
- Remove Figtree and Bricolage Grotesque. `font-display` becomes Plex Sans 700 with `-0.02em` tracking.
- Scale: 13 / 15 (body) / 18 / 22 / 30 / 44 (landing h1 only).
- Dates stay in the Australian long form `28 Aug 2026` (short month), set in Plex Mono. `DD.MM.YYYY` is not used, because it reads badly for screen readers and some users.

## Components

- **Button** (`ui/button.tsx`):
  - primary: solid ink with white text
  - secondary: surface with a `line-strong` border
  - danger: solid danger
  - All 3px radius, no pills. The height stays 40px or more (44px on touch).
- **Status stamp** (`status-badge.tsx`): a bordered box with a 2px radius and Plex Mono at 11.5px, uppercase, with 0.04em tracking.
  - Overdue: danger outline. Due soon: tag-soft fill with tag-ink text. Up to date: success outline.
  - The text node stays the existing sentence ("Overdue by 70 days"). Uppercase comes from CSS only, so screen readers hear normal words.
- **Overdue row marker**: a 3px danger rule on the row's leading edge. This marks state by shape as well as colour.
- **Alert**: a 3px leading rule in the tone colour on the soft tint, with no rounded box.
- **Field**: surface background, a `line-strong` border and 3px radius. Focus is a 2px ink outline with a 2px offset.
- **App nav** (`app-nav.tsx`):
  - a solid ink bar
  - the logo with its yellow tag mark
  - plain-text nav links: the active link is white with a 2px yellow underline, inactive links use `bar-muted`
  - The mobile menu keeps its current behaviour.
  - The `themeColor` meta becomes `#16191d`, so the phone status bar matches the bar.
- **Logo** (`logo.tsx`, favicon, app icons): a wordmark in Plex Sans 700 next to a small yellow tag shape (an angled-top rectangle with a punched hole).
- **Eyebrow labels**: Plex Mono, 11px, uppercase, 0.08em tracking, `ink-muted`. They replace the yellow pill chips.

## Page changes

Slices, each shippable and verified on its own:

1. **Foundation:** tokens, fonts, Button, Field, Alert, StatusBadge, Logo, AppNav and the footer. This alone re-themes every page.
2. **Dashboard:**
   - One summary line (overdue / due in 30 days / up to date, as large mono numbers with labels) replaces the four tinted tiles.
   - Upcoming deadlines become one table: check + address, due date, status. Overdue rows get the leading rule.
   - Filter toggles remain. Each table wrapper is `relative overflow-x-auto`.
   - On phones, each row stacks into two lines inside the same table rows, with no cards.
3. **Property and record pages:** same table treatment for the check schedules and records. Remove nested card borders, so section headings and rules carry the structure.
4. **BarrierTrack pages** (clients, pools, inspections, lodge panel): same table and stamp treatment. Recall dates use the mono style.
5. **Landing and pricing:**
   - Hero: left-aligned headline, with a real screenshot of the new dashboard in a plain frame. It replaces the floating mock card.
   - "How it works" becomes one annotated horizontal sequence (4 short steps on a single rule), because it is a real sequence. No boxed cards.
   - Features become two plain columns with headings.
   - Pricing: two columns split by a rule, with no "badge" chip. The recommended plan is marked by its solid primary button.
   - FAQ: plain disclosure list with rules.
   - The final CTA is a plain ink band with a yellow tag accent, replacing the rounded dark card.
   - The "Important" notice and the footer disclaimer stay word for word.
6. **Auth, account, billing, sharing, documents and admin:** inherit slice 1. Fix only what looks broken.

## Acceptance criteria

- No Figtree or Bricolage left in the build. `rounded-full` appears only on the avatar and the filter toggles.
- Text and UI contrast meet WCAG AA (values above). Focus is visible on every interactive element.
- The dashboard shows at least 12 deadline rows in a 900px-high desktop viewport (7 today).
- `expectNoHorizontalOverflow()` passes at 390px on every page the e2e suite visits.
- `npm run typecheck`, `npm run lint` and `npm test` pass. `npm run test:e2e` passes, with selectors updated only where the structure changed (cards to table rows).
- Screenshots at 1280px and 390px of the landing, dashboard, property, pool and billing pages are reviewed by the user before each slice is committed.
- `tests/unit/public-wording.test.ts` still passes. The privacy and terms pages keep `<DraftNotice />`.

## Open questions (defaults in brackets)

1. Logo: should the yellow tag mark replace the current house icon everywhere, including the favicon and app icons? [Yes]
2. Should the dashboard greeting ("Good morning, Demo") stay above the table, or become a plain "Due checks" heading? [Plain "Due checks" heading, with the name left in the nav]
3. Landing hero screenshot: should it be a real capture of the seeded demo account, re-taken by a script when the UI changes? [Yes, a script in `scripts/` that writes into `public/`]
