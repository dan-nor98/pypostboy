# API Testing Application — Design System and UI Guidelines

This document is the implementation source of truth for the React frontend. Build the product as a compact, desktop-first API development environment with the discipline of an IDE, the clarity of a code editor, the precision of a network diagnostics tool, and the speed of a keyboard-first engineering workflow.

The experience should feel purpose-built for developers who spend long sessions composing requests, comparing responses, inspecting headers, debugging environments, and moving between collections. Every surface should support dense technical work without visual clutter. Favor strong hierarchy, predictable layout, restrained color, and immediate feedback over decorative presentation.

The visual language should combine:

- IDE workspace structure: activity bar, resizable sidebar, editor tabs, split panes, bottom panels, and status bar.
- API request-building workflows: method selector, URL entry, parameter/header/body/auth editors, environment variables, collections, and request history.
- Code-editor readability: monospace content areas, line-friendly spacing, tokenized values, syntax-colored examples, copy affordances, and persistent context.
- Network diagnostics: response status, timing, size, headers, cookies, redirects, logs, errors, and retry-oriented actions.
- Professional developer tooling: compact controls, semantic states, accessible focus rings, stable keyboard shortcuts, and low-chrome interaction patterns.

Do not design this as a consumer dashboard, marketing page, analytics product, or generic admin interface. Avoid oversized controls, decorative illustrations, large empty cards, colorful gradients, rounded marketing panels, excessive whitespace, and lifestyle-oriented empty states. Screens should communicate utility, precision, and operational confidence.

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

### Layout Tokens

Use fixed shell dimensions so the application feels stable and editor-like.

| Token | Value | Usage |
| --- | --- | --- |
| `--header-height` | `34px` | Global menu, workspace title, environment selector, primary actions |
| `--activity-bar-width` | `44px` | Left icon rail for Collections, History, Environments, Search, Settings |
| `--sidebar-width` | `260px` | Default collection and navigation panel width |
| `--status-bar-height` | `22px` | Bottom connection, environment, sync, and request state indicators |

### Color Roles

Use color functionally, not decoratively.

| Role | Token | Guidance |
| --- | --- | --- |
| Application background | `--color-bg-app` | Root canvas behind the full IDE shell |
| Header background | `--color-bg-header` | Top global command/menu surface |
| Activity background | `--color-bg-activity` | Persistent left icon rail |
| Sidebar background | `--color-bg-sidebar` | Collections, environments, history, and search panels |
| Panel background | `--color-bg-panel` | Request builder panes, response panes, bottom panels |
| Editor background | `--color-bg-editor` | JSON, raw body, response body, script editors |
| Input background | `--color-bg-input` | URL fields, search fields, editable cells, selects |
| Hover background | `--color-bg-hover` | Pointer hover for rows, tabs, buttons, tree nodes |
| Active background | `--color-bg-active` | Pressed controls and active command states |
| Selected background | `--color-bg-selected` | Selected request, selected tab, selected tree node |
| Elevated background | `--color-bg-elevated` | Menus, popovers, command palette, tooltips |

### Light Theme

Provide a light theme through the same semantic token names. Do not hard-code dark colors in components.

```css
[data-theme="light"] {
  --color-bg-app: #f3f4f6;
  --color-bg-header: #ffffff;
  --color-bg-activity: #eceff3;
  --color-bg-sidebar: #f7f8fa;
  --color-bg-panel: #ffffff;
  --color-bg-editor: #fbfbfc;
  --color-bg-input: #ffffff;
  --color-bg-hover: #eef1f5;
  --color-bg-active: #e5e9ef;
  --color-bg-selected: #dfe6ef;
  --color-bg-elevated: #ffffff;
  --color-border-subtle: #d9dde5;
  --color-border-default: #c8ced8;
  --color-border-strong: #aeb6c3;
  --color-text-primary: #1f2430;
  --color-text-secondary: #4f5b6b;
  --color-text-muted: #738092;
  --color-text-disabled: #9aa4b2;
  --color-text-inverse: #ffffff;
}
```

### Typography

Use a compact type scale with clear separation between UI labels and code-like content.

