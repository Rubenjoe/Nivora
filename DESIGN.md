---
version: alpha
name: Nivora
description: A calm, editorial finance workspace with precise data color and restrained glass.
colors:
  primary: "#A995FF"
  primary-light: "#5D4AC4"
  secondary: "#A9ADB8"
  secondary-light: "#565D68"
  tertiary: "#D6B779"
  tertiary-light: "#88692A"
  background: "#101216"
  background-light: "#F4F1EA"
  surface: "#191D23"
  surface-light: "#FFFDF8"
  foreground: "#F4F1EC"
  foreground-light: "#17191D"
  income: "#7ED7B2"
  income-light: "#14724F"
  expense: "#F18782"
  expense-light: "#B23A3C"
  analytics: "#88B9EC"
  analytics-light: "#2A5FA8"
  border: "#2B3039"
  border-light: "#DED8CB"
typography:
  display:
    fontFamily: Ranade
    fontSize: 3.5rem
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  body-md:
    fontFamily: Ranade
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: Ranade
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: 8px
  md: 10px
  lg: 16px
  xl: 20px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#17151D"
    rounded: "{rounded.md}"
    height: 44px
    padding: "0 20px"
  button-primary-light:
    backgroundColor: "{colors.primary-light}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: 44px
    padding: "0 20px"
  financial-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  financial-surface-light:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.lg}"
    padding: 24px
  secondary-copy:
    backgroundColor: "{colors.background}"
    textColor: "{colors.secondary}"
  secondary-copy-light:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.secondary-light}"
  income-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.income}"
  income-label-light:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.income-light}"
  expense-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.expense}"
  expense-label-light:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.expense-light}"
  analytics-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.analytics}"
  analytics-label-light:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.analytics-light}"
  gold-detail:
    backgroundColor: "{colors.background}"
    textColor: "{colors.tertiary}"
  gold-detail-light:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.tertiary-light}"
  divider-dark:
    backgroundColor: "{colors.border}"
    textColor: "{colors.foreground}"
    height: 1px
  divider-light:
    backgroundColor: "{colors.border-light}"
    textColor: "{colors.foreground-light}"
    height: 1px
---

# Nivora design system

This document describes the current interface direction and token sources. It is maintained against the actual styles in `src/app/`.

## Direction

Use a dark-first finance workspace built from deep graphite backgrounds, softly illuminated glass surfaces, warm neutral text, and restrained violet highlights. Keep financial status colors distinct and meaningful. Use blur selectively, maintain readable contrast, and avoid decorative imagery, demo numbers, neon effects, or distracting motion. Dark is the default and the light-theme preference remains available to users.

Vitrea's rendered overview informed the horizontal glass navigation, compact metric row, prominent chart with a narrower insight panel, translucent control dock, and mobile bottom dock. Nivora retains its own name, copy, product data, routes, and component implementation. The Ranade variable font is self-hosted as a local WOFF2 asset; no font request goes to a third-party host.

## Tokens and typography

The active token sources are `src/app/studio.css` (the final authority layer, imported last), `src/app/auth.css` (the authentication scene), `src/app/vitrea-ui.css`, and `src/components/theme-toggle.tsx`; `theme-system.css` adapts light surfaces, forms, charts, and motion to the studio tokens. `globals.css`, `theme.css`, `dark-theme.css`, `premium-palette.css`, `premium.css`, and `features.css` are historic layers still consumed by individual components. An inline bootstrap script in `src/app/layout.tsx` applies the stored theme before paint.

Ranade is the single typeface across the interface, including headings, forms, navigation, charts, and authentication. The variable file supports the interface's range of weights while keeping the font self-hosted. Body copy uses a 16 px base, and financial values use tabular numerals. Keep content aligned to a consistent max width and use shared card/control radii, quiet borders, and visible focus rings.

Semantic colour roles (effective values, dark / light):

