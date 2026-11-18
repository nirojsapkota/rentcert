# SPEC: blue-retheme ("Clear Blue")

Status: APPROVED 2026-11-18 with the default answers to all open questions. Slices 1-2 built. Approved new dashboard strings: card titles "Next due", "Recent activity", "Your properties"; "View all"; "{Check} completed"; "Reminder sent {30 days before / 7 days before / on / 7 days after} the due date: {check}"; "{Check} due {date}"; and the empty activity line.

Reference: `Rental Gas Check Dashboard.png`, supplied by the user on 2026-11-18. It shows a navy sidebar, an illustrated blue hero banner, four coloured stat tiles, an "Upcoming check" card, "Recent activity", a property list with thumbnails, and a tip card. Only the visual style is taken from it, not its text.

Decision (user, 2026-11-18): retheme the whole app to this style and replace the Service Tag identity with blue. This supersedes `SPEC-theme-redesign.md`. That spec listed "four pastel stat tiles" and "every block is a card" as problems. The user has chosen the friendlier, card-based style knowingly.

## Goal

Make RentCert look friendly, clear and trustworthy to self-managing landlords, who are not trades people. The first screen of the landing page and the dashboard should say what the product does at a glance, with an illustration and large, clear numbers.

## Non-goals

- No change to compliance logic, due-date rules, reminders or billing.
- No wording changes (user, 2026-11-18). All existing text on the landing page, the app and the emails stays word for word. The reference image's copy is not used. See "Wording" below.
- No dark mode.
- No change to the Compliance Pack PDF.
- No property photo upload (see open question 3).

## Design tokens (`src/app/globals.css`)

Token names stay where the role stays, so most utilities re-theme without edits. Contrast is checked against white, or against `canvas` where noted.

| Token | Value | Role | Contrast |
|---|---|---|---|
| `canvas` | `#f4f7fd` | page background (cool off-white) | |
| `surface` | `#ffffff` | cards, tables, inputs | |
| `ink` | `#0f1b3d` | body text and headings (deep navy) | 16.9 |
| `ink-muted` | `#4a5675` | secondary text | 7.3 (6.8 on canvas) |
| `line` | `#dfe5f2` | card borders and dividers (decorative) | |
| `line-strong` | `#7a86a3` | input and secondary-button borders | 3.6 (3.4 on canvas, WCAG 1.4.11) |
| `brand` | `#1d4ed8` | primary button, links, focus ring, active nav | 6.7 (5.8 on brand-soft) |
| `brand-strong` | `#1e40af` | primary hover | 8.7 |
| `brand-soft` | `#e6eeff` | hero banner, hover and selected rows, active nav pill | |
| `deep` | `#0f2557` | sidebar background | white on deep is 14.8 |
| `bar-muted` | `#b8c4e0` | inactive sidebar text | 8.4 on deep |
| `danger` / `danger-soft` | `#b42318` / `#fdecea` | overdue, errors | 6.6 (5.7 on danger-soft) |
| `success` / `success-soft` | `#166534` / `#e7f6ec` | up to date | 7.1 (6.4 on success-soft) |
| `warning` / `warning-soft` | `#92400e` / `#fff4dc` | due soon | 7.1 (6.5 on warning-soft) |
| `tile-blue`, `tile-green`, `tile-violet`, `tile-amber` | `#eaf1ff`, `#e9f8ee`, `#f0edff`, `#fff6dc` | stat tile backgrounds only | |
| `tile-violet-ink` | `#6d28d9` | violet tile icon and number | 6.2 on `tile-violet` |

The `tag` and `accent` yellow tokens are removed. `tile-amber` replaces the one remaining yellow use.

Radius: `--radius-sm` 6px, `--radius-md` 8px, `--radius-lg` 12px, `--radius-xl` 16px (cards), `--radius-2xl` 20px (hero banner). Pills (`rounded-full`) are used for status badges, the avatar and the filter toggles.