| Use | Font | Size | Weight | Line height |
| --- | --- | --- | --- | --- |
| Shell labels | System UI | `12px` | `500` | `16px` |
| Body UI | System UI | `13px` | `400` | `18px` |
| Section titles | System UI | `12px` | `600` | `16px` |
| Toolbar text | System UI | `12px` | `500` | `16px` |
| Code/editor text | Monospace | `12px` | `400` | `18px` |
| Status bar text | System UI | `11px` | `500` | `14px` |

Recommended stacks:

```css
--font-ui: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
```

### Spacing and Density

Use tight spacing that supports long working sessions.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | `2px` | Hairline separation and micro alignment |
| `--space-2` | `4px` | Icon/text gaps, compact padding |
| `--space-3` | `6px` | Dense row padding |
| `--space-4` | `8px` | Default control padding and toolbar gaps |
| `--space-5` | `12px` | Section padding and panel interiors |
| `--space-6` | `16px` | Larger panel grouping only |

Prefer 28–32 px control heights for primary request-builder controls. Tree rows, list rows, and table rows should generally be 24–30 px tall.

### Radius, Borders, and Elevation

Use minimal radius and subtle elevation.

| Token | Value | Usage |
| --- | --- | --- |
| `--radius-sm` | `3px` | Inputs, small buttons, badges |
| `--radius-md` | `5px` | Menus, popovers, panels inside panes |
| `--radius-lg` | `8px` | Dialogs and command palette only |
| `--shadow-popover` | `0 10px 28px rgba(0, 0, 0, 0.32)` | Menus, command palette, floating panels |

Most structural separation should use `1px` borders rather than shadows.

## Application Shell

The shell must be persistent and desktop-first.

```text
┌────────────────────────────────────────────────────────────────────┐
│ Header / command surface                                            │
├────┬──────────────────┬────────────────────────────────────────────┤
│    │ Sidebar          │ Request tabs                               │
│ A  │ Collections      ├────────────────────────────────────────────┤
│ c  │ Environments     │ Request builder / response split            │
│ t  │ History          │                                            │
│ i  │ Search           ├────────────────────────────────────────────┤
│ v  │                  │ Bottom panel: console / cookies / logs       │
│ i  │                  │                                            │
│ t  ├──────────────────┴────────────────────────────────────────────┤
│ y  │ Status bar                                                     │
└────┴────────────────────────────────────────────────────────────────┘
```

### Header

The header is 34 px tall and should contain global workspace context rather than dashboard navigation.

Required elements:

- Workspace or project name.
- Command palette trigger.
- Environment selector.
- Sync or local persistence state.
- Settings and account/local profile affordances when applicable.

Keep header controls compact. Do not place large page titles, marketing breadcrumbs, or analytics cards in the header.

### Activity Bar

The activity bar is a 44 px left rail with icon-only navigation. It should remain visible even when the sidebar is collapsed.

Required destinations:

| Icon destination | Purpose |
| --- | --- |
| Collections | Saved folders and requests |
| History | Recent request executions |
| Environments | Variables and environment groups |
| Search | Global request, response, and collection search |
| Settings | Preferences, proxy, certificates, themes |

Each activity item needs hover, active, selected, disabled, and tooltip states.

### Sidebar

The sidebar is resizable, collapsible, and optimized for trees and lists.

Use it for:

- Collection trees.
- Request folders.
- Request history.
- Environment variable groups.
- Search results.

Tree rows must support expand/collapse, selected state, method badges, truncated names, context menus, drag handles where relevant, and inline rename states.

### Main Workspace

The main workspace contains request tabs, the request builder, the response viewer, and optional bottom panels. It must preserve context during navigation: opening a request should not reset sidebar state, environment selection, or bottom panel visibility.

## Request Tabs

Request tabs should behave like editor tabs.

Required behavior:

- Horizontal tabs with method badge, request name, dirty indicator, close button, and tooltip for full URL.
- Overflow handling through horizontal scroll or a compact overflow menu.
- Active tab uses selected background and top or bottom accent indicator.
- Unsaved changes use a subtle dot or modified marker.
- Closing a dirty tab prompts for save, discard, or cancel.

Example tab label:

```text
[GET] List users •
```

## Request Builder

The request builder is the primary working surface. It should be dense, structured, and optimized for repeated execution.

### Request Line

The request line contains method, URL, send, and save controls.

