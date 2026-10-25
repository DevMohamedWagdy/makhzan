# SellyGrow Design System — "Ink & Leaf"

The visual language for every SellyGrow surface: the merchant dashboard, the platform admin, the affiliate (marketer) portal, the customer storefront, and the public landing / auth pages.

All tokens live in `resources/css/app.css`. Components consume them through Tailwind utilities (`bg-surface`, `text-ink`, `border-line`, …), so a token change propagates everywhere and Light / Dark switch by toggling `.dark` on `<html>`.

## 1. Concept

**White, ink and the logo's leaf.** The palette uses the logo's two colors exactly: navy `#17212B` and Growth Green `#16A35F`.

- **Canvas** — a light gray app canvas (`#f5f6f8`) with white cards (hairline border + soft shadow), a white sidebar and a white header bar.
- **Ink** — the logo navy (`#17212b`) is the text color and a solid *material* for brand bands: landing and storefront heroes, commission and balance tiles, auth brand panel.
- **Leaf** — the logo green (`#16a35f`, `brand-green`) is the signature accent: icons, charts, active tabs and nav icons, counters, focus halo, key figures and CTAs on navy. Navy text on it (and it on navy) reads at 5:1.
- **Deep green** (`--mk-primary`, `#0e7a46`) is kept only where white or small green text sits on/against light surfaces: primary buttons, links, badges. White on the logo green would only reach 3.2:1.

Restraint rules: no decorative gradients on light surfaces, no glassmorphism beyond the sticky headers' `backdrop-blur`, no neon, no heavy drop shadows. Ink bands may use the hairline grid texture and a soft green glow.

## 2. Color

### 2.1 Semantic tokens

| Token (CSS var) | Tailwind | Light | Dark | Use |
|---|---|---|---|---|
| `--mk-bg` | `bg-bg` | `#f5f6f8` | `#0a0f13` | Page canvas |
| `--mk-surface` | `bg-surface` | `#ffffff` | `#11181e` | Cards, sheets, inputs |
| `--mk-surface-2` | `bg-surface-2` | `#f8f9fa` | `#141c23` | Table headers, footers of dialogs, row hover |
| `--mk-surface-3` | `bg-surface-3` | `#f1f3f4` | `#1a242c` | Ghost hover, segmented track, skeletons |
| `--mk-border` | `border-line` | `#e7e9ee` | `#222d36` | Hairlines, dividers |
| `--mk-border-strong` | `border-line-strong` | `#d3d8dd` | `#2f3c46` | Input borders, hover borders |
| `--mk-text` | `text-ink` | `#17212b` | `#e9edea` | Primary text |
| `--mk-text-2` | `text-ink-2` | `#45505b` | `#adb7b1` | Secondary text |
| `--mk-muted` | `text-muted` | `#6b7480` | `#7d8992` | Labels, captions, placeholders |
| `--mk-primary` | `bg-primary` / `text-primary` | `#0e7a46` | `#1c9459` | Actions, links, focus |
| `--mk-primary-hover` | `bg-primary-hover` | `#0a6239` | `#23a866` | Primary hover |
| `--mk-primary-soft` | `bg-primary-soft` | `#e8f3ec` | `#11281d` | Selected / soft tint |
| `--mk-accent` | `text-accent` | `#16a35f` | `#16a35f` | Brand green accent |
| `--mk-brand-green` | `bg-brand-green` / `text-brand-green` | `#16a35f` | `#16a35f` | Logo green: icons, charts, highlights |
| `--mk-ring` | `--color-ring` | `rgb(22 163 95 / .3)` | `rgb(22 163 95 / .4)` | Focus halo |

### 2.2 Status

| Tone | Text / fill | Soft background (light) | Dark text | Dark soft |
|---|---|---|---|---|
| success | `#157f3c` | `#eaf6ee` | `#34d399` | `#0f2a21` |
| warning | `#b45309` | `#fdf3e3` | `#fbbf24` | `#2b230f` |
| danger | `#c8302b` | `#fcedec` | `#f87171` | `#321819` |
| info | `#0369a1` | `#e8f2f9` | `#38bdf8` | `#0c2533` |

Status tones always pair the soft background with the tone's text color plus a 12–15 % `ring-current` hairline (`Badge`, `Alert`, icon tiles).

### 2.3 Navy bands (brand surfaces)

The logo navy in both themes; used for brand bands, not for the app sidebars.