Shadow: one soft card shadow, `0 1px 2px rgb(15 27 61 / 0.06)`. No neo-brutalist offset shadow.

## Typography

- **Plus Jakarta Sans** (400, 500, 600, 700, 800) for the UI and headings, through `next/font/google`. It is self-hosted, so the CSP is unchanged. It matches the rounded, geometric feel of the reference.
- Remove IBM Plex Sans and IBM Plex Mono. Dates and counts use `tabular-nums` on the sans font. `font-mono` is kept only for code-like values: invite tokens, licence numbers and request ids. It maps to the system monospace font.
- Scale: 13 / 15 (body) / 18 / 22 / 30 / 52 (landing h1 at 800 weight).
- Dates stay `formatShortDate()` (`18 Dec 2026`).

## Components

- **App shell** (`app-nav.tsx` becomes `app-sidebar.tsx`, plus the `(app)/layout.tsx` changes):
  - At `lg` and wider, a fixed 240px navy (`deep`) sidebar holds the logo, the nav with icons, and a small house illustration at the bottom. The active item is a `brand` filled pill with white text.
  - A top bar on the content side holds the notification bell (a link to upcoming due checks; the badge shows the overdue count) and the avatar menu.
  - Below `lg`, the navy panel becomes a header: logo, avatar and sign out on one row, and the nav links wrapped below, as today. There is no drawer, so every section stays one tap away and no menu JavaScript is needed. (Changed during slice 1 from a drawer.)
  - `themeColor` becomes `#0f2557`.
  - Icons: `lucide-react` (tree-shaken, MIT). Each icon has `aria-hidden`, with text labels always shown.
- **Logo** (`logo.tsx`, favicon): a white house with a blue tick on a rounded brand-blue tile, next to the "RentCert" wordmark. It replaces the yellow tag mark. (A flame was dropped: it does not read at 28px.)
- **Button**: primary is solid `brand` with white text and 10px radius. Secondary is white with a `brand` border and `brand` text. Danger is solid danger. Heights are unchanged (40px, or 44px on touch).
- **Status badge** (`status-badge.tsx`): a pill with a soft fill and dark text. Overdue uses danger-soft and danger. Due soon uses warning-soft and warning. Up to date uses success-soft and success. The text stays as it is now ("Overdue by 70 days", "Up to date"), in sentence case, not uppercase. The overdue row keeps a leading red rule, so state is not shown by colour alone.
- **Card**: a new `ui/card.tsx`. White, `radius-xl`, a 1px `line` border and the soft shadow. It has an optional header with an icon, a title and a "View all →" link.
- **Stat tile**: a new `ui/stat-tile.tsx`. A tinted card with an icon in a rounded square, a large number and a label. The whole tile is a link.
- **Alert**: soft tint, `radius-lg`, an icon, no leading rule.
- **Field**: white, `line-strong` border, 8px radius. Focus is a 2px `brand` outline.
- **Illustrations**: hand-built inline SVG components in `src/components/illustrations/`:
  - a hero scene (a gas heater, a checklist clipboard, a bell and a plant)
  - a house, for the sidebar footer and empty states
  - a flame, for the gas check icon
  They use the brand palette only and carry `aria-hidden`. No raster images and no external image hosts, so the CSP stays the same.

## Wording

Keep all existing wording. This phase is visual only.

- The landing page keeps its current headline, subhead, steps, feature text, FAQ, "Important" notice and CTA text word for word. Only the layout and styling change.
- App pages keep their current headings, labels, button text and status text ("Overdue by 70 days", "Up to date").
- The reference image's copy is not used. That includes "Never Miss a Rental Gas Check!", "keep your home compliant", "100% On Track", "Set Reminder" and "Stay safe. Stay compliant."
- New dashboard cards reuse labels that already exist in the app wherever possible. Any string that has to be new, such as a card title, is listed in that slice's screenshot review for the user to approve.
- `tests/unit/public-wording.test.ts` stays as it is and must still pass.