- Dark: background `#101216`, secondary background `#15181D`, card `#191D23`, elevated `#22262E`, border `#2B3039`, text `#F4F1EC`, secondary text `#A9ADB8`, muted `#828793`, violet `#A995FF`, gold `#D6B779`, income `#7ED7B2`, expense `#F18782`, chart comparison blue `#88B9EC`, category cyan `#7FC8C8`.
- Light: background `#F4F1EA`, secondary background `#ECE8DF`, card `#FFFDF8`, elevated `#F8F5EE`, border `#DED8CB`, text `#17191D`, secondary text `#565D68`, muted `#6F757F`, violet `#5D4AC4`, gold `#88692A`, income `#14724F`, expense `#B23A3C`, chart comparison blue `#2A5FA8`, category cyan `#17727A`.
- Surfaces are deliberately monochrome (near-black graphite / white). Saturated colour is reserved for data and actions: violet primary, mint income, rose expense, blue comparison, cyan/amber categories.
- Category chart tokens `--chart-cat-1`…`6` resolve through the same theme and are assigned deterministically by category name with collision resolution, so donut segments, list dots, and analytics bars agree.
- `--color-control-border` is intentionally stronger than the decorative border so form controls meet the 3:1 non-text contrast threshold (`#63636F` dark, `#8A8A80` light).

Metric cards differentiate through a small tinted icon container, a top accent line, and a subtle tinted surface gradient; labels and signs (`+`/`−`) stay visible so financial status is never communicated by color alone. Cash-flow lines use income/expense colours with a dashed expense stroke for colour-vision distinction. Money strings come from `src/lib/finance/money-format.ts`, which uses `Intl.NumberFormat` for `en-IN` grouping and `decimal.js` for digits; presentation never adds its own currency prefix.

Violet is the single action accent: primary buttons (including form submits), selected controls, and focus rings all resolve to `--color-primary`. Muted champagne gold is restricted to brand hairlines and quiet details — the greeting dot, active-navigation underline and icon, the brand mark edge, and savings-goal progress. Body text, amounts, charts, and labels stay high-contrast neutral or semantic.

The canvas stays visible beneath the content: three fixed radial washes on `body` (violet above, champagne at the right edge, violet below) plus one fixed, pointer-transparent SVG grain layer at 5% dark / 3.5% light. Authentication pages keep their own quieter backdrop (mesh, two drifting glows, cursor spotlight, grain, vignette) above the same tokens.

`.glass-surface` is reserved for the floating app header, desktop navigation capsule, mobile drawer, and quick-action dock. It uses a dark translucent fill, restrained 16–24 px backdrop blur, upper-edge highlight, and graphite fallback when backdrop filtering is unsupported or reduced transparency is preferred. It is a CSS-only layering effect, not shader-based refraction or a capture of underlying financial DOM. Finance content panels remain stable, opaque surfaces.

Motion: render the server-ready page without a blocking startup lockup. Keep section entrances short (~300–380 ms, ≤10 px, opacity/transform only), hover/press feedback responsive (140–220 ms), and avoid repeated dashboard animation on filter changes. All movement is disabled under `prefers-reduced-motion`.

## Layout and interaction

Authenticated desktop users get a compact horizontal navigation bar, account controls, and appearance settings. On smaller screens, navigation moves into an accessible drawer with full labels and 46 px rows. Signed-out users see the brand, appearance control, and sign-in actions; private feature routes show a sign-in gate, while the home and help pages remain public. Interactive targets are at least 44 px tall on touch layouts, mobile inputs use 16 px text to avoid iOS zoom, and safe-area insets are respected. The Simple/Pro preference lives only in Settings. Dashboard cards and charts must fit without horizontal page overflow.

Use semantic links and buttons, explicit labels, accessible names for icon actions, visible keyboard focus, loading/error/empty states, and `prefers-reduced-motion`. Motion should be brief and limited to opacity/transform. Do not imply that unsupported routes, settings, or integrations work.

## Data presentation

Dashboard figures come from the versioned finance API and are profile-scoped on the server. Show net cash flow, income, and expenses; do not show account balance or savings unless a corresponding data model supports it. Empty states explain how real entries will populate the page. Use category colors consistently and provide text/amount alternatives to charts.

## Current verification limits

The local browser preview was visually reviewed in the unauthenticated state at desktop and mobile widths. The real Auth and database flows remain unverified. See `IMPLEMENTATION_PROGRESS.md` for the checks actually run and remaining external configuration work.
