# SellyGrow Design System — "Ink & Sprout"

The visual language for every SellyGrow surface: the merchant dashboard, the platform admin, the affiliate (marketer) portal, the customer storefront, and the public landing / auth pages.

All tokens live in `resources/css/app.css`. Components consume them through Tailwind utilities (`bg-surface`, `text-ink`, `border-line`, …), so a token change propagates everywhere and Light / Dark switch by toggling `.dark` on `<html>`.

## 1. Concept

**Paper, ink and one green shoot.**

- **Paper** — a warm off-white canvas with white sheets on top. Structure comes from hairline borders first, shadows second.
- **Ink** — the brand's near-black (`#121a21`) is used as a solid *material*, not only as text: the navigation rail, hero bands, commission and balance tiles, auth brand panel.
- **Sprout** — the logo's lime (`#b8f171`) is the single signature accent. It appears **only on Ink** (active nav marker, counters, hero CTAs, key figures). It is never used on light surfaces, where it is unreadable.
- **Growth Green** (`--mk-primary`) carries action: primary buttons, links, focus, selected states, charts.

Restraint rules: no decorative gradients on light surfaces, no glassmorphism beyond the sticky headers' `backdrop-blur`, no neon, no heavy drop shadows. Ink bands may use the hairline grid texture and a soft green glow.

## 2. Color

### 2.1 Semantic tokens

| Token (CSS var) | Tailwind | Light | Dark | Use |
|---|---|---|---|---|
| `--mk-bg` | `bg-bg` | `#f4f4ef` | `#0a0f13` | Page canvas |
| `--mk-surface` | `bg-surface` | `#ffffff` | `#11181e` | Cards, sheets, inputs |
| `--mk-surface-2` | `bg-surface-2` | `#fafaf7` | `#141c23` | Table headers, footers of dialogs, row hover |
| `--mk-surface-3` | `bg-surface-3` | `#f0f0ea` | `#1a242c` | Ghost hover, segmented track, skeletons |
| `--mk-border` | `border-line` | `#e6e6df` | `#222d36` | Hairlines, dividers |
| `--mk-border-strong` | `border-line-strong` | `#d4d5cc` | `#2f3c46` | Input borders, hover borders |
| `--mk-text` | `text-ink` | `#121a21` | `#e9edea` | Primary text |
| `--mk-text-2` | `text-ink-2` | `#434d55` | `#adb7b1` | Secondary text |
| `--mk-muted` | `text-muted` | `#6c736e` | `#7d8992` | Labels, captions, placeholders |
| `--mk-primary` | `bg-primary` / `text-primary` | `#0e7a46` | `#1c9459` | Actions, links, focus |
| `--mk-primary-hover` | `bg-primary-hover` | `#0a6239` | `#23a866` | Primary hover |
| `--mk-primary-soft` | `bg-primary-soft` | `#e8f3ec` | `#11281d` | Selected / soft tint |
| `--mk-accent` | `text-accent` | `#16a35f` | `#b8f171` | Brand green accent |
| `--mk-ring` | `--color-ring` | `rgb(14 122 70 / .28)` | `rgb(184 241 113 / .3)` | Focus halo |

### 2.2 Status

| Tone | Text / fill | Soft background (light) | Dark text | Dark soft |
|---|---|---|---|---|
| success | `#157f3c` | `#eaf6ee` | `#34d399` | `#0f2a21` |
| warning | `#b45309` | `#fdf3e3` | `#fbbf24` | `#2b230f` |
| danger | `#c8302b` | `#fcedec` | `#f87171` | `#321819` |
| info | `#0369a1` | `#e8f2f9` | `#38bdf8` | `#0c2533` |

Status tones always pair the soft background with the tone's text color plus a 12–15 % `ring-current` hairline (`Badge`, `Alert`, icon tiles).

### 2.3 Ink rail (navigation and brand bands)

Constant across themes, a touch deeper in dark.