| Token | Tailwind | Light | Dark |
|---|---|---|---|
| `--mk-panel` | `bg-panel` | `#17212b` | `#17212b` |
| `--mk-panel-2` | `bg-panel-2` | `#1f2b37` | `#1f2b37` |
| `--mk-panel-line` | `border-panel-line` | `rgb(255 255 255 / .07)` | `rgb(255 255 255 / .06)` |
| `--mk-panel-text` | `text-panel-text` | `#c9d1d9` | `#c9d1d9` |
| `--mk-panel-muted` | `text-panel-muted` | `#8794a1` | `#8794a1` |

Static brand colors: `brand #17212b`, `brand-light #223140`.

### 2.4 Interactive states

| State | Treatment |
|---|---|
| Hover (neutral) | `bg-surface-3` (ghost) or `bg-surface-2` + `border-line-strong` (secondary, rows) |
| Hover (primary) | `bg-primary-hover` |
| Focus (keyboard) | `box-shadow: 0 0 0 3px var(--mk-ring)` — global `:focus-visible` rule; inputs use the same halo on `:focus` |
| Active / pressed | primary and danger buttons nudge `translate-y-px` |
| Selected | `bg-primary-soft` + `border-primary` + ring halo (option cards); `text-ink` + 2px logo-green underline and icon (tabs); white raised pill (segmented) |
| Selected (sidebar) | `bg-primary-soft`, semibold ink text, logo-green icon |
| Disabled | `opacity-50`, `cursor-not-allowed`, no shadow; inputs `bg-surface-2 text-muted` |
| Invalid | `border-danger` + danger-tinted halo |

### 2.5 Chart palette

Single-series charts and ranked bars use the logo green (`brand-green`); while one column is hovered the others drop to `brand-green/35`. Part-to-whole charts use the status tones (`brand-green`, `success`, `warning`, `danger`, `info`, `muted`) and always carry a text legend.

## 3. Typography

Family: **Alexandria** (Arabic + Latin, weights 300–800) loaded through `laravel-vite-plugin/fonts`. Body is 14 px / 1.6. Arabic text is never letter-spaced; Latin headings get `-0.012em` and overlines `0.08em` via `:lang(en)` rules.

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
| Merchant dashboard | `components/layout/DashboardLayout.jsx` | 264 px white sidebar: logo, one compact store row (name, link, visit and copy icon buttons), quiet group labels, active page on a soft green highlight with a logo-green icon, green counters; white 64 px header; gray canvas; 1440 px content |
| Platform admin | `components/layout/AdminLayout.jsx` | Same white sidebar (248 px) through the shared `SidebarNav`, with a green "Admin" tag |
| Affiliate portal | `features/affiliate-portal/AffiliatePortalLayout.jsx` | Store-branded top bar with underline tabs; Ink commission tile on the home |
| Auth (vendor, admin) | `components/layout/AuthLayout.jsx` | Form column on paper + Ink brand panel (≥ lg) with grid texture and product promise |
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
| `Button` | `ui/Button.jsx` | Variants: primary (deep green, faint inset highlight), secondary (white, strong hairline, no shadow), soft, ghost, danger, danger-soft, success, brand (logo green with navy text, for navy bands), outline-light (navy bands only). Sizes 32 / 40 / 44 / 52, icon 36. |
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
| `Tabs` | `ui/Navigation.jsx` | `underline` (44 px, logo-green underline), `segmented` (pill switch for card headers) and `vertical` (side menu from `lg`, arrow keys up/down). |
| `Pagination` | `ui/Navigation.jsx` | 32 px tabular buttons; current page in Ink. |
| `Stepper` | `ui/Navigation.jsx` | 44 px tiles, active tile with focus halo. |
| `ColumnChart`, `BarList`, `SegmentedBar`, `TrendBadge` | `ui/Charts.jsx` | See §2.5; trend badge is a 20 px pill. |
| Lists | `.mk-list`, `divide-y` | Rows never float as separate boxes inside a card: they share one box (`.mk-list`) or run edge to edge with hairline dividers (notifications, tickets, activity). Unread rows get a soft green tint and a 3 px logo-green edge. |
| Tables | `.mk-thead` | Tinted header band, 11.5 px semibold labels, `divide-line` rows, `hover:bg-surface-2`. |
| `SidebarNav` | `layout/DashboardLayout.jsx` | Shared Ink navigation for dashboard and admin. |
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
