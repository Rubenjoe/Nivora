# Nivora interface principles

This file records the design intent currently visible in the application. No repository `designs.md` or prior `DESIGN.md` was present during the audit; this is a new, provisional reference derived from the product brief and existing implementation, not a recovered design source.

## Direction

Private-banking restraint: warm ivory and ink in light mode; true pitch black with softly lifted black surfaces in dark mode; champagne-brass is the restrained interface accent, while emerald and coral continue to identify positive and negative financial values. Editorial serif headings sit beside a legible sans-serif interface. Avoid neon contrast, decorative gradients, synthetic financial data, trend claims without history, and component-library defaults that weaken this identity.

## Tokens

The source of truth is `src/app/globals.css` `:root`:

- `--paper`: warm ivory canvas (`#f7f4ed`); `--surface`: soft white cards and controls (`#fffdf9`).
- `--ink` / `--muted`: ink-brown primary and legible secondary text.
- `--deep`: high-emphasis brand and dark surfaces.
- `--accent`: champagne-brass interactive accent.
- `--positive`, `--negative`, `--warning`: financial status roles; never communicate status by color alone.
- `--line`: quiet dividers; `--focus-ring`: visible keyboard focus; `--radius-card`: shared card radius.

Dark mode uses a true `#000000` page canvas, `#0a0a0a` lifted surfaces, warm ivory text, subtle charcoal dividers and champagne-brass accents. Financial positive/negative meanings retain emerald/coral. The theme defaults to the system preference on load unless a persisted light/dark choice exists; toggles update page chrome color and synchronize across open tabs.

## Typography and layout

Use Georgia/serif for editorial headings and a native sans-serif stack for controls and body copy. Apply tabular numerals to financial values. Keep a clear content width and align summary cards, sections, and period controls. Mobile navigation is a fixed bottom bar; dashboard summaries stack at narrow widths. Controls should have comfortable 44px targets when practical.

## Interaction and accessibility

Use semantic links for navigation, buttons for actions, real labels for form inputs, visible `:focus-visible` outlines, skip links to primary content, explicit loading/error feedback, and reduced-motion support. Icons that are decorative should remain hidden from assistive technology; icon-only controls need accessible names. Charts must include readable data alternatives. Use motion for clear state feedback: short opacity/transform entrances for dashboard and transaction surfaces, subtle lift on pointer hover, and restrained category-bar growth. Avoid loops and layout-moving effects; respect `prefers-reduced-motion`. Do not show unavailable product areas as working controls.

## Current limitations

The repository now has sign-in/sign-up screens, a transaction entry/history workspace, and a dashboard that requests period totals, category breakdowns, and recent entries from versioned APIs. These UI flows are not verified against a live Appwrite identity or PostgreSQL database; when those services are unavailable, the interface shows an explicit empty/error state rather than seeded figures. Simple/Pro switching, budgets, long-range analytics, export controls, and goal management remain unimplemented. See `IMPLEMENTATION_PROGRESS.md` for evidence and visual-test limitations.