| Token | Tailwind | Light | Dark |
|---|---|---|---|
| `--mk-panel` | `bg-panel` | `#111920` | `#0d1318` |
| `--mk-panel-2` | `bg-panel-2` | `#19232c` | `#151e25` |
| `--mk-panel-line` | `border-panel-line` | `rgb(255 255 255 / .07)` | `rgb(255 255 255 / .06)` |
| `--mk-panel-text` | `text-panel-text` | `#c9d1cc` | `#c2cbc6` |
| `--mk-panel-muted` | `text-panel-muted` | `#7f8b85` | `#75817b` |
| `--mk-sprout` | `bg-sprout` / `text-sprout` | `#b8f171` | `#b8f171` |

Static brand colors: `brand #121a21`, `brand-light #1f2b36`, `brand-green #16a35f`.

### 2.4 Interactive states

| State | Treatment |
|---|---|
| Hover (neutral) | `bg-surface-3` (ghost) or `bg-surface-2` + `border-line-strong` (secondary, rows) |
| Hover (primary) | `bg-primary-hover` |
| Focus (keyboard) | `box-shadow: 0 0 0 3px var(--mk-ring)` — global `:focus-visible` rule; inputs use the same halo on `:focus` |
| Active / pressed | primary and danger buttons nudge `translate-y-px` |
| Selected | `bg-primary-soft` + `border-primary` + ring halo (option cards); `text-ink` + 2px primary underline (tabs); white raised pill (segmented) |
| Selected (Ink rail) | `bg-white/[0.07]`, white text, Sprout icon, 3px Sprout marker on the inline-start edge |
| Disabled | `opacity-50`, `cursor-not-allowed`, no shadow; inputs `bg-surface-2 text-muted` |
| Invalid | `border-danger` + danger-tinted halo |

### 2.5 Chart palette

Single-series charts use `primary`; while one column is hovered the others drop to `primary/35`. Part-to-whole charts use the status tones (`primary`, `success`, `warning`, `danger`, `info`, `muted`) and always carry a text legend.

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
| Metric (KPI) | 22/32 → 26/36 | 600, tabular | `StatCard` |
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
| Page header → content | 28 px (`mb-7`) |
| Section gap | 24 px (`gap-6`); landing sections 80–96 px |
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
| 1 | `shadow-card` — `0 1px 2px rgb(18 26 33/.04)` | cards, secondary buttons |
| 2 | `shadow-raise` — `+ 0 10px 28px -14px rgb(18 26 33/.16)` | hover on clickable cards, auth card, Ink tiles |
| 3 | `shadow-pop` — `0 0 0 1px …/.03, 0 28px 56px -18px …/.28` | dropdowns, popovers, modals, drawers, toasts |

Overlays: `#0b1116` at 50–55 % with a 2–3 px backdrop blur.

Z-index: sticky headers 20 · mobile sidebar scrim 30 · sidebar / storefront header 30–40 · dialogs 50 · dropdown menus 60 · toasts 70.

## 6. Layout shells

| Shell | File | Composition |
|---|---|---|
| Merchant dashboard | `components/layout/DashboardLayout.jsx` | 264 px Ink rail (logo, store card with visit / copy, grouped nav with Sprout marker and counters) + translucent 64 px header + 1440 px content |
| Platform admin | `components/layout/AdminLayout.jsx` | Same Ink rail (248 px) through the shared `SidebarNav`, with an "Admin" Sprout tag |
| Affiliate portal | `features/affiliate-portal/AffiliatePortalLayout.jsx` | Store-branded top bar with underline tabs; Ink commission tile on the home |
| Auth (vendor, admin) | `components/layout/AuthLayout.jsx` | Form column on paper + Ink brand panel (≥ lg) with grid texture and product promise |
| Store public (affiliate join / login) | `components/layout/StorePublicLayout.jsx` | Store-branded header, centered content, "powered by" footer |
| Storefront | `features/storefront/StorefrontLayout.jsx` | Ink announcement bar, sticky header with search field, category rail, perks band, footer; phone tab bar |
| Landing / legal | `pages/landing/*` | Ink hero with grid texture, paper sections, Ink CTA band |

## 7. Components

