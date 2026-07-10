import{f as $e,b as ue,l as Lt,s as pe,c as Tt,a as Et,d as C,e as X,i as kt,r as qt,g as Rt,h as Xe,u as S}from"./user-BtTRhfsf.js";function _t(){return`
    <main id="loginScreen" class="login-screen" aria-labelledby="loginTitle">
      <section class="login-card">
        <div class="login-branding" aria-hidden="true">PB</div>
        <p class="login-kicker">API Testing Client</p>
        <h1 id="loginTitle">PostBoy</h1>
        <p class="login-subtitle">Sign in to sync your workspace, create an account, or continue with a temporary guest workspace.</p>
        <div class="account-status login-status" id="authStatus" role="status">Checking account...</div>
        <div class="login-fields">
          ${$e({id:"authUsername",label:"Username",autocomplete:"username",placeholder:"Username",className:"compact-field"})}
          ${$e({id:"authPassword",label:"Password",type:"password",autocomplete:"current-password",placeholder:"Password",className:"compact-field"})}
        </div>
        <div class="login-actions">
          ${ue({id:"loginBtn",variant:"primary",label:"Log in"})}
          ${ue({id:"registerBtn",variant:"secondary",label:"Create account"})}
          ${Lt({id:"forgotPasswordBtn",className:"login-link-button",href:"/recover.html",label:"Forgot password?"})}
          ${ue({id:"guestLoginBtn",variant:"ghost",label:"Continue as guest"})}
        </div>
        <p class="login-warning" role="note">Guest mode stores request workspace data in this browser session. Avoid entering secrets; sensitive headers and auth fields are redacted before storage.</p>
      </section>
    </main>
  `}function Bt(){return`
    <aside class="sidebar" id="sidebar" aria-label="Workspace navigation">
      <header class="sidebar-header">
        <div>
          <p class="sidebar-kicker">Workspace</p>
          <h2>PostBoy</h2>
        </div>
        <div class="sidebar-header-actions">
          <button class="btn btn-icon sidebar-close" id="sidebarCloseBtn" type="button" aria-label="Close sidebar">×</button>
        </div>
      </header>
      <section class="account-area" aria-label="Account controls">
        <div class="account-status" id="appAuthStatus">Checking account...</div>
        <button class="btn btn-secondary btn-small" id="logoutBtn" type="button">Log out</button>
      </section>
      <nav class="nav-pill-group sidebar-tabs" aria-label="Workspace panels">
        <button class="category-tab active" type="button" data-target="collections-panel">Collections</button>
        <button class="category-tab" type="button" data-target="history-panel">History</button>
        <button class="category-tab" type="button" data-target="env-panel">Environ</button>
      </nav>
      <section class="sidebar-panel active" id="collections-panel">
        <div class="sidebar-actions">
          <button class="btn btn-primary" id="newCollectionBtn" type="button">New Collection</button>
          <button class="btn btn-secondary" id="importBtn" type="button">Import</button>
        </div>
        <label class="field search-field" for="collectionSearchInput">
          <span>Search</span>
          <input type="search" id="collectionSearchInput" class="form-input" placeholder="Search collections, folders, requests..." autocomplete="off">
        </label>
        <div class="collection-list" id="collectionList">
          <p class="empty-state">No collections yet. Create one or import a Postman collection.</p>
        </div>
      </section>
      <section class="sidebar-panel" id="history-panel">
        <div class="history-list" id="historyList">
          <p class="empty-state">No history yet.</p>
        </div>
      </section>
      <section class="sidebar-panel" id="env-panel">
        <p class="empty-state">Environment variables are available from the editor toolbar.</p>
      </section>
    </aside>
  `}const Mt=["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"].map(e=>({label:e,value:e,selected:e==="GET"}));function It(){return`
    <section class="request-card" id="requestBar" aria-label="Request builder">
      <div class="url-bar">
        ${pe({id:"methodSelect",label:"Method",options:Mt,className:"method-field"})}
        <label class="field url-field" for="urlInput">
          <span>URL</span>
          <input type="text" id="urlInput" class="form-input" placeholder="Enter request URL or paste cURL command...">
        </label>
        <button class="btn btn-primary send-button" id="sendBtn" type="button">Send</button>
      </div>
      <div class="request-options" id="requestBarSecondary">
        ${pe({id:"executionModeSelect",label:"Run via",options:[{value:"client",label:"Client side"},{value:"server",label:"Server proxy",selected:!0},{value:"desktop-native",label:"Desktop native"}]})}
        ${pe({id:"clientCredentialsSelect",label:"Credentials",options:[{value:"omit",label:"omit"},{value:"same-origin",label:"same-origin"},{value:"include",label:"include"}]})}
        <button class="btn btn-secondary" id="loopBtn" type="button">Loop</button>
        <button class="btn btn-secondary" id="openEnvVarsModalBtn" type="button">Environment</button>
      </div>
      <div class="loop-controls" id="loopControls" hidden>
        <label class="field compact-field" for="loopInterval"><span>Interval (ms)</span><input class="form-input" type="number" id="loopInterval" value="1000" min="100"></label>
        <label class="field compact-field" for="loopCount"><span>Count (0=∞)</span><input class="form-input" type="number" id="loopCount" value="0" min="0"></label>
        <span id="loopStatus" class="status-note"></span>
      </div>
    </section>

    <section class="request-section" id="requestSection">
      <div class="nav-pill-group tab-bar" role="tablist">
        <button class="category-tab tab active" data-tab="params" type="button">Params</button>
        <button class="category-tab tab" data-tab="headers" type="button">Headers</button>
        <button class="category-tab tab" data-tab="body" type="button">Body</button>
        <button class="category-tab tab" data-tab="auth" type="button">Auth</button>
      </div>
      <div class="tab-content active" id="params-tab">
        <p class="inline-hint">Query parameters are auto-detected from the URL and kept in sync.</p>
        <div class="table-scroll">
          <table class="params-table" id="paramsTable">
            <thead>
              <tr><th>On</th><th>Key</th><th>Value</th><th>Description</th><th></th></tr>
            </thead>
            <tbody id="paramsBody"></tbody>
          </table>
        </div>
        <button class="btn btn-secondary btn-small" id="addParamBtn" type="button">Add parameter</button>
      </div>
      <div class="tab-content" id="headers-tab">
        <div class="key-value-list" id="headersContainer"></div>
        <button class="btn btn-secondary btn-small" id="addHeaderBtn" type="button">Add Header</button>
      </div>
      <div class="tab-content" id="body-tab">
        <div class="segmented-control body-type-selector">
          ${["none","json","text","xml","form-urlencoded","form-data"].map(e=>`
            <label><input type="radio" name="bodyType" value="${e}" ${e==="none"?"checked":""}><span>${e}</span></label>
          `).join("")}
        </div>
        <div class="body-actions">
          <button class="btn btn-secondary btn-small" id="prettifyJsonBtn" type="button">Prettify JSON</button>
        </div>
        <div class="request-body-editor" id="bodyContentEditor" hidden>
          <textarea id="bodyContent" class="form-textarea code-input" placeholder="Enter request body..." rows="9" spellcheck="false"></textarea>
        </div>
        <div id="formDataContainer" class="form-data-container" hidden>
          <div class="key-value-list" id="formDataRows"></div>
          <button class="btn btn-secondary btn-small" id="addFormDataBtn" type="button">Add Field</button>
        </div>
      </div>
      <div class="tab-content" id="auth-tab">
        <div class="segmented-control auth-type-selector">
          ${[["none","No Auth"],["bearer","Bearer Token"],["basic","Basic Auth"],["apikey","API Key"]].map(([e,t])=>`
            <label><input type="radio" name="authType" value="${e}" ${e==="none"?"checked":""}><span>${t}</span></label>
          `).join("")}
        </div>
        <div class="auth-fields" id="authFields"></div>
      </div>
    </section>
  `}function $t(){return`
    <section class="response-section" id="responseSection" aria-label="Response">
      <header class="response-header">
        <h3>Response</h3>
        <div class="response-summary" role="group" aria-label="Response summary">
          <span id="statusCode" class="status-badge" role="status" aria-live="polite">--- </span>
          <span id="responseTime" class="summary-value">0 ms</span>
          <span id="responseSize" class="summary-value">0 B</span>
        </div>
        <div class="response-actions">
          <button class="btn btn-secondary btn-small" id="saveResponseSnapshotBtn" type="button">Save Snapshot</button>
          <button class="btn btn-secondary btn-small" id="copyResponseBtn" type="button">Copy</button>
          <button class="btn btn-secondary btn-small" id="responseFullscreenBtn" type="button" aria-pressed="false">Fullscreen</button>
        </div>
      </header>
      <p class="response-snapshot-feedback" id="responseSnapshotFeedback" role="status" aria-live="polite"></p>
      <div class="nav-pill-group response-tabs" role="tablist">
        <button class="category-tab response-tab active" data-rtab="body" type="button">Body</button>
        <button class="category-tab response-tab" data-rtab="headers" type="button">Headers</button>
      </div>
      <div class="response-tab-content active" id="response-body-tab">
        <div class="response-code-viewer" id="responseBodyViewer" role="region" aria-label="Response body with line numbers">
          <pre class="response-line-numbers" id="responseBodyLineNumbers" aria-hidden="true">1</pre>
          <pre class="response-code-area" id="responseBody"><code id="responseBodyCode">Send a request to see the response here.</code></pre>
        </div>
      </div>
      <div class="response-tab-content" id="response-headers-tab">
        <pre id="responseHeaders" class="response-code-area"></pre>
      </div>
    </section>
  `}function At(){return`
    <aside class="right-sidebar" id="rightSidebar" aria-label="Snapshots and cURL tools">
      <header class="right-sidebar-header">
        <div>
          <p class="sidebar-kicker">Utilities</p>
          <h2>Tools</h2>
        </div>
        <button class="btn btn-icon right-sidebar-close" id="rightSidebarCloseBtn" type="button" aria-label="Close tools">×</button>
      </header>
      <section class="right-sidebar-section" id="snapshots-panel" aria-labelledby="snapshotSectionTitle">
        <h3 id="snapshotSectionTitle">Snapshots</h3>
        <p class="right-sidebar-hint">Save the latest response, then reload it while debugging.</p>
        <button class="btn btn-secondary" id="saveInstanceBtn" type="button">Save Snapshot</button>
        <div class="snapshot-list" id="snapshotList" aria-label="Snapshots"></div>
      </section>
      <section class="right-sidebar-section" id="curl-panel" aria-labelledby="curlSectionTitle">
        <h3 id="curlSectionTitle">cURL Output</h3>
        <textarea id="sidebarCurlOutput" class="form-textarea right-sidebar-output" rows="10" readonly placeholder="Generate cURL output for the active request..."></textarea>
        <div class="right-sidebar-actions">
          <button class="btn btn-secondary" id="generateSidebarCurlBtn" type="button">Generate cURL</button>
          <button class="btn btn-secondary" id="copySidebarCurlBtn" type="button">Copy</button>
        </div>
      </section>
    </aside>
  `}function Nt(){return`
    <div class="app-shell" id="appContainer" hidden>
      ${Bt()}
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
          ${It()}
        </div>
        <div class="resize-handle resize-handle-horizontal" id="responseResizeHandle" role="separator" aria-orientation="horizontal" aria-label="Resize response panel" tabindex="0"></div>
        ${$t()}
      </main>
      <div class="resize-handle resize-handle-vertical" id="toolsResizeHandle" role="separator" aria-orientation="vertical" aria-label="Resize tools sidebar" tabindex="0"></div>
      ${At()}
    </div>
  `}function Ot(){return`
    <div id="registerSuccessModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="registerSuccessTitle" aria-hidden="true">
      <div class="modal-content">
        <h3 id="registerSuccessTitle">Registration successful</h3>
        <p>Copy and store this recovery key now. You will need it to recover this account.</p>
        <label class="field" for="registerRecoveryKey"><span>Recovery key</span><textarea id="registerRecoveryKey" class="form-textarea" rows="4" readonly></textarea></label>
        <button class="btn btn-secondary" id="copyRecoveryKeyBtn" type="button">Copy key</button>
        <label class="check-row" for="registerRecoveryAcknowledge">
          <input type="checkbox" id="registerRecoveryAcknowledge">
          <span>I have copied and safely stored this recovery key.</span>
        </label>
        <button class="btn btn-primary" id="registerRecoveryCloseBtn" type="button" disabled>Close</button>
      </div>
    </div>

    <div id="newCollectionModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="collectionModalTitle" aria-hidden="true">
      <div class="modal-content">
        <button class="modal-close" id="newColModalClose" type="button" aria-label="Close">×</button>
        <h3 id="collectionModalTitle">New Collection</h3>
        <input type="hidden" id="editCollectionId" value="">
        <label class="field" for="newColName"><span>Name</span><input type="text" id="newColName" class="form-input" placeholder="My Collection"></label>
        <label class="field" for="newColDesc"><span>Description</span><textarea id="newColDesc" class="form-textarea" rows="3" placeholder="Describe this collection..."></textarea></label>
        <div class="modal-buttons">
          <button class="btn btn-secondary" id="newColCancelBtn" type="button">Cancel</button>
          <button class="btn btn-primary" id="newColSaveBtn" type="button">Save</button>
        </div>
      </div>
    </div>

    <div id="requestModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="requestModalTitle" aria-hidden="true">
      <div class="modal-content">
        <button class="modal-close" id="reqModalClose" type="button" aria-label="Close">×</button>
        <h3 id="requestModalTitle">New Request</h3>
        <input type="hidden" id="editRequestId" value="">
        <input type="hidden" id="editRequestCollectionId" value="">
        <label class="field" for="reqNameInput"><span>Name</span><input type="text" id="reqNameInput" class="form-input" placeholder="Get Users"></label>
        <div id="reqCollectionPickerWrap" hidden>
          <label class="field" for="reqCollectionSelect"><span>Collection</span><select id="reqCollectionSelect" class="form-select"></select></label>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" id="reqCancelBtn" type="button">Cancel</button>
          <button class="btn btn-primary" id="reqSaveBtn" type="button">Save</button>
        </div>
      </div>
    </div>

    <div id="importModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="importModalTitle" aria-hidden="true">
      <div class="modal-content modal-content-wide">
        <button class="modal-close" id="modalClose" type="button" aria-label="Close">×</button>
        <h3 id="importModalTitle">Import Request</h3>
        <div class="nav-pill-group import-tabs">
          <button class="category-tab import-tab active" data-import-tab="text" type="button">Paste Text</button>
          <button class="category-tab import-tab" data-import-tab="file" type="button">Upload File</button>
        </div>
        <div class="import-panel active" id="import-text-panel">
          <p class="inline-hint">Supported formats: Postman collection JSON or cURL command text.</p>
          <button class="btn btn-secondary btn-small" id="exampleCurlBtn" type="button">Example cURL</button>
          <textarea id="importInput" class="form-textarea code-input" placeholder="Paste Postman collection JSON or cURL command text here..." rows="10"></textarea>
        </div>
        <div class="import-panel" id="import-file-panel">
          <div class="file-upload-area" id="fileDropZone">Drop a Postman collection JSON file here</div>
          <input type="file" id="importFileInput" accept=".json,application/json" hidden>
          <button class="btn btn-secondary" id="browseFileBtn" type="button">Browse Files</button>
          <p id="selectedFileName" class="file-name" aria-live="polite"></p>
        </div>
        <div class="import-preview" id="importPreview" hidden aria-live="polite">
          <h4>cURL import preview</h4>
          <dl class="import-preview-summary">
            <div><dt>Method</dt><dd id="importPreviewMethod">-</dd></div>
            <div><dt>URL</dt><dd id="importPreviewUrl">-</dd></div>
            <div><dt>Headers</dt><dd id="importPreviewHeaderCount">0</dd></div>
            <div><dt>Body type</dt><dd id="importPreviewBodyType">none</dd></div>
          </dl>
          <ul id="importPreviewHeaders" class="import-preview-list"></ul>
          <pre id="importPreviewBody" class="import-preview-body">No body detected.</pre>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-secondary" id="importBackBtn" type="button" hidden>Back/Edit</button>
          <button class="btn btn-primary" id="importConfirmBtn" type="button">Import</button>
          <button class="btn btn-primary" id="importApplyBtn" type="button" hidden>Apply import</button>
        </div>
      </div>
    </div>

    <div class="context-menu" id="contextMenu">
      <button class="context-menu-item" type="button" data-action="edit">Rename</button>
      <button class="context-menu-item" type="button" data-action="duplicate">Duplicate</button>
      <button class="context-menu-item" type="button" data-action="add-request">Add Request</button>
      <button class="context-menu-item" type="button" data-action="add-folder">Add Sub-folder</button>
      <button class="context-menu-item" type="button" data-action="export-json">Export as JSON</button>
      <button class="context-menu-item danger" type="button" data-action="delete">Delete</button>
    </div>
    <div class="context-menu" id="requestContextMenu">
      <button class="context-menu-item" type="button" data-action="edit">Rename</button>
      <button class="context-menu-item" type="button" data-action="duplicate">Duplicate</button>
      <button class="context-menu-item danger" type="button" data-action="delete">Delete</button>
    </div>

    <div id="envVarsModal" class="modal" aria-hidden="true">
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="envVarsModalTitle">
        <button class="modal-close" id="envVarsModalClose" type="button" aria-label="Close">×</button>
        <h3 id="envVarsModalTitle">Environment Variables</h3>
        <p class="inline-hint">Use <code>{{key}}</code> in URL, headers, or body.</p>
        <div id="envVarsList" class="key-value-list"></div>
        <button class="btn btn-secondary" id="addEnvVarBtn" type="button">Add Variable</button>
      </div>
    </div>
  `}function Ut(){return`
    ${_t()}
    ${Nt()}
    ${Ot()}
    <div class="loading-overlay" id="loadingOverlay" hidden>
      <div class="spinner"></div>
    </div>
  `}function Qe(){return!!(window.postboyDesktop&&typeof window.postboyDesktop.executeRequest=="function")}async function Pt(e){if(!Qe())throw new Error("Desktop native mode is not available in this runtime.");return window.postboyDesktop.executeRequest(e)}const Ht="postboy_env",jt=Ht+"_user_",Ft="postboy_history",Dt=Ft+"_user_";function Jt(e){return!e||e.is_guest===!0}function Ye(e,t){return Jt(t)||t.id===void 0||t.id===null?null:e+String(t.id)}function Ze(e){return Ye(jt,e)}function et(e){return Ye(Dt,e)}function tt(e,t){try{return JSON.parse(e||JSON.stringify(t))}catch{return t}}function zt(e){var t=Ze(e);return t?tt(localStorage.getItem(t),{}):{}}function Wt(e,t){var n=Ze(t);n&&localStorage.setItem(n,JSON.stringify(e))}function Gt(e){var t=et(e);return t?tt(localStorage.getItem(t),[]):[]}function Vt(e,t){var n=et(t);n&&localStorage.setItem(n,JSON.stringify(e))}function Kt(e){for(var t=[],n=0;n<e.length;){for(;n<e.length&&/\s/.test(e[n]);)n++;if(n>=e.length)break;if(e[n]==="$"&&e[n+1]==="'"){var a="";for(n+=2;n<e.length;){if(e[n]==="'"){if(n+1<e.length&&e[n+1]==="'"){a+="'",n+=2;continue}n++;break}if(e[n]==="\\"&&n+1<e.length){a+=Xt(e[n+1]),n+=2;continue}a+=e[n],n++}t.push(a)}else if(e[n]==="'"||e[n]==='"'){for(var r=e[n++],o="";n<e.length&&e[n]!==r;)e[n]==="\\"&&n+1<e.length?o+=e[++n]:o+=e[n],n++;n++,t.push(o)}else if(e[n]==="$"&&e[n+1]==="("){var i=1;for(n+=2;n<e.length&&i>0;)e[n]==="("&&i++,e[n]===")"&&i--,n++;t.push("$(...)")}else{for(var l="";n<e.length&&!/\s/.test(e[n]);)l+=e[n++];t.push(l)}}return t}function Xt(e){var t={"'":"'","\\":"\\",a:"\x07",b:"\b",f:"\f",n:`
`,r:"\r",t:"	",v:"\v"};return Object.prototype.hasOwnProperty.call(t,e)?t[e]:"\\"+e}function Ce(e){e=e||{};var t={method:String(e.method||"GET").toUpperCase(),url:e.url||"",headers:Array.isArray(e.headers)?e.headers:[],body_type:e.body_type||"none",body_content:e.body_content||"",form_data:Array.isArray(e.form_data)?e.form_data:[]};return t.body_type==="form-urlencoded"&&t.form_data.length===0&&t.body_content&&(t.form_data=Qt(t.body_content)),t}function Qt(e){return String(e).split("&").reduce(function(t,n){if(!n)return t;var a=n.indexOf("=");return a===-1||t.push({key:Ae(n.substring(0,a)),value:Ae(n.substring(a+1))}),t},[])}function Ae(e){var t=String(e).replace(/\+/g," ");try{return decodeURIComponent(t)}catch{return t}}function Ne(e,t){var n=Ce(e);return t.setMethod(n.method),t.setUrl(n.url),t.syncParamsFromUrl(),t.clearHeaders(),n.headers.forEach(function(a){t.addHeaderRow(a.key||"",a.value||"")}),t.ensureHeaderRow(),t.setBodyType(n.body_type),t.setBodyContent(n.body_content),t.clearFormData(),n.form_data.forEach(function(a){t.addFormDataRow(a.key||"",a.value||"")}),n}function Oe(e){e=(e||"").replace(/\\\r?\n/g," ").trim();for(var t=Kt(e),n={method:"GET",url:"",headers:[],body_type:"none",body_content:"",form_data:[]},a=!1,r=0;r<t.length;r++){var o=t[r],i;if(o!=="curl"){if(o==="-X"||o==="--request"){n.method=(t[++r]||n.method).toUpperCase(),a=!0;continue}if(o.indexOf("--request=")===0){n.method=o.substring(10).toUpperCase(),a=!0;continue}if(o.indexOf("-X")===0&&o.length>2){n.method=o.substring(2).toUpperCase(),a=!0;continue}if(o==="--url"){n.url=t[++r]||"";continue}if(o.indexOf("--url=")===0){n.url=o.substring(6);continue}if(o==="-H"||o==="--header"){i=t[++r]||"",be(n.headers,i);continue}if(o.indexOf("--header=")===0){be(n.headers,o.substring(9));continue}if(o.indexOf("-H")===0&&o.length>2){be(n.headers,o.substring(2));continue}if(o==="--json"){i=t[++r]||"",Ue(n,i);continue}if(o.indexOf("--json=")===0){Ue(n,o.substring(7));continue}if(["-d","--data","--data-raw","--data-binary","--data-urlencode"].indexOf(o)!==-1){i=t[++r]||"",n.body_content=n.body_content?n.body_content+"&"+i:i,n.body_type=o==="--data-urlencode"?"form-urlencoded":ye(n.body_content,n.headers);continue}if(o.indexOf("--data=")===0||o.indexOf("--data-raw=")===0||o.indexOf("--data-binary=")===0||o.indexOf("--data-urlencode=")===0){i=o.substring(o.indexOf("=")+1),n.body_content=n.body_content?n.body_content+"&"+i:i,n.body_type=o.indexOf("--data-urlencode=")===0?"form-urlencoded":ye(n.body_content,n.headers);continue}if(o.indexOf("-d")===0&&o.length>2){i=o.substring(2),n.body_content=n.body_content?n.body_content+"&"+i:i,n.body_type=ye(n.body_content,n.headers);continue}if(o==="-F"||o==="--form"){fe(n.form_data,t[++r]||""),n.body_type="form-data",n.body_content="";continue}if(o.indexOf("--form=")===0){fe(n.form_data,o.substring(7)),n.body_type="form-data",n.body_content="";continue}if(o.indexOf("-F")===0&&o.length>2){fe(n.form_data,o.substring(2)),n.body_type="form-data",n.body_content="";continue}if(o==="-I"||o==="--head"){n.method="HEAD",a=!0;continue}if(o==="-G"||o==="--get"){n.method="GET",a=!0;continue}o.charAt(0)!=="-"&&!n.url&&(n.url=o)}}return(n.body_content||n.form_data.length)&&n.method==="GET"&&!a&&(n.method="POST"),Ce(n)}function be(e,t){var n=t.indexOf(":");n<=0||e.push({key:t.substring(0,n).trim(),value:t.substring(n+1).trim()})}function Ue(e,t){e.body_content=e.body_content?e.body_content+"&"+t:t,e.body_type="json",Pe(e.headers,"Content-Type","application/json"),Pe(e.headers,"Accept","application/json")}function Pe(e,t,n){var a=t.toLowerCase(),r=e.some(function(o){return(o.key||"").toLowerCase()===a});r||e.push({key:t,value:n})}function fe(e,t){var n=t.indexOf("=");n<=0||e.push({key:t.substring(0,n),value:t.substring(n+1)})}function ye(e,t){var n="";if(t.some(function(a){return(a.key||"").toLowerCase()==="content-type"?(n=(a.value||"").toLowerCase(),!0):!1}),n.indexOf("application/json")!==-1)return"json";if(n.indexOf("application/x-www-form-urlencoded")!==-1)return"form-urlencoded";if(n.indexOf("/xml")!==-1||n.indexOf("+xml")!==-1)return"xml";try{return JSON.parse(e),"json"}catch{return/^\s*<[^>]+>/.test(e)?"xml":/^[^=&]+=[^&]*(?:&[^=&]+=[^&]*)*$/.test(e)?"form-urlencoded":"text"}}function Yt(e){return e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB"}function f(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function xe(e){return typeof e!="string"&&(e=JSON.stringify(e,void 0,2)),e=f(e),e.replace(/(&quot;(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\])*?&quot;(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,function(t){var n="json-number";return/^&quot;/.test(t)?n=/:$/.test(t)?"json-key":"json-string":/true|false/.test(t)?n="json-boolean":/null/.test(t)&&(n="json-null"),'<span class="'+n+'">'+t+"</span>"})}function Zt(e){var t=f(e);return t.replace(/(&lt;\/?)([\w:-]+)([\s\S]*?)(\/?&gt;)/g,function(n,a,r,o,i){return o=o.replace(/([\w:-]+)(=)(\&quot;.*?\&quot;|\&#039;.*?\&#039;|[^\s]+)/g,function(l,d,c,y){return'<span class="syntax-attr-name">'+d+"</span>"+c+'<span class="syntax-attr-value">'+y+"</span>"}),'<span class="syntax-tag">'+a+r+"</span>"+o+'<span class="syntax-tag">'+i+"</span>"})}function en(e){return f(e).replace(/^([^:\n]+)(:)(.*)$/gm,function(t,n,a,r){return'<span class="syntax-header-name">'+n+"</span>"+a+'<span class="syntax-header-value">'+r+"</span>"})}function tn(e){return f(e).replace(/\b(https?:\/\/[^\s<]+)\b/g,'<span class="syntax-url">$1</span>').replace(/\b([A-Z][A-Z0-9_-]{2,})\b/g,'<span class="syntax-keyword">$1</span>').replace(/\b(-?\d+(?:\.\d+)?)\b/g,'<span class="json-number">$1</span>')}function nn(e,t){var n=String(t||"").toLowerCase(),a=String(e||"").trim();return/json|javascript|problem\+json|ld\+json/.test(n)?"json":/xml|html|svg|xhtml|rss|atom/.test(n)?"markup":/http|message\/rfc822/.test(n)?"headers":/text\/plain|text\/csv|application\/x-www-form-urlencoded/.test(n)||!a?"text":/^(HTTP\/\d(?:\.\d)? \d{3}|[A-Za-z0-9-]+\s*:)/.test(a)?"headers":/^</.test(a)&&/>\s*$/.test(a)?"markup":/^[{[]/.test(a)?"json":"text"}function an(e,t){return t==="json"?xe(e):t==="markup"?Zt(e):t==="headers"?en(e):tn(e)}const U=(e,t,n)=>Math.min(n,Math.max(t,e));function P(e,t){const n=Number(e);return Number.isFinite(n)?n:t}function sn(e,t){try{return{...t,...JSON.parse(localStorage.getItem(e)||"{}")}}catch{return{...t}}}function He(e,t){try{localStorage.setItem(e,JSON.stringify(t))}catch{}}function on({shell:e,sidebarHandle:t,toolsHandle:n,responseHandle:a,storageKey:r="postboy_panel_layout"}={}){if(!e)return;const o={sidebarWidth:320,toolsWidth:320,responseHeight:360},i={sidebarMin:240,sidebarMax:460,toolsMin:260,toolsMax:460,responseMin:240,responseMax:620},l=sn(r,o);function d(){l.sidebarWidth=U(P(l.sidebarWidth,o.sidebarWidth),i.sidebarMin,i.sidebarMax),l.toolsWidth=U(P(l.toolsWidth,o.toolsWidth),i.toolsMin,i.toolsMax),l.responseHeight=U(P(l.responseHeight,o.responseHeight),i.responseMin,i.responseMax),e.style.setProperty("--sidebar-width",`${l.sidebarWidth}px`),e.style.setProperty("--tools-width",`${l.toolsWidth}px`),e.style.setProperty("--response-height",`${l.responseHeight}px`),t==null||t.setAttribute("aria-valuenow",String(l.sidebarWidth)),n==null||n.setAttribute("aria-valuenow",String(l.toolsWidth)),a==null||a.setAttribute("aria-valuenow",String(l.responseHeight))}function c(u,v){u&&u.addEventListener("pointerdown",h=>{if(window.matchMedia("(max-width: 1180px)").matches&&u!==a)return;h.preventDefault(),u.setPointerCapture(h.pointerId),e.classList.add("is-resizing");const L={x:h.clientX,y:h.clientY,sidebarWidth:P(l.sidebarWidth,o.sidebarWidth),toolsWidth:P(l.toolsWidth,o.toolsWidth),responseHeight:P(l.responseHeight,o.responseHeight)};function T(g){v(g,L),d()}function p(){e.classList.remove("is-resizing"),He(r,l),window.removeEventListener("pointermove",T),window.removeEventListener("pointerup",p),window.removeEventListener("pointercancel",p)}window.addEventListener("pointermove",T),window.addEventListener("pointerup",p),window.addEventListener("pointercancel",p)})}c(t,(u,v)=>{l.sidebarWidth=U(v.sidebarWidth+u.clientX-v.x,i.sidebarMin,i.sidebarMax)}),c(n,(u,v)=>{l.toolsWidth=U(v.toolsWidth-(u.clientX-v.x),i.toolsMin,i.toolsMax)}),c(a,(u,v)=>{l.responseHeight=U(v.responseHeight-(u.clientY-v.y),i.responseMin,Math.min(i.responseMax,window.innerHeight-260))});function y(u,v,h,L,T=1){u&&(u.setAttribute("aria-valuemin",String(h)),u.setAttribute("aria-valuemax",String(L)),u.addEventListener("keydown",p=>{const g=p.shiftKey?40:16;if(p.key!=="ArrowLeft"&&p.key!=="ArrowRight"&&p.key!=="ArrowUp"&&p.key!=="ArrowDown")return;p.preventDefault();const ee=p.key==="ArrowRight"||p.key==="ArrowDown";l[v]=U(P(l[v],o[v])+(ee?g:-g)*T,h,L),d(),He(r,l)}))}y(t,"sidebarWidth",i.sidebarMin,i.sidebarMax),y(n,"toolsWidth",i.toolsMin,i.toolsMax,-1),y(a,"responseHeight",i.responseMin,i.responseMax,-1),d()}function je(e){try{return decodeURIComponent(e)}catch{return e}}function rn(e){const t=String(e||"").indexOf("?");if(t===-1)return[];const n=String(e||"").indexOf("#",t),a=String(e||"").slice(t+1,n===-1?void 0:n);return a?a.split("&").filter(Boolean).map(r=>{const o=r.indexOf("="),i=o===-1?r:r.slice(0,o),l=o===-1?"":r.slice(o+1);return{enabled:!0,key:je(i.replace(/\+/g," ")),value:je(l.replace(/\+/g," ")),description:""}}):[]}function ln(e,t){const[n,a=""]=String(e||"").split("#"),r=n.split("?")[0],o=(t||[]).filter(i=>i.enabled&&i.key).map(i=>`${encodeURIComponent(i.key)}=${encodeURIComponent(i.value||"")}`).join("&");return`${r}${o?`?${o}`:""}${a?`#${a}`:""}`}function nt(e){return(e||[]).reduce((t,n)=>(n.key&&(t[n.key]=n.value),t),{})}function at(e,t=n=>n){const n=[...e.headers||[]],a=[...e.params||[]],r=e.auth_config||{};return e.auth_type==="bearer"&&r.token?n.push({key:"Authorization",value:`Bearer ${t(r.token)}`}):e.auth_type==="basic"&&(r.username||r.password)?n.push({key:"Authorization",value:`Basic ${btoa(`${t(r.username)}:${t(r.password)}`)}`}):e.auth_type==="apikey"&&r.key&&(r.in==="query"?a.push({enabled:!0,key:r.key,value:r.value||""}):n.push({key:r.key,value:r.value||""})),{...e,headers:n,params:a}}function st(e,t=n=>n){const[n,a=""]=t(e.url).split("#"),[r,o=""]=n.split("?"),i=new URLSearchParams(o);(e.params||[]).filter(d=>d.enabled&&d.key).forEach(d=>i.set(t(d.key),t(d.value)));const l=i.toString();return`${r}${l?`?${l}`:""}${a?`#${a}`:""}`}function ot(e,t=n=>n){const n=at(e,t),a=n.body_type==="json"?"application/json":n.body_type==="form-urlencoded"?"application/x-www-form-urlencoded":n.body_type==="form-data"?"multipart/form-data":"",r={method:n.method,url:st(n,t),headers:nt(n.headers),contentType:a,body:["json","text","xml"].includes(n.body_type)?t(n.body_content):"",formData:n.body_type==="form-data"||n.body_type==="form-urlencoded"?n.form_data:[],verifySsl:!0};return n.body_type==="form-data"&&delete r.body,a||delete r.contentType,r}function dn(e,t="omit",n=a=>a){const a=at(e,n),r=nt(a.headers);let o;return a.body_type==="json"?(r["Content-Type"]=r["Content-Type"]||"application/json",o=n(a.body_content)):["text","xml"].includes(a.body_type)?o=n(a.body_content):a.body_type==="form-urlencoded"?(r["Content-Type"]=r["Content-Type"]||"application/x-www-form-urlencoded",o=new URLSearchParams((a.form_data||[]).map(i=>[n(i.key),n(i.value)]))):a.body_type==="form-data"&&(o=new FormData,(a.form_data||[]).forEach(i=>o.append(n(i.key),n(i.value)))),{url:st(a,n),options:{method:a.method,headers:r,body:["GET","HEAD"].includes(a.method)?void 0:o,credentials:t}}}function cn(e,t){if(!e||!t)return"";var n=t.toLowerCase();if(typeof e=="string"){for(var a=e.split(/\r?\n/),r=0;r<a.length;r++){var o=a[r].indexOf(":");if(o>-1&&a[r].slice(0,o).trim().toLowerCase()===n)return a[r].slice(o+1).trim()}return""}for(var i=Object.keys(e),l=0;l<i.length;l++)if(i[l].toLowerCase()===n)return e[i[l]];return""}function re(e){return e?e.querySelector("code")||e:null}function un(e){return!e||!e.parentElement?null:e.parentElement.querySelector(".response-line-numbers")}function Fe(e){return e===""?1:e.split(`
`).length}function pn(e,t){for(var n=e.parentElement;n&&n!==t;){if(n.classList&&n.classList.contains("json-tree-children")){var a=n.parentElement;if(a&&a.classList&&a.classList.contains("is-collapsed"))return!0}n=n.parentElement}return!1}function bn(e){if(!e.querySelectorAll)return[];var t=e.querySelectorAll(".json-tree-line");if(!t.length)return[];for(var n=[],a=0;a<t.length;a++)pn(t[a],e)||n.push(a+1);return n}function ie(e){var t=re(e),n=un(e);if(!(!t||!n)){var a=!!(t.classList&&t.classList.contains&&t.classList.contains("json-tree")||typeof t.innerHTML=="string"&&t.innerHTML.indexOf("json-tree-line")>-1),r=a?bn(t):[];if(!r.length)for(var o=Fe(a?gn(t)||t.textContent||"":t.textContent||""),i=1;i<=o;i++)r.push(i);for(var l=[],d=0;d<r.length;d++)l.push("<span>"+r[d]+"</span>");n.innerHTML=l.join(`<span class="line-number-break">
</span>`)}}function fn(e){return typeof e=="object"&&e!==null?{text:JSON.stringify(e,null,2),format:"json"}:{text:String(e||""),format:""}}function Le(e){return e!==null&&typeof e=="object"}function yn(e){return Object.prototype.toString.call(e)==="[object Array]"}function De(e){return e==null?"":'<span class="json-key">'+f(JSON.stringify(String(e)))+":</span> "}function vn(e){return xe(JSON.stringify(e))}function hn(e,t){var n=e==="array"?"Toggle array with ":"Toggle object with ";return n+=t+(t===1?" child":" children"),'<button class="json-tree-toggle" type="button" aria-expanded="true" aria-label="'+f(n)+'">▾</button>'}function rt(e,t,n,a){var r=a?",":"",o=' style="--json-depth: '+n+'"';if(!Le(e))return'<div class="json-tree-line"'+o+">"+De(t)+vn(e)+r+"</div>";var i=yn(e),l=i?e.map(function(p,g){return g}):Object.keys(e),d=l.length,c=i?"[":"{",y=i?"]":"}",u=i?"[…]":"{…}",v=i?"array":"object",h='<div class="json-tree-node" data-json-type="'+v+'">';h+='<div class="json-tree-line"'+o+">",d?h+=hn(v,d):h+='<span class="json-tree-toggle-spacer"></span>',h+=De(t),h+='<span class="json-tree-open">'+c+"</span>",h+='<span class="json-tree-summary" aria-hidden="true">'+u+r+"</span>",h+="</div>",h+='<div class="json-tree-children">';for(var L=0;L<l.length;L++){var T=l[L];h+=rt(e[T],i?null:T,n+1,L<l.length-1)}return h+='<div class="json-tree-line json-tree-close"'+o+">"+y+r+"</div>",h+="</div>",h+="</div>",h}function mn(e){return Le(e)?rt(e,null,0,!1):xe(JSON.stringify(e,null,2))}function Je(e,t){e&&(e.dataset?e.dataset.rawBody=t:e.__rawBody=t)}function gn(e){return e?e.dataset&&typeof e.dataset.rawBody=="string"?e.dataset.rawBody:typeof e.__rawBody=="string"?e.__rawBody:"":""}function Te(e,t,n){var a=String(n||"");Je(e,a),t&&t!==e&&Je(t,a)}function Ee(e,t){e.classList&&e.classList.toggle&&e.classList.toggle("json-tree",t)}function ze(e,t,n){var a=JSON.stringify(n,null,2);Te(e,t,a),Ee(t,Le(n)),t.innerHTML=mn(n),ie(e)}function wn(e,t){if(!(!e||!t)){var n=re(e),a=t.closest(".json-tree-node");if(!(!n||!a||!n.contains(a))){var r=!a.classList.contains("is-collapsed");a.classList.toggle("is-collapsed",r),t.setAttribute("aria-expanded",r?"false":"true"),t.textContent=r?"▸":"▾",ie(e)}}}function it(e,t,n){if(e){var a=re(e);if(a){a.classList&&a.classList.remove&&a.classList.remove("response-issue");var r=fn(t);if(r.format==="json"){ze(e,a,JSON.parse(r.text));return}var o=cn(n,"content-type"),i=nn(r.text,o);if(i==="json")try{ze(e,a,JSON.parse(r.text));return}catch{}Te(e,a,r.text),Ee(a,!1),a.innerHTML=an(r.text,i),ie(e)}}}function We(e,t){return'<div class="response-issue-row"><span class="response-issue-row-label">'+f(e)+'</span><span class="response-issue-row-value">'+f(t||"Not available")+"</span></div>"}function Ge(e,t){if(!(!e||!t)){var n=re(e);if(n){var a=t.variant||"error",r=t.icon||"⛔",o=t.title||"Request failed",i=t.message||"The request could not be completed.",l=a==="warning"?"Warning":a==="info"?"Info":"Error",d=t.likelyCause||"No likely cause was provided.",c=t.suggestedFix||"Retry the request and verify your settings.",y=t.detailsText||"",u=t.cta||null;Te(e,n,y),Ee(n,!1),n.classList&&n.classList.add&&n.classList.add("response-issue"),n.innerHTML='<section class="response-issue-card response-issue-'+f(a)+'" role="alert" aria-live="polite"><header class="response-issue-header"><span class="response-issue-icon" aria-hidden="true">'+f(r)+'</span><h4 class="response-issue-title">'+f(o)+'</h4><span class="response-issue-severity" aria-label="Severity">'+f(l)+'</span></header><p class="response-issue-message">'+f(i)+"</p>"+We("Likely cause",d)+We("Suggested fix",c)+(u&&u.label?'<button class="response-issue-cta btn-secondary" type="button" data-action="'+f(u.action||"")+'">'+f(u.label)+"</button>":"")+'<details class="response-issue-details"><summary>Details</summary><pre>'+f(y)+"</pre></details></section>",ie(e)}}}const E=()=>({name:"Untitled Request",method:"GET",url:"",params:[],headers:[],body_type:"none",body_content:"",form_data:[],auth_type:"none",auth_config:{}});let j=[],k=null,G=null,w=E(),b=[],$=null,A={},B=[],K=null,J=null,H=null,te=null,D=0,Q=1,ne=null,ge=!1,se="";const ae=new Set,lt="postboy_request_tabs",Sn=`${lt}_user_`,Cn=`${lt}_guest`,s=e=>document.querySelector(e),m=e=>Array.from(document.querySelectorAll(e));function V(e){const t=document.getElementById(e);t&&(t.classList.add("active","show"),t.setAttribute("aria-hidden","false"))}function x(e){const t=document.getElementById(e);t&&(t.classList.remove("active","show"),t.setAttribute("aria-hidden","true"))}function z(e,t,n=!1){e&&(e.textContent=t||"",e.classList.toggle("auth-error",n))}function F(e){return String(e||"").replace(/\{\{\s*([^}]+?)\s*\}\}/g,(t,n)=>{const a=String(n||"").trim();return Object.prototype.hasOwnProperty.call(A,a)?A[a]:""})}function dt(){if(Xe(S))return{storage:sessionStorage,key:Cn};const e=S.currentUser;return e&&e.id!==void 0&&e.id!==null&&e.is_guest!==!0?{storage:localStorage,key:Sn+String(e.id)}:null}function M(){const e=dt();if(e)try{e.storage.setItem(e.key,JSON.stringify({tabs:b,activeTabId:$,nextTabNumber:Q}))}catch{}}function ve(){ne&&clearTimeout(ne),ne=setTimeout(()=>{ne=null,!(!X(S)||!b.length)&&Z()},150)}function xn(){const e=dt();if(!e)return!1;try{const t=JSON.parse(e.storage.getItem(e.key)||"null");return!t||!Array.isArray(t.tabs)||!t.tabs.length?!1:(b=t.tabs.map((n,a)=>({id:n.id||`restored_tab_${a+1}`,requestId:n.requestId??null,collectionId:n.collectionId??null,title:n.title||`Unsaved Request ${a+1}`,state:{...E(),...n.state||{}}})),$=b.some(n=>n.id===t.activeTabId)?t.activeTabId:b[0].id,Q=Number.isFinite(t.nextTabNumber)&&t.nextTabNumber>0?t.nextTabNumber:b.length+1,q(Y()),!0)}catch{return!1}}function Ln({resetStorageBackedState:e=!0}={}){B=e?[]:B,A=e?{}:A,j=[],k=null,G=null,K=null,w=E(),b=[],$=null,Q=1,I(),Ie(),xt(),_(w),Fn(),R()}async function ke(){X(S)&&(A=zt(S.currentUser),B=Gt(S.currentUser),await N(),xn()||O(),q(Y()),_(w),R(),xt(),Ie())}function we(e){s("#loginScreen").hidden=e,s("#appContainer").hidden=!e}function qe(){if(X(S)){const e=Xe(S)?"Guest workspace":S.currentUser.username;z(s("#appAuthStatus"),`Signed in as ${e}`),we(!0)}else z(s("#authStatus"),S.loading?"Checking account...":"Sign in or continue as guest."),we(!1)}async function he(e){const t=s("#authUsername").value.trim(),n=s("#authPassword").value;if(!t||!n){z(s("#authStatus"),"Enter a username and password.",!0);return}try{const a=e==="register"?await qt({username:t,password:n}):await Rt({username:t,password:n});qe(),await ke(),e==="register"&&a.recovery_key&&(s("#registerRecoveryKey").value=a.recovery_key,s("#registerRecoveryAcknowledge").checked=!1,s("#registerRecoveryCloseBtn").disabled=!0,V("registerSuccessModal"))}catch(a){z(s("#authStatus"),a.message,!0)}}async function Tn(){await kt(),qe(),X(S)&&await ke()}function En(){var e,t,n,a,r,o,i;(e=s("#loginBtn"))==null||e.addEventListener("click",()=>he("login")),(t=s("#registerBtn"))==null||t.addEventListener("click",()=>he("register")),(n=s("#guestLoginBtn"))==null||n.addEventListener("click",async()=>{await Tt(),qe(),await ke()}),(a=s("#logoutBtn"))==null||a.addEventListener("click",async()=>{try{await Et()}finally{Ln(),we(!1),z(s("#authStatus"),"Signed out."),s("#authPassword").value=""}}),(r=s("#registerRecoveryAcknowledge"))==null||r.addEventListener("change",l=>{s("#registerRecoveryCloseBtn").disabled=!l.target.checked}),(o=s("#registerRecoveryCloseBtn"))==null||o.addEventListener("click",()=>x("registerSuccessModal")),(i=s("#copyRecoveryKeyBtn"))==null||i.addEventListener("click",async()=>{var l;await((l=navigator.clipboard)==null?void 0:l.writeText(s("#registerRecoveryKey").value))}),[s("#authUsername"),s("#authPassword")].forEach(l=>{l==null||l.addEventListener("keydown",d=>{d.key==="Enter"&&he("login")})})}async function N(){ge=!0,se="",I();try{j=await C.getCollections()}catch(e){j=[],se=e.message||"Collections could not be loaded.",z(s("#appAuthStatus"),e.message,!0)}finally{ge=!1}I()}function ct(e=[],t=[]){return e.forEach(n=>{t.push(n),ct(n.children||[],t)}),t}function ut(e,t=j){for(const n of t){if(String(n.id)===String(e))return n;const a=ut(e,n.children||[]);if(a)return a}return null}function I(){const e=s("#collectionList");if(e){if(ge){e.innerHTML='<p class="empty-state">Loading collections...</p>';return}if(se){e.innerHTML=`<div class="panel-state panel-state-error"><strong>Collections unavailable</strong><span>${f(se)}</span></div>`;return}if(!j.length){e.innerHTML='<div class="panel-state"><strong>No collections yet</strong><span>Create a collection or import a Postman collection to start organizing requests.</span></div>';return}e.innerHTML=j.map(t=>pt(t,0)).join("")}}function pt(e,t=0){const n=ae.has(String(e.id)),a=(e.children||[]).map(i=>pt(i,t+1)).join(""),r=(e.requests||[]).map(i=>`
    <button class="request-item ${String(i.id)===String(G)?"active":""}" type="button" data-id="${i.id}" data-collection-id="${e.id}" style="--tree-depth: ${t+1}">
      <span class="request-method">${f(i.method||"GET")}</span>
      <span class="request-item-name">${f(i.name||"Untitled Request")}</span>
    </button>
  `).join(""),o=(e.children||[]).length+(e.requests||[]).length;return`
    <div class="collection-folder ${String(e.id)===String(k)?"active":""}" data-id="${e.id}">
      <button class="folder-header" type="button" data-id="${e.id}" aria-expanded="${String(!n)}" style="--tree-depth: ${t}">
        <span class="folder-arrow" aria-hidden="true">${n?">":"v"}</span>
        <span class="folder-icon" aria-hidden="true">[]</span>
        <span class="folder-name">${f(e.name)}</span>
        <span class="folder-count">${o}</span>
      </button>
      <div class="folder-items" data-parent-id="${e.id}" ${n?"hidden":""}>
        ${a}
        ${r}
      </div>
    </div>
  `}function kn(e){const t=e.trim().toLowerCase();m("#collectionList .collection-folder, #collectionList .request-item").forEach(n=>{n.hidden=!1}),t&&(m("#collectionList .request-item").forEach(n=>{n.hidden=!n.textContent.toLowerCase().includes(t)}),m("#collectionList .collection-folder").forEach(n=>{var o;const a=(o=n.querySelector(".folder-name"))==null?void 0:o.textContent.toLowerCase().includes(t),r=Array.from(n.querySelectorAll(".request-item:not([hidden]), .collection-folder:not([hidden])")).some(i=>i!==n);n.hidden=!(a||r)}))}function bt(){return`tab_${Date.now()}_${Q++}`}function le(){return{id:bt(),requestId:null,collectionId:k,title:`Unsaved Request ${Q-1}`,state:E()}}function O(){if(!b.length){const e=le();b=[e],$=e.id,M()}}function Y(){return O(),b.find(e=>e.id===$)||b[0]}function q(e){$=e.id,G=e.requestId,k=e.collectionId||k,w={...E(),...e.state||{}}}function Z(){const e=Y();e&&(e.state=Me(),e.requestId=G,e.collectionId=k,e.title=e.requestId?e.state.name||w.name||"Untitled Request":e.title||"Unsaved Request",w={...E(),...e.state},M())}function ft(e){if(O(),$===e)return;Z();const t=b.find(n=>n.id===e);t&&(q(t),_(w),R(),I(),M())}function qn(){O(),Z();const e=le();b.push(e),q(e),_(w),R(),I(),M()}function Rn(e){if(O(),b.length===1){b=[le()],q(b[0]),_(w),R(),I(),M();return}const t=b.findIndex(a=>a.id===e);if(t===-1)return;const n=$===e;if(b.splice(t,1),n){const a=b[Math.max(0,t-1)]||b[0];q(a),_(w)}R(),I(),M()}async function _n(e){O();const t=b.find(r=>String(r.requestId)===String(e));if(t){ft(t.id);return}const n=await C.getRequest(e);Z();const a={id:bt(),requestId:n.id,collectionId:n.collection_id,title:n.name||"Untitled Request",state:{...E(),...n,body_type:n.body_type||(n.body?"text":"none"),body_content:n.body_content??n.body??"",form_data:n.form_data||[],auth_config:n.auth_config||{}}};b.push(a),q(a),_(w),I(),R(),M()}function R(){O();const e=s("#requestTabs");e&&(e.innerHTML=b.map(t=>{var o;const n=t.requestId?((o=t.state)==null?void 0:o.name)||t.title||"Untitled Request":t.title||"Unsaved Request",a=t.id===$,r=b.length>1;return`
      <div class="request-tab-item${a?" active":""}" data-tab-id="${f(t.id)}">
        <button class="request-tab-trigger" type="button" data-tab-id="${f(t.id)}">${f(n)}</button>
        ${r?`<button class="request-tab-close" type="button" data-close-tab="${f(t.id)}" aria-label="Close ${f(n)}">×</button>`:""}
      </div>
    `}).join(""))}function Bn(){var e,t,n,a,r,o,i,l,d;(e=s("#newCollectionBtn"))==null||e.addEventListener("click",()=>{s("#collectionModalTitle").textContent="New Collection",s("#editCollectionId").value="",s("#newColName").value="",s("#newColDesc").value="",V("newCollectionModal")}),(t=s("#newColModalClose"))==null||t.addEventListener("click",()=>x("newCollectionModal")),(n=s("#newColCancelBtn"))==null||n.addEventListener("click",()=>x("newCollectionModal")),(a=s("#newColSaveBtn"))==null||a.addEventListener("click",Mn),(r=s("#collectionSearchInput"))==null||r.addEventListener("input",c=>kn(c.target.value)),(o=s("#collectionList"))==null||o.addEventListener("click",c=>{const y=c.target.closest(".request-item");if(y){_n(y.dataset.id);return}const u=c.target.closest(".folder-header");if(u){if(k=u.dataset.id,c.target.closest(".folder-arrow")){const v=String(k);ae.has(v)?ae.delete(v):ae.add(v)}I()}}),(i=s("#collectionList"))==null||i.addEventListener("contextmenu",c=>{const y=c.target.closest(".folder-header"),u=c.target.closest(".request-item");if(!y&&!u)return;c.preventDefault(),J=(y==null?void 0:y.dataset.id)||(u==null?void 0:u.dataset.collectionId)||null,H=(u==null?void 0:u.dataset.id)||null;const v=s(u?"#requestContextMenu":"#contextMenu");In(v,c.clientX,c.clientY)}),(l=s("#contextMenu"))==null||l.addEventListener("click",$n),(d=s("#requestContextMenu"))==null||d.addEventListener("click",An),document.addEventListener("click",c=>{c.target.closest(".context-menu")||de()})}async function Mn(){const e=s("#newColName").value.trim();if(!e)return;const t=s("#editCollectionId").value;t?await C.updateCollection(t,{name:e,description:s("#newColDesc").value}):await C.createCollection({name:e,description:s("#newColDesc").value}),x("newCollectionModal"),await N()}function In(e,t,n){de(),e.style.left=`${t}px`,e.style.top=`${n}px`,e.classList.add("active")}function de(){m(".context-menu").forEach(e=>e.classList.remove("active"))}async function $n(e){var n;const t=(n=e.target.closest("[data-action]"))==null?void 0:n.dataset.action;if(!(!t||!J))if(de(),t==="add-request")yt({collectionId:J});else if(t==="edit"){const a=ut(J);if(!a)return;s("#collectionModalTitle").textContent="Rename Collection",s("#editCollectionId").value=a.id,s("#newColName").value=a.name||"",s("#newColDesc").value=a.description||"",V("newCollectionModal")}else t==="duplicate"?(await C.duplicateCollection(J),await N()):t==="delete"&&confirm("Delete this collection and its requests?")&&(await C.deleteCollection(J),await N())}async function An(e){var n;const t=(n=e.target.closest("[data-action]"))==null?void 0:n.dataset.action;if(!(!t||!H))if(de(),t==="edit"){const a=await C.getRequest(H);yt({collectionId:a.collection_id,request:a})}else t==="duplicate"?(await C.duplicateRequest(H),await N()):t==="delete"&&confirm("Delete this request?")&&(await C.deleteRequest(H),b=b.filter(a=>String(a.requestId)!==String(H)),b.length?String(G)===String(H)&&(q(b[0]),_(w)):(b=[le()],q(b[0]),_(w)),R(),M(),await N())}function yt({collectionId:e,request:t=null}){s("#requestModalTitle").textContent=t?"Rename Request":"New Request",s("#editRequestId").value=(t==null?void 0:t.id)||"",s("#editRequestCollectionId").value=e||k||"",s("#reqNameInput").value=(t==null?void 0:t.name)||"",V("requestModal"),s("#reqNameInput").focus()}function Nn(){var e,t,n;(e=s("#reqModalClose"))==null||e.addEventListener("click",()=>x("requestModal")),(t=s("#reqCancelBtn"))==null||t.addEventListener("click",()=>x("requestModal")),(n=s("#reqSaveBtn"))==null||n.addEventListener("click",async()=>{var i;const a=s("#reqNameInput").value.trim(),r=s("#editRequestId").value,o=s("#editRequestCollectionId").value||k||((i=ct(j)[0])==null?void 0:i.id);if(!(!a||!o)){if(r)await C.updateRequest(r,{name:a}),b.forEach(l=>{String(l.requestId)===String(r)&&(l.title=a,l.state={...E(),...l.state||{},name:a})});else{const l=await C.createRequest({...E(),name:a,collection_id:Number(o)}),d=Y();d&&(d.requestId=l.id,d.collectionId=Number(o),d.title=a,d.state={...E(),...d.state||{},name:a,collection_id:Number(o)}),G=l.id}M(),x("requestModal"),await N(),R()}})}function W(e,t,n=""){const a=document.createElement("input");return a.type="text",a.className=`form-input ${e}`,a.placeholder=t,a.value=n||"",a}function ce(e="",t=""){const n=document.createElement("div");n.className="key-value-row header-row",n.append(W("header-key","Header name",e),W("header-value","Header value",t));const a=document.createElement("button");a.className="btn btn-icon btn-remove",a.type="button",a.textContent="×",a.addEventListener("click",()=>n.remove()),n.append(a),s("#headersContainer").append(n)}function vt(){s("#headersContainer .header-row")||ce()}function oe(e="",t=""){const n=document.createElement("div");n.className="key-value-row form-data-row",n.append(W("form-data-key","Field name",e),W("form-data-value","Field value or @file path",t));const a=document.createElement("button");a.className="btn btn-icon btn-remove",a.type="button",a.textContent="×",a.addEventListener("click",()=>n.remove()),n.append(a),s("#formDataRows").append(n)}function Re(e="",t="",n="",a=!0){const r=document.createElement("tr");r.innerHTML=`
    <td><input type="checkbox" class="param-enabled" ${a?"checked":""}></td>
    <td><input type="text" class="form-input param-key" value="${f(e)}" placeholder="key"></td>
    <td><input type="text" class="form-input param-value" value="${f(t)}" placeholder="value"></td>
    <td><input type="text" class="form-input param-desc" value="${f(n)}" placeholder="description"></td>
    <td><button class="btn btn-icon param-remove" type="button">×</button></td>
  `,r.querySelector(".param-remove").addEventListener("click",()=>{r.remove(),me()}),r.querySelectorAll("input").forEach(o=>o.addEventListener("input",me)),r.querySelector(".param-enabled").addEventListener("change",me),s("#paramsBody").append(r)}function _e(){const e=s("#urlInput").value||"";s("#paramsBody").innerHTML="",rn(e).forEach(t=>{Re(t.key,t.value,t.description,t.enabled)})}function me(){const e=s("#urlInput");e.value=ln(e.value,gt())}function ht(){var a;const e=((a=document.querySelector('input[name="bodyType"]:checked'))==null?void 0:a.value)||"none",t=["json","text","xml"].includes(e),n=["form-urlencoded","form-data"].includes(e);s("#bodyContentEditor").hidden=!t,s("#formDataContainer").hidden=!n}function mt(e="none",t={}){const n=s("#authFields");n&&(e==="bearer"?(n.innerHTML='<label class="field" for="authToken"><span>Token</span><input id="authToken" class="form-input" type="password" placeholder="Bearer token"></label>',s("#authToken").value=t.token||""):e==="basic"?(n.innerHTML=`
      <label class="field" for="authUser"><span>Username</span><input id="authUser" class="form-input" type="text"></label>
      <label class="field" for="authPass"><span>Password</span><input id="authPass" class="form-input" type="password"></label>
    `,s("#authUser").value=t.username||"",s("#authPass").value=t.password||""):e==="apikey"?(n.innerHTML=`
      <label class="field" for="authApiKey"><span>Key</span><input id="authApiKey" class="form-input" type="text"></label>
      <label class="field" for="authApiValue"><span>Value</span><input id="authApiValue" class="form-input" type="password"></label>
      <label class="field" for="authApiIn"><span>Add to</span><select id="authApiIn" class="form-select"><option value="header">Header</option><option value="query">Query</option></select></label>
    `,s("#authApiKey").value=t.key||"",s("#authApiValue").value=t.value||"",s("#authApiIn").value=t.in||"header"):n.innerHTML='<p class="empty-state">No authentication will be added.</p>')}function Be(e){const t=document.querySelector(`input[name="bodyType"][value="${e}"]`);t&&(t.checked=!0),ht()}function On(e,t={}){const n=document.querySelector(`input[name="authType"][value="${e}"]`);n&&(n.checked=!0),mt(e,t)}function _(e){var t,n;s("#methodSelect").value=e.method||"GET",s("#urlInput").value=e.url||"",s("#paramsBody").innerHTML="",(e.params||[]).forEach(a=>Re(a.key,a.value,a.description||"",a.enabled!==!1)),(t=e.params)!=null&&t.length||_e(),s("#headersContainer").innerHTML="",(e.headers||[]).forEach(a=>ce(a.key||a.name||"",a.value||"")),vt(),Be(e.body_type||"none"),s("#bodyContent").value=e.body_content||e.body||"",s("#formDataRows").innerHTML="",(e.form_data||[]).forEach(a=>oe(a.key||"",a.value||"")),(n=e.form_data)!=null&&n.length||oe(),On(e.auth_type||"none",e.auth_config||{})}function gt(){return m("#paramsBody tr").map(e=>({enabled:e.querySelector(".param-enabled").checked,key:e.querySelector(".param-key").value.trim(),value:e.querySelector(".param-value").value,description:e.querySelector(".param-desc").value}))}function Un(){return m("#headersContainer .header-row").map(e=>({key:F(e.querySelector(".header-key").value.trim()),value:F(e.querySelector(".header-value").value)})).filter(e=>e.key)}function Pn(){return m("#formDataRows .form-data-row").map(e=>({key:F(e.querySelector(".form-data-key").value.trim()),value:F(e.querySelector(".form-data-value").value)})).filter(e=>e.key)}function Hn(){var t,n,a,r,o,i,l;const e=((t=document.querySelector('input[name="authType"]:checked'))==null?void 0:t.value)||"none";return e==="bearer"?{token:((n=s("#authToken"))==null?void 0:n.value)||""}:e==="basic"?{username:((a=s("#authUser"))==null?void 0:a.value)||"",password:((r=s("#authPass"))==null?void 0:r.value)||""}:e==="apikey"?{key:((o=s("#authApiKey"))==null?void 0:o.value)||"",value:((i=s("#authApiValue"))==null?void 0:i.value)||"",in:((l=s("#authApiIn"))==null?void 0:l.value)||"header"}:{}}function Me(){var n,a;const e=((n=document.querySelector('input[name="bodyType"]:checked'))==null?void 0:n.value)||"none",t=((a=document.querySelector('input[name="authType"]:checked'))==null?void 0:a.value)||"none";return{...w,method:s("#methodSelect").value,url:s("#urlInput").value.trim(),params:gt(),headers:Un(),body_type:e,body_content:s("#bodyContent").value,form_data:Pn(),auth_type:t,auth_config:Hn()}}async function jn(e){const t=s("#executionModeSelect").value;if(t==="client"){const{url:a,options:r}=dn(e,s("#clientCredentialsSelect").value,F),o=performance.now(),i=await fetch(a,r),l=await i.text();let d=l;try{d=JSON.parse(l)}catch{}return{status:i.status,statusText:i.statusText,headers:Object.fromEntries(i.headers.entries()),body:d,time:Math.round(performance.now()-o)}}const n=ot(e,F);return t==="desktop-native"?Pt(n):C.sendProxyRequest(n)}function Fn(){s("#statusCode").textContent="---",s("#responseTime").textContent="0 ms",s("#responseSize").textContent="0 B",s("#responseHeaders").textContent="",it(s("#responseBody"),"Send a request to see the response here.",{})}function wt(e){K=e,s("#statusCode").textContent=`${e.status||0} ${e.statusText||""}`.trim(),s("#statusCode").className=`status-badge ${e.status>=200&&e.status<300?"success":e.status>=400?"error":"warning"}`,s("#responseTime").textContent=`${e.time||0} ms`;const t=typeof e.body=="string"?e.body:JSON.stringify(e.body||"",null,2);s("#responseSize").textContent=Yt(new Blob([t]).size),s("#responseHeaders").textContent=JSON.stringify(e.headers||{},null,2),it(s("#responseBody"),e.body??"",e.headers||{})}async function St(){const e=Me();if(!e.url){Ge(s("#responseBody"),{title:"URL is required",message:"Enter a request URL before sending.",likelyCause:"The request URL field is empty.",suggestedFix:"Paste a full http:// or https:// URL."});return}try{s("#sendBtn").disabled=!0;const t=await jn(e);wt(t),B.unshift({method:e.method,url:e.url,status:t.status,at:new Date().toISOString()}),B=B.slice(0,25),Vt(B,S.currentUser),Ie()}catch(t){Ge(s("#responseBody"),{title:"Request failed",message:t.message,likelyCause:"The request executor returned an error.",suggestedFix:"Check the URL, proxy mode, and headers.",detailsText:JSON.stringify(t.payload||t,null,2)})}finally{s("#sendBtn").disabled=!1}}function Dn(){var t,n,a,r,o,i,l,d,c,y,u,v,h,L,T;O(),q(Y()),_(w),R();const e=s('#executionModeSelect option[value="desktop-native"]');e&&(e.disabled=!Qe()),(t=s("#requestBar"))==null||t.addEventListener("input",ve),(n=s("#requestSection"))==null||n.addEventListener("input",ve),(a=s("#requestSection"))==null||a.addEventListener("change",ve),(r=s("#newTabBtn"))==null||r.addEventListener("click",()=>{qn()}),(o=s("#requestTabs"))==null||o.addEventListener("click",p=>{const g=p.target.closest("[data-close-tab]");if(g){Rn(g.dataset.closeTab);return}const ee=p.target.closest("[data-tab-id]");ee&&ft(ee.dataset.tabId)}),(i=s("#sendBtn"))==null||i.addEventListener("click",St),(l=s("#addHeaderBtn"))==null||l.addEventListener("click",()=>ce()),(d=s("#addParamBtn"))==null||d.addEventListener("click",()=>Re()),(c=s("#addFormDataBtn"))==null||c.addEventListener("click",()=>oe()),(y=s("#urlInput"))==null||y.addEventListener("input",_e),(u=s("#prettifyJsonBtn"))==null||u.addEventListener("click",()=>{try{s("#bodyContent").value=JSON.stringify(JSON.parse(s("#bodyContent").value),null,2),Be("json")}catch{alert("Body is not valid JSON.")}}),m('input[name="bodyType"]').forEach(p=>p.addEventListener("change",ht)),m('input[name="authType"]').forEach(p=>p.addEventListener("change",()=>mt(p.value))),m(".tab").forEach(p=>p.addEventListener("click",()=>Jn(p.dataset.tab))),m(".response-tab").forEach(p=>p.addEventListener("click",()=>zn(p.dataset.rtab))),(v=s("#responseBodyViewer"))==null||v.addEventListener("click",p=>{const g=p.target.closest(".json-tree-toggle");g&&wn(s("#responseBody"),g)}),(h=s("#copyResponseBtn"))==null||h.addEventListener("click",async()=>{var g;const p=s("#responseBodyCode");await((g=navigator.clipboard)==null?void 0:g.writeText((p==null?void 0:p.textContent)||""))}),(L=s("#responseFullscreenBtn"))==null||L.addEventListener("click",()=>{s("#responseSection").classList.toggle("fullscreen")}),(T=s("#loopBtn"))==null||T.addEventListener("click",Ct),window.addEventListener("beforeunload",()=>{X(S)&&b.length&&Z()})}function Jn(e){m(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===e)),m(".tab-content").forEach(t=>t.classList.toggle("active",t.id===`${e}-tab`))}function zn(e){m(".response-tab").forEach(t=>t.classList.toggle("active",t.dataset.rtab===e)),m(".response-tab-content").forEach(t=>t.classList.toggle("active",t.id===`response-${e}-tab`))}function Ct(){const e=s("#loopControls");if(te){clearInterval(te),te=null,e.hidden=!0,s("#loopStatus").textContent="";return}e.hidden=!1;const t=Math.max(100,Number(s("#loopInterval").value||1e3));D=Number(s("#loopCount").value||0),te=setInterval(async()=>{D>0&&(D-=1,D===0&&Ct()),s("#loopStatus").textContent=D>0?`${D} remaining`:"Running",await St()},t)}function Ie(){const e=s("#historyList");e&&(e.innerHTML=B.length?B.map(t=>`<button class="history-item" type="button">${f(t.method)} ${f(t.url)} <span>${f(String(t.status||""))}</span></button>`).join(""):'<p class="empty-state">No history yet.</p>')}function xt(){const e=s("#envVarsList");if(!e)return;const t=Object.entries(A);e.innerHTML="",t.forEach(([n,a])=>Se(n,a)),t.length||Se()}function Se(e="",t=""){const n=document.createElement("div");n.className="key-value-row env-row",n.append(W("env-key","key",e),W("env-val","value",t));const a=document.createElement("button");a.className="btn btn-icon",a.type="button",a.textContent="×",a.addEventListener("click",()=>{n.remove(),Ve()}),n.append(a),n.querySelectorAll("input").forEach(r=>r.addEventListener("input",Ve)),s("#envVarsList").append(n)}function Ve(){A=m("#envVarsList .env-row").reduce((e,t)=>{const n=t.querySelector(".env-key").value.trim();return n&&(e[n]=t.querySelector(".env-val").value),e},{}),Wt(A,S.currentUser)}function Wn(){var e,t,n;(e=s("#openEnvVarsModalBtn"))==null||e.addEventListener("click",()=>V("envVarsModal")),(t=s("#envVarsModalClose"))==null||t.addEventListener("click",()=>x("envVarsModal")),(n=s("#addEnvVarBtn"))==null||n.addEventListener("click",()=>Se())}function Gn(){var e,t,n,a;m(".sidebar-tab, .category-tab[data-target]").forEach(r=>{r.addEventListener("click",()=>{m(".sidebar-tabs .category-tab").forEach(o=>o.classList.toggle("active",o===r)),m(".sidebar-panel").forEach(o=>o.classList.toggle("active",o.id===r.dataset.target))})}),(e=s("#sidebarToggleBtn"))==null||e.addEventListener("click",()=>s("#sidebar").classList.add("is-open")),(t=s("#sidebarCloseBtn"))==null||t.addEventListener("click",()=>s("#sidebar").classList.remove("is-open")),(n=s("#rightSidebarToggleBtn"))==null||n.addEventListener("click",()=>s("#rightSidebar").classList.add("is-open")),(a=s("#rightSidebarCloseBtn"))==null||a.addEventListener("click",()=>s("#rightSidebar").classList.remove("is-open"))}function Vn(){on({shell:s("#appContainer"),sidebarHandle:s("#sidebarResizeHandle"),toolsHandle:s("#toolsResizeHandle"),responseHandle:s("#responseResizeHandle")})}function Kn(){var t,n,a,r,o,i,l;const e={setMethod:d=>{s("#methodSelect").value=d},setUrl:d=>{s("#urlInput").value=d},syncParamsFromUrl:_e,clearHeaders:()=>{s("#headersContainer").innerHTML=""},addHeaderRow:ce,ensureHeaderRow:vt,setBodyType:Be,setBodyContent:d=>{s("#bodyContent").value=d||""},clearFormData:()=>{s("#formDataRows").innerHTML=""},addFormDataRow:oe};(t=s("#importBtn"))==null||t.addEventListener("click",()=>V("importModal")),(n=s("#modalClose"))==null||n.addEventListener("click",()=>x("importModal")),(a=s("#exampleCurlBtn"))==null||a.addEventListener("click",()=>{s("#importInput").value=`curl -X POST https://httpbin.org/post -H 'Content-Type: application/json' --data '{"hello":"world"}'`}),m(".import-tab").forEach(d=>{d.addEventListener("click",()=>{m(".import-tab").forEach(c=>c.classList.toggle("active",c===d)),m(".import-panel").forEach(c=>c.classList.toggle("active",c.id===`import-${d.dataset.importTab}-panel`))})}),(r=s("#browseFileBtn"))==null||r.addEventListener("click",()=>s("#importFileInput").click()),(o=s("#importFileInput"))==null||o.addEventListener("change",async d=>{var y;const c=(y=d.target.files)==null?void 0:y[0];c&&(s("#selectedFileName").textContent=c.name,s("#importInput").value=await c.text())}),(i=s("#importConfirmBtn"))==null||i.addEventListener("click",async()=>{const d=s("#importInput").value.trim();if(d)try{let c;if(d.startsWith("curl")){try{c=await C.importData({type:"curl",data:d})}catch{c=Oe(d)}Ne(c,e)}else await C.importData({type:"postman",data:JSON.parse(d)}),await N();x("importModal")}catch(c){alert(`Import failed: ${c.message}`)}}),(l=s("#urlInput"))==null||l.addEventListener("paste",d=>{var u;const c=((u=d.clipboardData)==null?void 0:u.getData("text"))||"";if(!c.trim().startsWith("curl"))return;d.preventDefault();const y=Ce(Oe(c));Ne(y,e)})}function Xn(){const e=Me(),t=ot(e,F),n=Object.entries(t.headers||{}).map(([o,i])=>`-H ${JSON.stringify(`${o}: ${i}`)}`),a=t.body?` --data ${JSON.stringify(t.body)}`:"",r=["curl","-X",t.method,...n,JSON.stringify(t.url)].join(" ")+a;s("#sidebarCurlOutput").value=r}function Qn(){var e,t,n,a;(e=s("#generateSidebarCurlBtn"))==null||e.addEventListener("click",Xn),(t=s("#copySidebarCurlBtn"))==null||t.addEventListener("click",async()=>{var r;return(r=navigator.clipboard)==null?void 0:r.writeText(s("#sidebarCurlOutput").value)}),(n=s("#saveInstanceBtn"))==null||n.addEventListener("click",Ke),(a=s("#saveResponseSnapshotBtn"))==null||a.addEventListener("click",Ke)}function Ke(){if(!K){s("#responseSnapshotFeedback").textContent="Send a response before saving a snapshot.";return}const e=document.createElement("button");e.className="snapshot-list-item",e.type="button",e.textContent=`${K.status||0} ${new Date().toLocaleTimeString()}`,e.addEventListener("click",()=>wt(K)),s("#snapshotList").prepend(e),s("#responseSnapshotFeedback").textContent="Snapshot saved."}function Yn(){document.addEventListener("click",e=>{var a;const t=e.target.closest("[data-close-modal]");t&&x(t.dataset.closeModal);const n=(a=e.target.classList)!=null&&a.contains("modal")?e.target:null;n&&x(n.id)}),document.addEventListener("keydown",e=>{e.key==="Escape"&&m(".modal.active").forEach(t=>x(t.id))})}function Zn(){En(),Vn(),Bn(),Nn(),Dn(),Wn(),Gn(),Kn(),Qn(),Yn(),Tn()}document.querySelector("#root").innerHTML=Ut();Zn();