## Page changes (slices, each shippable and verified on its own)

1. **Foundation:** tokens, font, Button, Field, Alert, Card, StatTile, StatusBadge, Logo, the app shell (sidebar, top bar and mobile header), the footer and the illustrations. This alone re-themes every page.
2. **Dashboard:**
   - A hero banner (`brand-soft`, with the illustration on the right) holding the existing dashboard heading and add-property button. On phones the banner shrinks and hides the illustration.
   - Four stat tiles: Properties; Due in 30 days; Overdue (danger tint when above 0, otherwise blue); Up to date. Each links to the filtered list.
   - "Next due" card: the soonest overdue or due check, with its address, due date and the existing "Mark completed" button.
   - "Recent activity" card: the last 5 events, either a check recorded or a reminder sent. It reads `compliance_records` and `compliance_reminders` through new owner-scoped functions in the compliance and reminders modules, so the architecture test still holds.
   - "Your properties" card: each address with an illustrated house thumbnail (see open question 3), its next check date and a status badge.
   - The upcoming-deadlines table stays below the cards, inside a card, so nothing in it is lost.
3. **Property and record pages:** sections become cards, and tables sit inside cards with pill badges.
4. **BarrierTrack pages** (clients, pools, inspections, lodge panel): same card and badge treatment.
5. **Landing and pricing:**
   - Hero: a large rounded `brand-soft` banner with the headline on the left and the hero illustration on the right, plus the "Start free" button and the "See how it works" link.
   - A dashboard screenshot follows (re-captured with `npm run screens`).
   - Four-step "How it works": numbered cards with icons.
   - Features: the two existing features (certificate vault, reminder emails) as coloured tiles, text unchanged.
   - Pricing cards in the new style, then the FAQ as an accordion inside a card.
   - The "Important" notice stays word for word, in a neutral card.
   - The final CTA becomes a `deep` navy banner with a white button.
6. **Auth, account, billing, sharing, documents and admin:** inherit slice 1. Fix only what looks broken. Auth pages get a split layout: the form on the left and the illustration on the right, at `lg` and wider.
7. **Emails:** move the templates from the old teal to brand blue, with the new logo. Same content.

## Acceptance criteria

- No IBM Plex, `tag` or `accent` tokens left in the build. `grep` finds no `#f5c518`.
- Text and UI contrast meet WCAG AA (values above). Focus is visible on every interactive element, including in the sidebar.
- The sidebar and the mobile header nav work by keyboard, with a visible white focus ring on navy.
- `expectNoHorizontalOverflow()` passes at 390px on every page the e2e suite visits.
- `npm run typecheck`, `npm run lint` and `npm test` pass. `npm run test:e2e` passes, with selectors updated only where the structure changed.
- Screenshots at 1280px and 390px of the landing, dashboard, property, pool and billing pages are reviewed by the user before each slice is committed.
- `public-wording.test.ts` passes unchanged. No user-facing text changes, except new card titles the user has approved. The privacy and terms pages keep `<DraftNotice />`.
- The `CLAUDE.md` "Theme" bullet is rewritten for Clear Blue when slice 1 lands.

## Open questions (defaults in brackets)

1. Font: should the UI use Plus Jakarta Sans, a close match to the reference, or Inter, which is more neutral? [Plus Jakarta Sans]
2. Recent activity: is a new dashboard card worth the two extra queries, or should it be dropped to keep the change visual only? [Keep it, limited to 5 rows]
3. Property thumbnails: should they be an illustrated house (an SVG, varied by tint), or a new photo upload per property, which is a feature with storage and privacy work? [Illustrated house. Photo upload can be its own phase later]
4. The notification bell: should it link to the overdue and due-soon list, or open a dropdown panel? [A link with a count badge. No new notification model]
5. Emails (slice 7): include them in this phase, or leave them for later? [Include]
