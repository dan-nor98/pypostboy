# API Testing Application — Design System and UI Guidelines

This root design document is the implementation source of truth for the React frontend. It follows the supplied IDE-style API testing application guidelines: compact desktop-first shell, dark/light design tokens, activity bar, resizable sidebar, request tabs, request builder, response viewer, bottom/status surfaces, keyboard-first actions, semantic HTTP method/status colors, dense tables, tooltips, accessible focus states, and professional developer-tool visual language.

## Required Direction

The UI must resemble a dedicated API development environment combining IDE workspace discipline, code-editor clarity, API request-building, network diagnostics, and compact desktop engineering workflows. It must avoid consumer dashboard patterns, oversized controls, decorative illustrations, excessive cards, gradients, and marketing-style empty states.

## Core Tokens

```css
:root {
  --header-height: 34px;
  --activity-bar-width: 44px;
  --sidebar-width: 260px;
  --status-bar-height: 22px;
  --color-bg-app: #181a1f;
  --color-bg-header: #1e2026;
  --color-bg-activity: #17191e;
  --color-bg-sidebar: #1d1f25;
  --color-bg-panel: #202229;
  --color-bg-editor: #17191f;
  --color-bg-input: #252831;
  --color-bg-hover: #2a2d36;
  --color-bg-active: #30343e;
  --color-bg-selected: #343944;
  --color-bg-elevated: #282b33;
  --color-border-subtle: #2c2f37;
  --color-border-default: #383c46;
  --color-border-strong: #4a4f5c;
  --color-text-primary: #d8dbe2;
  --color-text-secondary: #9da3af;
  --color-text-muted: #747b88;
  --color-text-disabled: #555b66;
  --color-text-inverse: #111318;
  --color-accent: #e58a3a;
  --color-accent-hover: #f09a4c;
  --color-accent-muted: rgba(229, 138, 58, 0.15);
  --color-accent-border: rgba(229, 138, 58, 0.55);
  --color-success: #4caf78;
  --color-warning: #d9a441;
  --color-error: #e06464;
  --color-info: #5b9bd5;
}
```

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Send request | `Ctrl/Cmd + Enter` |
| New request | `Ctrl/Cmd + N` |
| Save request | `Ctrl/Cmd + S` |
| Search commands | `Ctrl/Cmd + Shift + P` |
| Global search | `Ctrl/Cmd + Shift + F` |
| Open settings | `Ctrl/Cmd + ,` |
| Toggle sidebar | `Ctrl/Cmd + B` |

## Definition of Done

A screen is complete only when it uses the IDE shell, approved tokens, realistic technical content, hover/active/focus/selected/disabled/loading/error/success states, keyboard navigation, desktop responsiveness at 1280 px and above, text overflow handling, consistent reusable components, and a developer-workflow-first interaction model.