| Element | Guidance |
| --- | --- |
| Method selector | Compact fixed-width dropdown with semantic method color |
| URL input | Monospace-capable text field, supports variables like `{{baseUrl}}/users` |
| Send button | Primary accent action, supports loading state and `Ctrl/Cmd + Enter` |
| Save button | Secondary action, disabled when no changes exist |

Example:

```text
GET  {{baseUrl}}/v1/users?limit=25                         Send ▸
```

### Request Sections

Use tabs for request configuration. Tabs should be compact and preserve per-request state.

| Tab | Contents |
| --- | --- |
| Params | Query parameters with key, value, enabled, description columns |
| Auth | Auth type selector and credential fields |
| Headers | Header table with enabled, key, value, description columns |
| Body | Body type selector, editor, form-data, x-www-form-urlencoded, raw JSON |
| Scripts | Pre-request and post-response scripts |
| Settings | Redirects, timeout, SSL verification, proxy, retry options |

### Editable Tables

Dense editable tables are required for params, headers, form data, cookies, and variables.

Table requirements:

- Checkbox or toggle per row for enabled/disabled.
- Key, value, and description columns.
- Inline add row at the bottom.
- Keyboard navigation with Enter, Tab, Shift+Tab, Escape, and arrow keys.
- Row hover, selected row, validation error, disabled row, and drag reorder states.
- Secret values should support masked and revealed states.

Example:

```text
☑ Authorization   Bearer {{token}}        Access token
☑ Accept          application/json        Response format
☐ X-Debug         true                    Local debugging only
+ Add header
```

### Body Editor

The body editor should feel like a lightweight code editor.

Requirements:

- Monospace font.
- Line-height aligned with code blocks.
- Syntax-friendly colors.
- Format, copy, wrap, and search actions.
- Empty state that says what to do next, not a marketing message.
- Validation errors with line and column references when possible.

Example JSON:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "roles": ["admin", "developer"]
}
```

## Response Viewer

The response viewer must make diagnostics visible immediately after execution.

### Response Summary

Always show response summary metadata above the body.

| Field | Example |
| --- | --- |
| Status | `200 OK` |
| Time | `184 ms` |
| Size | `12.4 KB` |
| Content type | `application/json` |
| Redirects | `0` |

Status badges use semantic status colors.

| Range | Meaning | Color |
| --- | --- | --- |
| `2xx` | Success | `--color-success` |
| `3xx` | Redirect | `--color-info` |
| `4xx` | Client error | `--color-warning` |
| `5xx` | Server error | `--color-error` |

### Response Tabs

Use compact tabs for response details.

| Tab | Contents |
| --- | --- |
| Body | Pretty, raw, preview, and search modes |
| Headers | Response header table |
| Cookies | Cookie table with domain, path, expires, flags |
| Timeline | DNS, TCP, TLS, upload, wait, download timings |
| Console | Script logs, assertions, and runtime errors |

### Response Body

Response body requirements:

- Pretty and raw view toggles.
- Copy response action.
- Search within response.
- Collapse/expand JSON nodes when available.
- Line numbers for code-like content.
- Clear binary or unsupported preview states.
- Error state for invalid JSON that preserves raw content.

Example error state:

```text
Unable to parse JSON at line 14, column 8.
Showing raw response instead.
```

## Bottom Panel and Status Bar

### Bottom Panel

The bottom panel is optional but should be available for diagnostics.

Recommended tabs:

- Console.
- Network log.
- Test results.
- Cookies.
- Problems.

It should be resizable, collapsible, and remember its last height.

### Status Bar

The status bar is 22 px tall and communicates operational state.

Recommended segments:

| Segment | Example |
| --- | --- |
| Environment | `dev-local` |
| Persistence | `Saved locally` |
| Proxy | `Proxy off` |
| TLS | `SSL verify on` |
| Last request | `GET /users · 200 · 184 ms` |
| Cursor/editor state | `JSON · UTF-8 · 2 spaces` |

## Components and States

Every reusable component must implement predictable states.

| Component | Required states |
| --- | --- |
| Button | default, hover, active, focus, disabled, loading |
| Input | default, hover, focus, disabled, readonly, error, placeholder |
| Select | default, hover, focus, open, disabled, error |
| Tab | default, hover, active, selected, dirty, disabled |
| Tree row | default, hover, selected, focused, expanded, collapsed, renaming, dragging |
| Table row | default, hover, selected, focused, disabled, error, dragging |
| Badge | default, muted, success, warning, error, info |
| Tooltip | delayed open, keyboard open, overflow text open |
| Dialog | open, closing, focus-trapped, destructive confirmation |
| Toast | info, success, warning, error, persistent, dismissible |

### Focus States

Focus must be visible and consistent.

```css
:focus-visible {
  outline: 1px solid var(--color-accent);
  outline-offset: 1px;
}
```

Keyboard users must be able to reach every interactive element, including tree items, tab close buttons, resize handles, table cells, and bottom panel tabs.

### Loading States

Loading states should preserve layout and communicate progress without distraction.

Use:

- Inline spinner or progress indicator on Send.
- Disabled request line controls only when necessary.
- Streaming response indicator when response data is arriving.
- Skeleton rows only for lists that are genuinely loading.

Avoid full-screen loaders for normal request execution.

### Empty States

Empty states must be useful and technical.

Good examples:

```text
No headers yet. Add a header or import from cURL.
```

```text
No response yet. Send a request to inspect status, headers, cookies, and body.
```

Avoid:

```text
Unlock your workflow with powerful insights.
```

## HTTP Method Colors

Use method colors consistently in tabs, collection rows, request history, and request line selector.

| Method | Color |
| --- | --- |
| GET | `#4caf78` |
| POST | `#5b9bd5` |
| PUT | `#d9a441` |
| PATCH | `#b07adf` |
| DELETE | `#e06464` |
| HEAD | `#9da3af` |
| OPTIONS | `#6fb7c7` |

