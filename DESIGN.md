# Nivora design system

This document describes the current interface direction and token sources. It is maintained against the actual styles in `src/app/`.

## Direction

Use a dark-first finance workspace built from deep graphite backgrounds, softly illuminated glass surfaces, warm neutral text, and restrained violet highlights. Keep financial status colors distinct and meaningful. Use blur selectively, maintain readable contrast, and avoid decorative imagery, demo numbers, neon effects, or distracting motion. Dark is the default and the light-theme preference remains available to users.

Vitrea's rendered overview informed the horizontal glass navigation, compact metric row, prominent chart with a narrower insight panel, translucent control dock, and mobile bottom dock. Nivora retains its own name, copy, product data, routes, and component implementation. The app uses an installed system font stack rather than requesting a remote font.

## Tokens and typography

The active token sources are `src/app/vitrea-ui.css` (semantic tokens for both themes) and `src/components/theme-toggle.tsx`; `theme-system.css` is the final component layer that adapts light surfaces, forms, charts, and motion to those tokens. `globals.css`, `theme.css`, `dark-theme.css`, `premium-palette.css`, `premium.css`, and `features.css` supply underlying component styles. `theme-system.css` is imported last so its shared corrections take precedence. An inline bootstrap script in `src/app/layout.tsx` applies the stored theme before paint.

Use the existing sans-serif system stack and clear type hierarchy. Financial values use tabular numerals where available. Keep content aligned to a consistent max width and use shared card/control radii, quiet borders, and visible focus rings.

Semantic colour roles:

- Dark: background `#070709`, secondary background `#0E0E12`, card `#141419`, elevated `#1C1C23`, border `#2E2E38`, text `#FFFFFF`, secondary text `#B4B4C0`, muted `#9494A3`, violet `#8B7BFF`, gold `#D9B26A`, income `#4ADE80`, expense `#FF6B81`, chart comparison blue `#5EA8FF`, category cyan `#22D3EE`.
- Light: background `#F7F7F4`, secondary background `#ECECE6`, card `#FFFFFF`, elevated `#FAFAF7`, border `#DCDCD4`, text `#0B0B0D`, secondary text `#54545E`, muted `#64646E`, violet `#5B45D6`, gold `#7A5A1E`, income `#067A46`, expense `#C0263A`, chart comparison blue `#1D4ED8`, category cyan `#0E7490`.
- Surfaces are deliberately monochrome (near-black graphite / white). Saturated colour is reserved for data and actions: violet primary, mint income, rose expense, blue comparison, cyan/amber categories.
- Category chart tokens `--chart-cat-1`…`6` resolve through the same theme and are assigned deterministically by category name with collision resolution, so donut segments, list dots, and analytics bars agree.
- `--color-control-border` is intentionally stronger than the decorative border so form controls meet the 3:1 non-text contrast threshold (`#63636F` dark, `#8A8A80` light).

Metric cards differentiate through a small tinted icon container, a top accent line, and a subtle tinted surface gradient; labels and signs (`+`/`−`) stay visible so financial status is never communicated by color alone. Cash-flow lines use income/expense colours with a dashed expense stroke for colour-vision distinction. Money strings come from `src/lib/finance/money-format.ts`, which uses `Intl.NumberFormat` for `en-IN` grouping and `decimal.js` for digits; presentation never adds its own currency prefix.

Gold is a restrained brand accent: greeting dot, active-navigation hairline, dock selection edge, savings-goal progress, and the brand mark edge. Body text, amounts, charts, and labels stay high-contrast neutral or semantic.

`.glass-surface` is reserved for the floating app header, desktop navigation capsule, mobile drawer, and quick-action dock. It uses a dark translucent fill, restrained 16–24 px backdrop blur, upper-edge highlight, and graphite fallback when backdrop filtering is unsupported or reduced transparency is preferred. It is a CSS-only layering effect, not shader-based refraction or a capture of underlying financial DOM. Finance content panels remain stable, opaque surfaces.

Motion: short staggered section entrances (~300 ms, ≤10 px, opacity/transform only), greeting/h1 rise, 140–220 ms hover/press and dock-indicator movement, animated profile-menu entrance, and no repeated dashboard animation on filter changes. All movement is disabled under `prefers-reduced-motion`.

## Layout and interaction

Desktop uses a compact horizontal navigation bar with all implemented routes, real account controls, appearance, and the Simple/Pro preference. A separate quick-action dock provides working transaction, CSV export, and settings actions. The dock is not primary navigation: it shows a sliding selection edge only when the current route matches the transactions or settings destination, and no selection on the dashboard or other routes. At narrower widths navigation moves to an accessible drawer; the dock becomes a bottom pill with touch-sized controls. Dashboard cards and charts must fit without horizontal page overflow.

Use semantic links and buttons, explicit labels, accessible names for icon actions, visible keyboard focus, loading/error/empty states, and `prefers-reduced-motion`. Motion should be brief and limited to opacity/transform. Do not imply that unsupported routes, settings, or integrations work.

## Data presentation

Dashboard figures come from the versioned finance API and are profile-scoped on the server. Show net cash flow, income, and expenses; do not show account balance or savings unless a corresponding data model supports it. Empty states explain how real entries will populate the page. Use category colors consistently and provide text/amount alternatives to charts.

## Current verification limits

The local browser preview was visually reviewed in the unauthenticated state at desktop and mobile widths. The real Auth and database flows remain unverified. See `IMPLEMENTATION_PROGRESS.md` for the checks actually run and remaining external configuration work.
