# Nivora design system

This document describes the current interface direction and token sources. It is maintained against the actual styles in `src/app/`.

## Direction

Use a dark-first finance workspace built from deep graphite backgrounds, softly illuminated glass surfaces, warm neutral text, and restrained violet highlights. Keep financial status colors distinct and meaningful. Use blur selectively, maintain readable contrast, and avoid decorative imagery, demo numbers, neon effects, or distracting motion. Dark is the default and the light-theme preference remains available to users.

Vitrea's rendered overview informed the horizontal glass navigation, compact metric row, prominent chart with a narrower insight panel, translucent control dock, and mobile bottom dock. Nivora retains its own name, copy, product data, routes, and component implementation. The app uses an installed system font stack rather than requesting a remote font.

## Tokens and typography

The active token sources are `src/app/vitrea-ui.css` and `src/components/theme-toggle.tsx`; `globals.css`, `theme.css`, `dark-theme.css`, `premium-palette.css`, `premium.css`, and `features.css` supply underlying component styles. `vitrea-ui.css` is imported last so its shared graphite and glass system takes precedence. Check these files together before introducing a new global color or spacing value.

Use the existing sans-serif system stack and clear type hierarchy. Financial values use tabular numerals where available. Keep content aligned to a consistent max width and use shared card/control radii, quiet borders, and visible focus rings.

Semantic color roles (dark values): background `#0d0f13`, raised surfaces from charcoal (`#181b21`), primary text `#f3f2f7`, secondary text `#a3a6b2`, violet accent `#a995ff`, income/positive `#70d6b2`, expense/negative `#ff897f`, secondary chart series `#87b7ff`, savings/goal accent `#f4c878`. Metric cards differentiate through a small tinted icon container, a top accent line, and a subtle tinted surface gradient; labels and signs (`+`/`−`) stay visible so financial status is never communicated by color alone. Chart palettes reuse the same roles: cash-flow lines use income/expense colors with soft area fills, and donut segments draw from the shared category palette.

`.glass-surface` is reserved for the floating app header, desktop navigation capsule, mobile drawer, and quick-action dock. It uses a dark translucent fill, restrained 16–24 px backdrop blur, upper-edge highlight, and graphite fallback when backdrop filtering is unsupported or reduced transparency is preferred. It is a CSS-only layering effect, not shader-based refraction or a capture of underlying financial DOM. Finance content panels remain stable, opaque graphite surfaces.

Motion: short staggered section entrances (~300 ms, ≤10 px, opacity/transform only), 140–180 ms hover/press feedback, animated profile-menu entrance, and no repeated dashboard animation on filter changes (sections only re-animate on route render). All movement is disabled under `prefers-reduced-motion`. Sticky header offset is accounted for with scroll margins so in-page navigation does not hide headings.

## Layout and interaction

Desktop uses a compact horizontal navigation bar with all implemented routes, real account controls, appearance, and the Simple/Pro preference. A separate dock provides working transaction, CSV export, and settings actions. At narrower widths navigation moves to an accessible drawer; the dock becomes a bottom pill with touch-sized controls. Dashboard cards and charts must fit without horizontal page overflow.

Use semantic links and buttons, explicit labels, accessible names for icon actions, visible keyboard focus, loading/error/empty states, and `prefers-reduced-motion`. Motion should be brief and limited to opacity/transform. Do not imply that unsupported routes, settings, or integrations work.

## Data presentation

Dashboard figures come from the versioned finance API and are profile-scoped on the server. Show net cash flow, income, and expenses; do not show account balance or savings unless a corresponding data model supports it. Empty states explain how real entries will populate the page. Use category colors consistently and provide text/amount alternatives to charts.

## Current verification limits

The local browser preview was visually reviewed in the unauthenticated state at desktop and mobile widths. The real Auth and database flows remain unverified. See `IMPLEMENTATION_PROGRESS.md` for the checks actually run and remaining external configuration work.