Method badges should be compact, uppercase, and fixed-width where possible.

## Accessibility

Accessibility is required for developer productivity, not optional polish.

Requirements:

- Meet WCAG AA contrast for text and important UI states.
- Preserve keyboard access for all commands.
- Use ARIA labels for icon-only buttons.
- Use `aria-selected`, `aria-expanded`, `aria-controls`, and `aria-current` where appropriate.
- Keep focus within dialogs and command palette while open.
- Announce request completion, request errors, and validation errors through accessible live regions.
- Do not rely on color alone for method, status, or validation meaning.

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

Keyboard shortcuts must be discoverable in tooltips, command palette entries, and relevant menus. Shortcuts must not trigger while focus is in an editor unless the command is editor-safe or intentionally global.

## Responsive Behavior

This is a desktop-first product. Optimize for 1280 px width and above.

Required behavior:

- At 1280 px, activity bar, sidebar, request builder, response viewer, bottom panel, and status bar must remain usable.
- Below 1280 px, prioritize preserving the request line and active editor content.
- Sidebar can collapse before request controls become unusable.
- Response viewer can stack below request builder when horizontal space is constrained.
- Tables must handle overflow through horizontal scroll, truncation, and tooltips.
- Text overflow must be intentional with ellipsis and full-value tooltip or copy action.

## Interaction Patterns

Use developer-tool interaction conventions.

Required patterns:

- Context menus for collection items, tabs, table rows, and response values.
- Split-pane resize handles with visible hover/focus affordances.
- Command palette for major commands.
- Inline rename for folders, requests, and environments.
- Drag reorder for folders, requests, tabs, and enabled table rows when supported.
- Copy affordances for URLs, headers, variables, response fields, and errors.
- Confirmation dialogs for destructive operations.
- Undo or clear recovery path for bulk edits when practical.

## Content Guidelines

Use concise, technical copy.

Preferred wording:

- `Send request`
- `Save request`
- `Add header`
- `Import from cURL`
- `Copy response`
- `Format JSON`
- `SSL verification`
- `Request timed out after 30s`

Avoid vague or promotional wording:

- `Get started with magic`
- `Supercharge your workflow`
- `Discover insights`
- `Beautiful analytics`

## Definition of Done

A screen is complete only when it uses the IDE shell, approved tokens, realistic technical content, hover/active/focus/selected/disabled/loading/error/success states, keyboard navigation, desktop responsiveness at 1280 px and above, text overflow handling, consistent reusable components, and a developer-workflow-first interaction model.