| Component | File | Specification |
|---|---|---|
| `Button` | `ui/Button.jsx` | Variants: primary (inset highlight + 1 px green shadow), secondary (white, strong hairline, card shadow), soft, ghost, danger, danger-soft, success, sprout (Ink only), outline-light (Ink only). Sizes 32 / 40 / 44 / 52, icon 36. |
| `Field`, `Input`, `Select`, `Textarea`, `PasswordInput` | `ui/Form.jsx` + `.mk-input` | 40 px, 8 px radius, `border-line-strong/80`, halo focus, invalid state, disabled tint. Label 13 px / 500. |
| `Checkbox`, `Switch`, `OptionCards` | `ui/Form.jsx` | 18 px box; 44 × 24 switch with soft knob shadow; option cards with selected halo. |
| `Badge` | `ui/Display.jsx` | 24 px pill, 11.5 px, tone soft fill + 12 % ring. |
| `Avatar` | `ui/Display.jsx` | `shape="rounded"` (stores) or `"circle"` (people). |
| `Card` | `ui/Display.jsx` | 14 px sheet, header 60 px min with title 15 px / description 12.5 px. |
| `StatCard` | `ui/Display.jsx` | Label + 32 px icon tile on one line, metric below, optional hint (e.g. `TrendBadge`). |
| KPI ribbon | `.mk-stat-group` | StatCards joined in one sheet with hairline dividers; cells draw their own end/bottom rules so partial rows stay clean. |
| `EmptyState` | `ui/Display.jsx` | 56 px icon tile inside a dashed halo, 15 px title. |
| `Alert` | `ui/Display.jsx` | Tone fill + ring, 13.5 px. |
| `Modal`, `Drawer` | `ui/Overlay.jsx` | Pop / slide-in, 14 px radius, header with optional tone icon tile, tinted footer. |
| `Dropdown` | `ui/Dropdown.jsx` | 224 px menu, 36 px items, edge-to-edge dividers. |
| `Tabs` | `ui/Navigation.jsx` | `underline` (44 px, primary underline) and `segmented` (pill switch for card headers). |
| `Pagination` | `ui/Navigation.jsx` | 32 px tabular buttons; current page in Ink. |
| `Stepper` | `ui/Navigation.jsx` | 44 px tiles, active tile with focus halo. |
| `ColumnChart`, `BarList`, `SegmentedBar`, `TrendBadge` | `ui/Charts.jsx` | See §2.5; trend badge is a 20 px pill. |
| Tables | `.mk-thead` | Tinted header band, 11.5 px semibold labels, `divide-line` rows, `hover:bg-surface-2`. |
| `SidebarNav` | `layout/DashboardLayout.jsx` | Shared Ink navigation for dashboard and admin. |
| `PageHeader` | `layout/DashboardLayout.jsx` | Breadcrumbs, page title, 13.5 px description (max 2xl), actions aligned to the bottom. |
| `Logo` | `brand/Logo.jsx` | `inverse` keeps "Selly" light on Ink. |

## 8. Utility classes

| Class | Purpose |
|---|---|
| `.mk-card` | Standard sheet |
| `.mk-card-link` | Hover lift for clickable cards |
| `.mk-input` | Form control |
| `.mk-stat-group` | KPI ribbon |
| `.mk-thead` | Table header row |
| `.mk-page-title` | Page title type role |
| `.mk-overline` | Small group label |
| `.mk-num` | Tabular figures |
| `.mk-grid-texture` | 32 px hairline grid for Ink bands (mask it with a gradient) |
| `.mk-scroll`, `.mk-scroll-dark`, `.mk-rail` | Scrollbars and swipe rails |
| `.ltr` | Left-to-right runs inside RTL text |

## 9. Direction, language and responsiveness

- Layouts use logical properties (`ms-`, `pe-`, `start-`, `end-`, `border-s`) so Arabic (RTL, default) and English (LTR) mirror automatically.
- Arrow and chevron icons are drawn for RTL; `Icon` mirrors them in English, so always request the Arabic drawing (`arrow-left`, `chevron-left`).
- Breakpoints follow Tailwind (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536). The Ink rail becomes an off-canvas drawer below `lg`; KPI ribbons collapse to one column on phones with 16 px cell padding and 22 px figures; the auth brand panel appears from `lg`.
- Motion: 150–300 ms ease-out; everything is disabled under `prefers-reduced-motion`.
