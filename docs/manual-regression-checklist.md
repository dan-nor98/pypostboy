# Manual regression checklist

## Logout user-scoped UI reset

Use this checklist when changing authentication, request tabs, snapshots, collections, history, or environment-variable UI state.

1. Sign in as user A.
2. Open at least two request tabs and put identifiable user A-only content in the URL, headers, auth fields, body editor, and response pane.
3. Select or load a saved request snapshot and expand at least one collection in the sidebar.
4. Click **Logout**.
5. Confirm the login screen appears only after the app UI has been cleared: no user A tabs, active request IDs, selected snapshots, collection rows, request editor content, response content, history entries, or environment-variable values should remain visible or remain in hidden DOM/UI state.
6. Sign in as user B, or choose guest mode.
7. Confirm user B/guest sees a clean workspace initialization and does not see user A's tabs, selected snapshots, collections, request editor data, response data, history, or environment variables even briefly during startup.

