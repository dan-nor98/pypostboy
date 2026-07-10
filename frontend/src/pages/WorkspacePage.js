import { renderSidebar } from '../components/layout/Sidebar.js';
import { renderRequestEditor } from '../components/workspace/RequestEditor.js';
import { renderResponsePanel } from '../components/workspace/ResponsePanel.js';
import { renderToolsSidebar } from '../components/layout/ToolsSidebar.js';

export function renderWorkspacePage() {
  return `
    <div class="app-shell" id="appContainer" hidden>
      ${renderSidebar()}
      <div class="resize-handle resize-handle-vertical" id="sidebarResizeHandle" role="separator" aria-orientation="vertical" aria-label="Resize collections sidebar" tabindex="0"></div>
      <main class="workspace-main">
        <div class="mobile-toolbar">
          <button class="btn btn-secondary mobile-sidebar-toggle" id="sidebarToggleBtn" type="button" aria-controls="sidebar" aria-expanded="false">Menu</button>
          <button class="btn btn-secondary mobile-sidebar-toggle" id="rightSidebarToggleBtn" type="button" aria-controls="rightSidebar" aria-expanded="false">Tools</button>
        </div>
        <div class="request-tabs-bar" id="requestTabsBar">
          <div class="request-tabs" id="requestTabs"></div>
          <button class="btn btn-icon" id="newTabBtn" type="button" title="New Request" aria-label="New request">+</button>
        </div>
        <div class="workspace-request-pane">
          ${renderRequestEditor()}
        </div>
        <div class="resize-handle resize-handle-horizontal" id="responseResizeHandle" role="separator" aria-orientation="horizontal" aria-label="Resize response panel" tabindex="0"></div>
        ${renderResponsePanel()}
      </main>
      <div class="resize-handle resize-handle-vertical" id="toolsResizeHandle" role="separator" aria-orientation="vertical" aria-label="Resize tools sidebar" tabindex="0"></div>
      ${renderToolsSidebar()}
    </div>
  `;
}
