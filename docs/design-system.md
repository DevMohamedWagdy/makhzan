# SellyGrow Design System — "Navy & Gold"

The visual language for every SellyGrow surface: the merchant dashboard, the platform admin, the affiliate (marketer) portal, the customer storefront, and the public landing / auth pages.

All tokens live in `resources/css/app.css`. Components consume them through Tailwind utilities (`bg-surface`, `text-ink`, `border-line`, …), so a token change propagates everywhere and Light / Dark switch by toggling `.dark` on `<html>`.

## 1. Concept

**White, navy and gold.** Logo Navy `#182C61` is the main color; Growth Gold `#F5A524` (the logo's "G") is its accent.

- **Canvas** — a cool light canvas (`#f5f7fb`) with white cards (hairline border + soft shadow) and a light sticky header.
- **Navy** (`--mk-primary`, `#182c61`) is the one action color: primary buttons, links, focus, selected states, and the wordmark.
- **Brand accent** (`#2f55b4`, `brand-accent`) is a brighter blue for icons and charts.
- **Night Navy** (`#0f1d42`, `bg-brand` / `bg-panel`) is a solid *material*: the landing hero and bands, the auth brand panel, storefront heroes, balance tiles.
- **Gold** (`#f5a524`, `gold`) is the accent: the CTA on navy surfaces (navy text on it), the active-nav marker, badge dots, glows and the landing headline. As text on light surfaces use `--mk-gold-ink` (`#b7791f`); on navy use `--mk-accent-on-dark` (`#f8c766`).
- **Status** colors stay semantic (green success, amber warning, red danger, sky info) and are never brand colors.

Restraint rules: no decorative gradients on light surfaces, no glassmorphism beyond the sticky headers' `backdrop-blur`, no neon, no heavy drop shadows. Navy surfaces may use the hairline grid texture and a soft gold or blue glow.

## 2. Color

### 2.1 Semantic tokens

| Token (CSS var) | Tailwind | Light | Dark | Use |
|---|---|---|---|---|
| `--mk-bg` | `bg-bg` | `#f5f7fb` | `#090d18` | Page canvas |
| `--mk-surface` | `bg-surface` | `#ffffff` | `#101626` | Cards, sheets, inputs |
| `--mk-surface-2` | `bg-surface-2` | `#f8f9fc` | `#141b2d` | Table headers, footers of dialogs, row hover |
| `--mk-surface-3` | `bg-surface-3` | `#eff2f8` | `#1a2236` | Ghost hover, segmented track, skeletons |
| `--mk-border` | `border-line` | `#e3e7f0` | `#242d44` | Hairlines, dividers |
| `--mk-border-strong` | `border-line-strong` | `#cdd3e1` | `#313b55` | Input borders, hover borders |
| `--mk-text` | `text-ink` | `#141b2d` | `#e9edf6` | Primary text |
| `--mk-text-2` | `text-ink-2` | `#444c60` | `#b0b8cc` | Secondary text |
| `--mk-muted` | `text-muted` | `#697186` | `#7f889e` | Labels, captions, placeholders |
| `--mk-primary` | `bg-primary` / `text-primary` | `#182c61` | `#4a6bc8` | Actions, links, focus |
| `--mk-primary-hover` | `bg-primary-hover` | `#10204a` | `#5d7dd6` | Primary hover |
| `--mk-primary-soft` | `bg-primary-soft` | `#e9eef8` | `#16213f` | Selected / soft tint |
| `--mk-accent` | `text-accent` | `#2f55b4` | `#7c96e8` | Accent text |
| `--mk-brand-accent` | `bg-brand-accent` / `text-brand-accent` | `#2f55b4` | `#7c96e8` | Icons, charts, highlights |
| `--mk-gold` | `bg-gold` / `text-gold` | `#f5a524` | `#fbbf24` | Accent: CTA on navy, markers, glows |
| `--mk-gold-ink` | `text-(--mk-gold-ink)` | `#b7791f` | `#fbbf24` | Gold as text on light surfaces |
| `--mk-accent-on-dark` | `text-(--mk-accent-on-dark)` | `#f8c766` | `#f8c766` | Gold text and icons on navy |
| `--mk-logo` | `fill: var(--mk-logo)` | `#182c61` | `#e9edf6` | The wordmark |
| `--mk-ring` | `--color-ring` | `rgb(24 44 97 / .28)` | `rgb(124 150 232 / .4)` | Focus halo |

### 2.2 Status

| Tone | Text / fill | Soft background (light) | Dark text | Dark soft |
|---|---|---|---|---|
| success | `#157f3c` | `#eaf6ee` | `#34d399` | `#0f2a21` |
| warning | `#b45309` | `#fdf3e3` | `#fbbf24` | `#2b230f` |
| danger | `#c8302b` | `#fcedec` | `#f87171` | `#321819` |
| info | `#0369a1` | `#e8f2f9` | `#38bdf8` | `#0c2533` |

Status tones always pair the soft background with the tone's text color plus a 12–15 % `ring-current` hairline (`Badge`, `Alert`, icon tiles).

### 2.3 Navy surfaces (brand material)

Night Navy in both themes: the landing hero and bands, the auth brand panel, balance tiles, the selection bar.

| Token | Tailwind | Light | Dark |
|---|---|---|---|
| `--mk-brand` | `bg-brand` | `#0f1d42` | `#0f1d42` |
| `--mk-brand-light` | `bg-brand-light` | `#182c61` | `#182c61` |
| `--mk-panel` | `bg-panel` | `#0f1d42` | `#0f1d42` |
| `--mk-panel-2` | `bg-panel-2` | `#182c61` | `#182c61` |
| `--mk-panel-line` | `border-panel-line` | `rgb(255 255 255 / .07)` | `rgb(255 255 255 / .06)` |
| `--mk-panel-text` | `text-panel-text` | `#cdd5ea` | `#cdd5ea` |
| `--mk-panel-muted` | `text-panel-muted` | `#8b97b8` | `#8b97b8` |

### 2.4 Interactive states

| State | Treatment |
|---|---|
| Hover (neutral) | `bg-surface-3` (ghost) or `bg-surface-2` + `border-line-strong` (secondary, rows) |
| Hover (primary) | `bg-primary-hover` |
| Focus (keyboard) | `box-shadow: 0 0 0 3px var(--mk-ring)` — global `:focus-visible` rule; inputs use the same halo on `:focus` |
| Active / pressed | primary and danger buttons nudge `translate-y-px` |
| Selected | `bg-primary-soft` + `border-primary` + ring halo (option cards); `text-ink` + 2px brand-accent underline and icon (tabs); white raised pill (segmented) |
| Selected (sidebar) | `bg-primary-soft`, semibold ink text, brand-accent icon |
| Disabled | `opacity-50`, `cursor-not-allowed`, no shadow; inputs `bg-surface-2 text-muted` |
| Invalid | `border-danger` + danger-tinted halo |

### 2.5 Chart palette

Single-series charts and ranked bars use the logo green (`brand-accent`); while one column is hovered the others drop to `brand-accent/35`. Part-to-whole charts use the status tones (`brand-accent`, `success`, `warning`, `danger`, `info`, `muted`) and always carry a text legend.

## 3. Typography

Family: **Noto Kufi Arabic** (Arabic + Latin, weights 300–800) loaded through `laravel-vite-plugin/fonts`. Body is 14 px / 1.6. Arabic text is never letter-spaced; Latin headings get `-0.012em` and overlines `0.08em` via `:lang(en)` rules.

| Role | Size / line height | Weight | Implementation |
|---|---|---|---|
| Display (landing hero) | 38/49 → 56/67 | 700 | Landing `h1` |
| Storefront hero | 32/40 → 52/57 | 700 | Store home `h1` |
| Page title | 22/32 → 26/36 (`sm`) | 600 | `PageHeader`, `.mk-page-title` |
| Auth title | 24/36 | 600 | `AuthHeading` |
| Section heading (marketing) | 30 → 34 | 700 | `SectionHeading` |
| Storefront section | 18 → 22/32 | 700 | `SectionHeader` |
| Dialog title | 17/28 | 600 | `DialogHeader` |
| Card title | 15/24 | 600 | `Card` |
| Metric (KPI) | 19/28 → 26/36 | 600, tabular | `StatCard` |
| Body | 14/22 | 400 | default |
| Control / tab text | 13.5 | 500 | `Button md`, `Tabs`, nav items |
| Label | 13/20 | 500 | `Field` |
| Supporting / caption | 12–12.5 | 400 | descriptions, hints |
| Table header | 11.5 | 600 | `.mk-thead` (uppercase + tracked in English) |
| Badge | 11.5 | 500 | `Badge` |
| Overline | 11/16 | 600 | `.mk-overline` |

Figures that must align (KPIs, prices, totals, counters, pagination, all tables) use tabular numerals: `.mk-num`, and `table { font-variant-numeric: tabular-nums }`.

## 4. Spacing (4 px grid)

| Token | Value |
|---|---|
| Page gutter | 16 px phone (`px-4`), 32 px from `sm` (`sm:px-8`); storefront 16 / 24 |
| Page vertical | 24 px phone, 32 px `sm` (dashboard / admin), 40 px portal |
| Content max width | 1440 px (dashboard, admin), 1152 px (`max-w-6xl`, portal, landing), 1280 px (`max-w-7xl`, storefront) |
| Page header → content | 24 px (`mb-6`) |
| Section gap | 24 px between cards (`gap-6`), 32 px between page zones (`gap-8`), 12 px inside a zone (e.g. attention strip + KPIs); landing sections 80–96 px |
| Card padding | 20 px (`p-5`); card header 20 × 14 px, min height 60 px |
| Dialog padding | 24 × 20 px body, 24 × 16 px footer |
| Component gap | 8 px (buttons, toolbars), 12–16 px (grids) |
| Form spacing | 6 px label→control, 16–20 px between fields |
| Nav spacing | 1 px between items, 20 px between groups, 12 px rail padding |
| Table density | 40 px header row, 12–14 px cell padding vertically, 16 px horizontally |

## 5. Geometry and surfaces

| Element | Radius |
|---|---|
| Badges, pills, avatars of people, switches | full |
| Buttons sm/md, inputs, nav items, menu items | 8 px (`rounded-lg`) |
| Buttons lg/xl, icon tiles, small panels | 12 px (`rounded-xl`) |
| Cards, sheets, dropdowns, modals, product cards | 14 px (`rounded-2xl`, overridden in `@theme`) |
| Hero bands, auth card, storefront hero | 18 px (`rounded-3xl`, overridden in `@theme`) |

Component heights: 32 (sm), 40 (md / inputs), 44 (lg / tabs), 52 (xl); icon buttons 36; header bars 64.

Elevation (border first, shadow second):

| Level | Token | Use |
|---|---|---|
| 0 | none | flat panels inside cards |
| 1 | `shadow-card` — `0 1px 2px rgb(16 24 40/.03)` | cards |
| 2 | `shadow-raise` — `+ 0 4px 12px -6px rgb(16 24 40/.08)` | hover on clickable cards, auth card, Ink tiles |
| 3 | `shadow-pop` — `0 0 0 1px …/.03, 0 12px 32px -12px …/.16` | dropdowns, popovers, modals, drawers, toasts |

Overlays: `#0b1116` at 50–55 % with a 2–3 px backdrop blur.

Z-index: sticky headers 20 · mobile sidebar scrim 30 · sidebar / storefront header 30–40 · dialogs 50 · dropdown menus 60 · toasts 70.

## 6. Layout shells

| Shell | File | Composition |
|---|---|---|
| Shared shell | `components/layout/AppShell.jsx` | 264 px light sidebar: logo (plus an optional tag), a context card (store logo, name and live status, with labeled "visit" and "copy link" actions), every nav group open under a quiet label (active page on a soft navy fill with a gold edge marker, navy counters), the account card and menu at its foot; light 64 px sticky header with language, theme and page tools; 1440 px content. Below `lg` the sidebar is a drawer. |
| Merchant dashboard | `components/layout/DashboardLayout.jsx` | `AppShell` with the store card and the permission-filtered sections; home opens on a `WelcomeBanner` (light card, time-of-day greeting, today's date) |
| Platform admin | `components/layout/AdminLayout.jsx` | `AppShell` with an "Admin" tag; home: banner, four headline KPIs, daily charts, per-area breakdown cards, top stores and affiliates |
| Affiliate portal | `features/affiliate-portal/AffiliatePortalLayout.jsx` | `AppShell` with the store card ("بوابة المسوقين"); home: banner with status, tier and the commission tile |
| Auth (vendor, affiliate, admin) | `components/layout/AuthLayout.jsx` | The form on a plain page (logo and toggles above, legal links below) beside a Night Navy brand panel from `lg`: grid texture, gold and blue glows, a badge, headline and three gold-checked points chosen by `audience` (`merchant`, `affiliate`, `admin`) |
| Store public (affiliate join / login) | `components/layout/StorePublicLayout.jsx` | Store-branded header, centered content, "powered by" footer |
| Storefront | `features/storefront/StorefrontLayout.jsx` | Ink announcement bar, sticky header with search field, category rail, perks band, footer; phone tab bar |
| Landing / legal | `pages/landing/*` | Ink hero with grid texture, paper sections, Ink CTA band |

## 6a. Page layouts

| Page type | Layout |
|---|---|
| Home (merchant dashboard, admin overview) | Figures first, then two columns from `xl`: a wide main column (chart, latest orders / orders and affiliate figures, charts, top tables) and a sticky side column (needs-attention list and best sellers / stores and catalog figures). On phones the merchant's side column comes first. |
| List pages (orders, products, customers, inventory, payments, affiliates, coupons, reviews, purchase orders) | Page header, then a `StatStrip` row of KPI cards, then one card holding tabs, the `.mk-toolbar` filter bar and the table. Admin payout and payment summaries sit as a tinted band of cards at the top of their table card. |
| Settings | Side menu of sections (`Tabs variant="vertical"`, sticky from `lg`, a swipeable row of pills on phones) beside one card holding the open section under its icon and title. |
| Detail and form pages (product, purchase order, manual order, support tickets) | Main content in the wide column, summary / status / actions in a sticky side panel (`lg:sticky lg:top-24`). Ticket pages keep the conversation in the main column and type, status and close / reopen beside it. |

Two-column grids always declare `grid-cols-1` for phones and use `min-w-0` columns so wide tables scroll inside their card instead of widening the page.

## 7. Components

| Component | File | Specification |
|---|---|---|
| `Button` | `ui/Button.jsx` | Variants: primary (navy, faint inset highlight), secondary (white, strong hairline, no shadow), soft, ghost, danger, danger-soft, success, brand (gold with night-navy text, for Night Navy bands), outline-light (Night Navy bands only). Sizes 32 / 40 / 44 / 52, icon 36. |
| `Field`, `Input`, `Select`, `Textarea`, `PasswordInput` | `ui/Form.jsx` + `.mk-input` | 40 px, 8 px radius, `border-line-strong/80`, halo focus, invalid state, disabled tint. Label 13 px / 500. |
| `Checkbox`, `Switch`, `OptionCards` | `ui/Form.jsx` | 18 px box; 44 × 24 switch with soft knob shadow; option cards with selected halo. |
| `Badge` | `ui/Display.jsx` | 24 px pill, 11.5 px, tone soft fill + 12 % ring. |
| `Avatar` | `ui/Display.jsx` | `shape="rounded"` (stores) or `"circle"` (people). |
| `Card` | `ui/Display.jsx` | 14 px sheet, header 60 px min with title 15 px / description 12.5 px. |
| `StatCard` | `ui/Display.jsx` | KPI card: 40 px tone icon tile at the start and an optional status pill at the end (text hints become a neutral pill, `TrendBadge` as is), then the 20–24 px bold figure and its label. |
| `StatStrip` | `ui/Display.jsx` | A page's key figures as a row of KPI cards under its header: two per row on phones, sharing the row evenly from `md` (min 192 px each). |
| KPI grid | `.mk-stat-group` | Separate StatCards in a grid (12–16 px gaps); two per row on phones (an odd last card spans the row), widened per page with `sm:`/`xl:` columns. |
| Filter bar | `.mk-toolbar` | Search takes the free width; other filters 176 px (dates 160 px); phones: search on its own row, filters two per row; a lone search caps at 384 px; a trailing button sits at the far end. |
| `EmptyState` | `ui/Display.jsx` | 56 px icon tile inside a dashed halo, 15 px title. |
| `Alert` | `ui/Display.jsx` | Tone fill + ring, 13.5 px. |
| `Modal`, `Drawer` | `ui/Overlay.jsx` | Pop / slide-in, 14 px radius, header with optional tone icon tile, tinted footer. |
| `Dropdown` | `ui/Dropdown.jsx` | 224 px menu, 36 px items, edge-to-edge dividers. |
| `Tabs` | `ui/Navigation.jsx` | `underline` (44 px, brand-accent underline), `segmented` (pill switch for card headers) and `vertical` (side menu from `lg`, arrow keys up/down). |
| `Pagination` | `ui/Navigation.jsx` | 32 px tabular buttons; current page in Ink. |
| `Stepper` | `ui/Navigation.jsx` | 44 px tiles, active tile with focus halo. |
| `ColumnChart`, `BarList`, `SegmentedBar`, `TrendBadge` | `ui/Charts.jsx` | See §2.5; trend badge is a 20 px pill. |
| Lists | `.mk-list`, `divide-y` | Rows never float as separate boxes inside a card: they share one box (`.mk-list`) or run edge to edge with hairline dividers (notifications, tickets, activity). Unread rows get a soft navy tint and a 3 px brand-accent edge. |
| Tables | `.mk-thead` | Tinted header band, 11.5 px semibold labels, `divide-line` rows, `hover:bg-surface-2`. |
| `SidebarNav` | `layout/AppShell.jsx` | Shared grouped navigation for the dashboard, admin and affiliate portal. |
| `PageHeader` | `layout/DashboardLayout.jsx` | Breadcrumbs, page title, 13.5 px description (max 2xl), actions aligned to the bottom; 24 px above the content. |
| `Logo` | `brand/Logo.jsx` | `inverse` keeps "Selly" light on navy. |

## 8. Utility classes

| Class | Purpose |
|---|---|
| `.mk-card` | Standard sheet |
| `.mk-card-link` | Hover lift for clickable cards |
| `.mk-input` | Form control |
| `.mk-stat-group` | KPI card grid |
| `.mk-toolbar` | Filter bar above tables and lists |
| `.mk-list` | Grouped list: rows in one bordered box split by hairlines (portal orders and payouts, drawer address lists) |
| `.mk-thead` | Table header row |
| `.mk-page-title` | Page title type role |
| `.mk-overline` | Small group label |
| `.mk-num` | Tabular figures |
| `.mk-grid-texture` | 32 px hairline grid for navy bands (mask it with a gradient) |
| `.mk-scroll`, `.mk-scroll-dark`, `.mk-rail` | Scrollbars and swipe rails |
| `.ltr` | Left-to-right runs inside RTL text |

## 9. Direction, language and responsiveness

- Layouts use logical properties (`ms-`, `pe-`, `start-`, `end-`, `border-s`) so Arabic (RTL, default) and English (LTR) mirror automatically.
- Arrow and chevron icons are drawn for RTL; `Icon` mirrors them in English, so always request the Arabic drawing (`arrow-left`, `chevron-left`).
- Breakpoints follow Tailwind (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536). The navy rail becomes an off-canvas drawer below `lg`; KPI ribbons show two figures per row on phones with 16 px cell padding and 19 px figures; filter bars stack search above paired filters; the auth brand panel appears from `lg`.
- Motion: 150–300 ms ease-out; everything is disabled under `prefers-reduced-motion`.
