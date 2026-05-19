# Accessibility Checklist (UI Tokens & Response Diagnostics)

## Scope
- Sidebar labels, placeholders, muted helper text, border-adjacent small text, status badges, and response diagnostics.

## WCAG AA Contrast Outcomes
- [x] Normal text token (`--color-text`) passes on all primary surfaces in dark/light themes.
- [x] Muted/small text token (`--color-text-muted`) passes AA after token update in dark/light themes.
- [x] Dim/supporting text token (`--color-text-dim`) passes AA after token update in dark/light themes.
- [ ] Decorative borders alone do **not** meet text contrast thresholds (expected; not text content).

## Non-Color Status Indicators
- [x] Response summary badge shows icon + explicit status label (Success/Redirect/Client Error/Server Error) plus code.
- [x] Sidebar history status shows icon + explicit status label plus code.
- [x] Response diagnostic cards include explicit severity label (Error/Warning/Info) in header.

## Focus Visibility (Keyboard)
- [x] Global `:focus-visible` ring added for interactive controls (`button`, `a`, `input`, `select`, `textarea`, `summary`, `[tabindex]`).
- [x] Component-specific focus states remain visible and additive (search input, JSON tree toggles, resize handles, buttons).

## Regression Notes
- Re-run this checklist whenever tokens, component states, or response diagnostics UI markup/styles are modified.
