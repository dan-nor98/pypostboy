import{f as Ie,b as ce,l as xt,s as ue,c as Lt,a as Et,d as x,e as X,i as Tt,r as kt,g as qt,h as Ke,u as C}from"./user-BtTRhfsf.js";function Rt(){return`
    <main id="loginScreen" class="login-screen" aria-labelledby="loginTitle">
      <section class="login-card">
        <div class="login-branding" aria-hidden="true">PB</div>
        <p class="login-kicker">API Testing Client</p>
        <h1 id="loginTitle">PostBoy</h1>
        <p class="login-subtitle">Sign in to sync your workspace, create an account, or continue with a temporary guest workspace.</p>
        <div class="account-status login-status" id="authStatus" role="status">Checking account...</div>
        <div class="login-fields">
          ${Ie({id:"authUsername",label:"Username",autocomplete:"username",placeholder:"Username",className:"compact-field"})}
          ${Ie({id:"authPassword",label:"Password",type:"password",autocomplete:"current-password",placeholder:"Password",className:"compact-field"})}
        </div>
        <div class="login-actions">
          ${ce({id:"loginBtn",variant:"primary",label:"Log in"})}
          ${ce({id:"registerBtn",variant:"secondary",label:"Create account"})}
          ${xt({id:"forgotPasswordBtn",className:"login-link-button",href:"/recover.html",label:"Forgot password?"})}
          ${ce({id:"guestLoginBtn",variant:"ghost",label:"Continue as guest"})}
        </div>
        <p class="login-warning" role="note">Guest mode stores request workspace data in this browser session. Avoid entering secrets; sensitive headers and auth fields are redacted before storage.</p>
      </section>
    </main>
  `}function _t(){return`
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
  `}const Bt=["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"].map(e=>({label:e,value:e,selected:e==="GET"}));function Mt(){return`
    <section class="request-card" id="requestBar" aria-label="Request builder">
      <div class="url-bar">
        ${ue({id:"methodSelect",label:"Method",options:Bt,className:"method-field"})}
        <label class="field url-field" for="urlInput">
          <span>URL</span>
          <input type="text" id="urlInput" class="form-input" placeholder="Enter request URL or paste cURL command...">
        </label>
        <button class="btn btn-primary send-button" id="sendBtn" type="button">Send</button>
      </div>
      <div class="request-options" id="requestBarSecondary">
        ${ue({id:"executionModeSelect",label:"Run via",options:[{value:"client",label:"Client side"},{value:"server",label:"Server proxy",selected:!0},{value:"desktop-native",label:"Desktop native"}]})}
        ${ue({id:"clientCredentialsSelect",label:"Credentials",options:[{value:"omit",label:"omit"},{value:"same-origin",label:"same-origin"},{value:"include",label:"include"}]})}
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
  `}function It(){return`
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
  `}function $t(){return`
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
  `}function At(){return`
    <div class="app-shell" id="appContainer" hidden>
      ${_t()}
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
          ${Mt()}
        </div>
        <div class="resize-handle resize-handle-horizontal" id="responseResizeHandle" role="separator" aria-orientation="horizontal" aria-label="Resize response panel" tabindex="0"></div>
        ${It()}
      </main>
      <div class="resize-handle resize-handle-vertical" id="toolsResizeHandle" role="separator" aria-orientation="vertical" aria-label="Resize tools sidebar" tabindex="0"></div>
      ${$t()}
    </div>
  `}function Nt(){return`
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
  `}function Ot(){return`
    ${Rt()}
    ${At()}
    ${Nt()}
    <div class="loading-overlay" id="loadingOverlay" hidden>
      <div class="spinner"></div>
    </div>
  `}const Ut="postboy_env",Pt=Ut+"_user_",Ht="postboy_history",jt=Ht+"_user_";function Ft(e){return!e||e.is_guest===!0}function Xe(e,t){return Ft(t)||t.id===void 0||t.id===null?null:e+String(t.id)}function Ye(e){return Xe(Pt,e)}function Qe(e){return Xe(jt,e)}function Ze(e,t){try{return JSON.parse(e||JSON.stringify(t))}catch{return t}}function Dt(e){var t=Ye(e);return t?Ze(localStorage.getItem(t),{}):{}}function Jt(e,t){var n=Ye(t);n&&localStorage.setItem(n,JSON.stringify(e))}function Vt(e){var t=Qe(e);return t?Ze(localStorage.getItem(t),[]):[]}function zt(e,t){var n=Qe(t);n&&localStorage.setItem(n,JSON.stringify(e))}function Wt(e){for(var t=[],n=0;n<e.length;){for(;n<e.length&&/\s/.test(e[n]);)n++;if(n>=e.length)break;if(e[n]==="$"&&e[n+1]==="'"){var a="";for(n+=2;n<e.length;){if(e[n]==="'"){if(n+1<e.length&&e[n+1]==="'"){a+="'",n+=2;continue}n++;break}if(e[n]==="\\"&&n+1<e.length){a+=Gt(e[n+1]),n+=2;continue}a+=e[n],n++}t.push(a)}else if(e[n]==="'"||e[n]==='"'){for(var r=e[n++],o="";n<e.length&&e[n]!==r;)e[n]==="\\"&&n+1<e.length?o+=e[++n]:o+=e[n],n++;n++,t.push(o)}else if(e[n]==="$"&&e[n+1]==="("){var i=1;for(n+=2;n<e.length&&i>0;)e[n]==="("&&i++,e[n]===")"&&i--,n++;t.push("$(...)")}else{for(var l="";n<e.length&&!/\s/.test(e[n]);)l+=e[n++];t.push(l)}}return t}function Gt(e){var t={"'":"'","\\":"\\",a:"\x07",b:"\b",f:"\f",n:`
`,r:"\r",t:"	",v:"\v"};return Object.prototype.hasOwnProperty.call(t,e)?t[e]:"\\"+e}function Se(e){e=e||{};var t={method:String(e.method||"GET").toUpperCase(),url:e.url||"",headers:Array.isArray(e.headers)?e.headers:[],body_type:e.body_type||"none",body_content:e.body_content||"",form_data:Array.isArray(e.form_data)?e.form_data:[]};return t.body_type==="form-urlencoded"&&t.form_data.length===0&&t.body_content&&(t.form_data=Kt(t.body_content)),t}function Kt(e){return String(e).split("&").reduce(function(t,n){if(!n)return t;var a=n.indexOf("=");return a===-1||t.push({key:$e(n.substring(0,a)),value:$e(n.substring(a+1))}),t},[])}function $e(e){var t=String(e).replace(/\+/g," ");try{return decodeURIComponent(t)}catch{return t}}function Ae(e,t){var n=Se(e);return t.setMethod(n.method),t.setUrl(n.url),t.syncParamsFromUrl(),t.clearHeaders(),n.headers.forEach(function(a){t.addHeaderRow(a.key||"",a.value||"")}),t.ensureHeaderRow(),t.setBodyType(n.body_type),t.setBodyContent(n.body_content),t.clearFormData(),n.form_data.forEach(function(a){t.addFormDataRow(a.key||"",a.value||"")}),n}function Ne(e){e=(e||"").replace(/\\\r?\n/g," ").trim();for(var t=Wt(e),n={method:"GET",url:"",headers:[],body_type:"none",body_content:"",form_data:[]},a=!1,r=0;r<t.length;r++){var o=t[r],i;if(o!=="curl"){if(o==="-X"||o==="--request"){n.method=(t[++r]||n.method).toUpperCase(),a=!0;continue}if(o.indexOf("--request=")===0){n.method=o.substring(10).toUpperCase(),a=!0;continue}if(o.indexOf("-X")===0&&o.length>2){n.method=o.substring(2).toUpperCase(),a=!0;continue}if(o==="--url"){n.url=t[++r]||"";continue}if(o.indexOf("--url=")===0){n.url=o.substring(6);continue}if(o==="-H"||o==="--header"){i=t[++r]||"",pe(n.headers,i);continue}if(o.indexOf("--header=")===0){pe(n.headers,o.substring(9));continue}if(o.indexOf("-H")===0&&o.length>2){pe(n.headers,o.substring(2));continue}if(o==="--json"){i=t[++r]||"",Oe(n,i);continue}if(o.indexOf("--json=")===0){Oe(n,o.substring(7));continue}if(["-d","--data","--data-raw","--data-binary","--data-urlencode"].indexOf(o)!==-1){i=t[++r]||"",n.body_content=n.body_content?n.body_content+"&"+i:i,n.body_type=o==="--data-urlencode"?"form-urlencoded":fe(n.body_content,n.headers);continue}if(o.indexOf("--data=")===0||o.indexOf("--data-raw=")===0||o.indexOf("--data-binary=")===0||o.indexOf("--data-urlencode=")===0){i=o.substring(o.indexOf("=")+1),n.body_content=n.body_content?n.body_content+"&"+i:i,n.body_type=o.indexOf("--data-urlencode=")===0?"form-urlencoded":fe(n.body_content,n.headers);continue}if(o.indexOf("-d")===0&&o.length>2){i=o.substring(2),n.body_content=n.body_content?n.body_content+"&"+i:i,n.body_type=fe(n.body_content,n.headers);continue}if(o==="-F"||o==="--form"){be(n.form_data,t[++r]||""),n.body_type="form-data",n.body_content="";continue}if(o.indexOf("--form=")===0){be(n.form_data,o.substring(7)),n.body_type="form-data",n.body_content="";continue}if(o.indexOf("-F")===0&&o.length>2){be(n.form_data,o.substring(2)),n.body_type="form-data",n.body_content="";continue}if(o==="-I"||o==="--head"){n.method="HEAD",a=!0;continue}if(o==="-G"||o==="--get"){n.method="GET",a=!0;continue}o.charAt(0)!=="-"&&!n.url&&(n.url=o)}}return(n.body_content||n.form_data.length)&&n.method==="GET"&&!a&&(n.method="POST"),Se(n)}function pe(e,t){var n=t.indexOf(":");n<=0||e.push({key:t.substring(0,n).trim(),value:t.substring(n+1).trim()})}function Oe(e,t){e.body_content=e.body_content?e.body_content+"&"+t:t,e.body_type="json",Ue(e.headers,"Content-Type","application/json"),Ue(e.headers,"Accept","application/json")}function Ue(e,t,n){var a=t.toLowerCase(),r=e.some(function(o){return(o.key||"").toLowerCase()===a});r||e.push({key:t,value:n})}function be(e,t){var n=t.indexOf("=");n<=0||e.push({key:t.substring(0,n),value:t.substring(n+1)})}function fe(e,t){var n="";if(t.some(function(a){return(a.key||"").toLowerCase()==="content-type"?(n=(a.value||"").toLowerCase(),!0):!1}),n.indexOf("application/json")!==-1)return"json";if(n.indexOf("application/x-www-form-urlencoded")!==-1)return"form-urlencoded";if(n.indexOf("/xml")!==-1||n.indexOf("+xml")!==-1)return"xml";try{return JSON.parse(e),"json"}catch{return/^\s*<[^>]+>/.test(e)?"xml":/^[^=&]+=[^&]*(?:&[^=&]+=[^&]*)*$/.test(e)?"form-urlencoded":"text"}}function Xt(e){return e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB"}function b(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function Ce(e){return typeof e!="string"&&(e=JSON.stringify(e,void 0,2)),e=b(e),e.replace(/(&quot;(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\])*?&quot;(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,function(t){var n="json-number";return/^&quot;/.test(t)?n=/:$/.test(t)?"json-key":"json-string":/true|false/.test(t)?n="json-boolean":/null/.test(t)&&(n="json-null"),'<span class="'+n+'">'+t+"</span>"})}function Yt(e){var t=b(e);return t.replace(/(&lt;\/?)([\w:-]+)([\s\S]*?)(\/?&gt;)/g,function(n,a,r,o,i){return o=o.replace(/([\w:-]+)(=)(\&quot;.*?\&quot;|\&#039;.*?\&#039;|[^\s]+)/g,function(l,d,c,y){return'<span class="syntax-attr-name">'+d+"</span>"+c+'<span class="syntax-attr-value">'+y+"</span>"}),'<span class="syntax-tag">'+a+r+"</span>"+o+'<span class="syntax-tag">'+i+"</span>"})}function Qt(e){return b(e).replace(/^([^:\n]+)(:)(.*)$/gm,function(t,n,a,r){return'<span class="syntax-header-name">'+n+"</span>"+a+'<span class="syntax-header-value">'+r+"</span>"})}function Zt(e){return b(e).replace(/\b(https?:\/\/[^\s<]+)\b/g,'<span class="syntax-url">$1</span>').replace(/\b([A-Z][A-Z0-9_-]{2,})\b/g,'<span class="syntax-keyword">$1</span>').replace(/\b(-?\d+(?:\.\d+)?)\b/g,'<span class="json-number">$1</span>')}function en(e,t){var n=String(t||"").toLowerCase(),a=String(e||"").trim();return/json|javascript|problem\+json|ld\+json/.test(n)?"json":/xml|html|svg|xhtml|rss|atom/.test(n)?"markup":/http|message\/rfc822/.test(n)?"headers":/text\/plain|text\/csv|application\/x-www-form-urlencoded/.test(n)||!a?"text":/^(HTTP\/\d(?:\.\d)? \d{3}|[A-Za-z0-9-]+\s*:)/.test(a)?"headers":/^</.test(a)&&/>\s*$/.test(a)?"markup":/^[{[]/.test(a)?"json":"text"}function tn(e,t){return t==="json"?Ce(e):t==="markup"?Yt(e):t==="headers"?Qt(e):Zt(e)}const P=(e,t,n)=>Math.min(n,Math.max(t,e));function H(e,t){const n=Number(e);return Number.isFinite(n)?n:t}function nn(e,t){try{return{...t,...JSON.parse(localStorage.getItem(e)||"{}")}}catch{return{...t}}}function Pe(e,t){try{localStorage.setItem(e,JSON.stringify(t))}catch{}}function an({shell:e,sidebarHandle:t,toolsHandle:n,responseHandle:a,storageKey:r="postboy_panel_layout"}={}){if(!e)return;const o={sidebarWidth:320,toolsWidth:320,responseHeight:360},i={sidebarMin:240,sidebarMax:460,toolsMin:260,toolsMax:460,responseMin:240,responseMax:620},l=nn(r,o);function d(){l.sidebarWidth=P(H(l.sidebarWidth,o.sidebarWidth),i.sidebarMin,i.sidebarMax),l.toolsWidth=P(H(l.toolsWidth,o.toolsWidth),i.toolsMin,i.toolsMax),l.responseHeight=P(H(l.responseHeight,o.responseHeight),i.responseMin,i.responseMax),e.style.setProperty("--sidebar-width",`${l.sidebarWidth}px`),e.style.setProperty("--tools-width",`${l.toolsWidth}px`),e.style.setProperty("--response-height",`${l.responseHeight}px`),t==null||t.setAttribute("aria-valuenow",String(l.sidebarWidth)),n==null||n.setAttribute("aria-valuenow",String(l.toolsWidth)),a==null||a.setAttribute("aria-valuenow",String(l.responseHeight))}function c(u,v){u&&u.addEventListener("pointerdown",h=>{if(window.matchMedia("(max-width: 1180px)").matches&&u!==a)return;h.preventDefault(),u.setPointerCapture(h.pointerId),e.classList.add("is-resizing");const E={x:h.clientX,y:h.clientY,sidebarWidth:H(l.sidebarWidth,o.sidebarWidth),toolsWidth:H(l.toolsWidth,o.toolsWidth),responseHeight:H(l.responseHeight,o.responseHeight)};function f(B){v(B,E),d()}function m(){e.classList.remove("is-resizing"),Pe(r,l),window.removeEventListener("pointermove",f),window.removeEventListener("pointerup",m),window.removeEventListener("pointercancel",m)}window.addEventListener("pointermove",f),window.addEventListener("pointerup",m),window.addEventListener("pointercancel",m)})}c(t,(u,v)=>{l.sidebarWidth=P(v.sidebarWidth+u.clientX-v.x,i.sidebarMin,i.sidebarMax)}),c(n,(u,v)=>{l.toolsWidth=P(v.toolsWidth-(u.clientX-v.x),i.toolsMin,i.toolsMax)}),c(a,(u,v)=>{l.responseHeight=P(v.responseHeight-(u.clientY-v.y),i.responseMin,Math.min(i.responseMax,window.innerHeight-260))});function y(u,v,h,E,f=1){u&&(u.setAttribute("aria-valuemin",String(h)),u.setAttribute("aria-valuemax",String(E)),u.addEventListener("keydown",m=>{const B=m.shiftKey?40:16;if(m.key!=="ArrowLeft"&&m.key!=="ArrowRight"&&m.key!=="ArrowUp"&&m.key!=="ArrowDown")return;m.preventDefault();const Ct=m.key==="ArrowRight"||m.key==="ArrowDown";l[v]=P(H(l[v],o[v])+(Ct?B:-B)*f,h,E),d(),Pe(r,l)}))}y(t,"sidebarWidth",i.sidebarMin,i.sidebarMax),y(n,"toolsWidth",i.toolsMin,i.toolsMax,-1),y(a,"responseHeight",i.responseMin,i.responseMax,-1),d()}function sn(e,t){if(!e||!t)return"";var n=t.toLowerCase();if(typeof e=="string"){for(var a=e.split(/\r?\n/),r=0;r<a.length;r++){var o=a[r].indexOf(":");if(o>-1&&a[r].slice(0,o).trim().toLowerCase()===n)return a[r].slice(o+1).trim()}return""}for(var i=Object.keys(e),l=0;l<i.length;l++)if(i[l].toLowerCase()===n)return e[i[l]];return""}function oe(e){return e?e.querySelector("code")||e:null}function on(e){return!e||!e.parentElement?null:e.parentElement.querySelector(".response-line-numbers")}function He(e){return e===""?1:e.split(`
`).length}function rn(e,t){for(var n=e.parentElement;n&&n!==t;){if(n.classList&&n.classList.contains("json-tree-children")){var a=n.parentElement;if(a&&a.classList&&a.classList.contains("is-collapsed"))return!0}n=n.parentElement}return!1}function ln(e){if(!e.querySelectorAll)return[];var t=e.querySelectorAll(".json-tree-line");if(!t.length)return[];for(var n=[],a=0;a<t.length;a++)rn(t[a],e)||n.push(a+1);return n}function re(e){var t=oe(e),n=on(e);if(!(!t||!n)){var a=!!(t.classList&&t.classList.contains&&t.classList.contains("json-tree")||typeof t.innerHTML=="string"&&t.innerHTML.indexOf("json-tree-line")>-1),r=a?ln(t):[];if(!r.length)for(var o=He(a?fn(t)||t.textContent||"":t.textContent||""),i=1;i<=o;i++)r.push(i);for(var l=[],d=0;d<r.length;d++)l.push("<span>"+r[d]+"</span>");n.innerHTML=l.join(`<span class="line-number-break">
</span>`)}}function dn(e){return typeof e=="object"&&e!==null?{text:JSON.stringify(e,null,2),format:"json"}:{text:String(e||""),format:""}}function xe(e){return e!==null&&typeof e=="object"}function cn(e){return Object.prototype.toString.call(e)==="[object Array]"}function je(e){return e==null?"":'<span class="json-key">'+b(JSON.stringify(String(e)))+":</span> "}function un(e){return Ce(JSON.stringify(e))}function pn(e,t){var n=e==="array"?"Toggle array with ":"Toggle object with ";return n+=t+(t===1?" child":" children"),'<button class="json-tree-toggle" type="button" aria-expanded="true" aria-label="'+b(n)+'">▾</button>'}function et(e,t,n,a){var r=a?",":"",o=' style="--json-depth: '+n+'"';if(!xe(e))return'<div class="json-tree-line"'+o+">"+je(t)+un(e)+r+"</div>";var i=cn(e),l=i?e.map(function(m,B){return B}):Object.keys(e),d=l.length,c=i?"[":"{",y=i?"]":"}",u=i?"[…]":"{…}",v=i?"array":"object",h='<div class="json-tree-node" data-json-type="'+v+'">';h+='<div class="json-tree-line"'+o+">",d?h+=pn(v,d):h+='<span class="json-tree-toggle-spacer"></span>',h+=je(t),h+='<span class="json-tree-open">'+c+"</span>",h+='<span class="json-tree-summary" aria-hidden="true">'+u+r+"</span>",h+="</div>",h+='<div class="json-tree-children">';for(var E=0;E<l.length;E++){var f=l[E];h+=et(e[f],i?null:f,n+1,E<l.length-1)}return h+='<div class="json-tree-line json-tree-close"'+o+">"+y+r+"</div>",h+="</div>",h+="</div>",h}function bn(e){return xe(e)?et(e,null,0,!1):Ce(JSON.stringify(e,null,2))}function Fe(e,t){e&&(e.dataset?e.dataset.rawBody=t:e.__rawBody=t)}function fn(e){return e?e.dataset&&typeof e.dataset.rawBody=="string"?e.dataset.rawBody:typeof e.__rawBody=="string"?e.__rawBody:"":""}function Le(e,t,n){var a=String(n||"");Fe(e,a),t&&t!==e&&Fe(t,a)}function Ee(e,t){e.classList&&e.classList.toggle&&e.classList.toggle("json-tree",t)}function De(e,t,n){var a=JSON.stringify(n,null,2);Le(e,t,a),Ee(t,xe(n)),t.innerHTML=bn(n),re(e)}function yn(e,t){if(!(!e||!t)){var n=oe(e),a=t.closest(".json-tree-node");if(!(!n||!a||!n.contains(a))){var r=!a.classList.contains("is-collapsed");a.classList.toggle("is-collapsed",r),t.setAttribute("aria-expanded",r?"false":"true"),t.textContent=r?"▸":"▾",re(e)}}}function tt(e,t,n){if(e){var a=oe(e);if(a){a.classList&&a.classList.remove&&a.classList.remove("response-issue");var r=dn(t);if(r.format==="json"){De(e,a,JSON.parse(r.text));return}var o=sn(n,"content-type"),i=en(r.text,o);if(i==="json")try{De(e,a,JSON.parse(r.text));return}catch{}Le(e,a,r.text),Ee(a,!1),a.innerHTML=tn(r.text,i),re(e)}}}function Je(e,t){return'<div class="response-issue-row"><span class="response-issue-row-label">'+b(e)+'</span><span class="response-issue-row-value">'+b(t||"Not available")+"</span></div>"}function Ve(e,t){if(!(!e||!t)){var n=oe(e);if(n){var a=t.variant||"error",r=t.icon||"⛔",o=t.title||"Request failed",i=t.message||"The request could not be completed.",l=a==="warning"?"Warning":a==="info"?"Info":"Error",d=t.likelyCause||"No likely cause was provided.",c=t.suggestedFix||"Retry the request and verify your settings.",y=t.detailsText||"",u=t.cta||null;Le(e,n,y),Ee(n,!1),n.classList&&n.classList.add&&n.classList.add("response-issue"),n.innerHTML='<section class="response-issue-card response-issue-'+b(a)+'" role="alert" aria-live="polite"><header class="response-issue-header"><span class="response-issue-icon" aria-hidden="true">'+b(r)+'</span><h4 class="response-issue-title">'+b(o)+'</h4><span class="response-issue-severity" aria-label="Severity">'+b(l)+'</span></header><p class="response-issue-message">'+b(i)+"</p>"+Je("Likely cause",d)+Je("Suggested fix",c)+(u&&u.label?'<button class="response-issue-cta btn-secondary" type="button" data-action="'+b(u.action||"")+'">'+b(u.label)+"</button>":"")+'<details class="response-issue-details"><summary>Details</summary><pre>'+b(y)+"</pre></details></section>",re(e)}}}const T=()=>({name:"Untitled Request",method:"GET",url:"",params:[],headers:[],body_type:"none",body_content:"",form_data:[],auth_type:"none",auth_config:{}});let F=[],k=null,W=null,S=T(),p=[],A=null,N={},M=[],K=null,J=null,j=null,ee=null,D=0,Y=1,te=null,me=!1,ae="";const ne=new Set,nt="postboy_request_tabs",vn=`${nt}_user_`,hn=`${nt}_guest`,s=e=>document.querySelector(e),g=e=>Array.from(document.querySelectorAll(e));function G(e){const t=document.getElementById(e);t&&(t.classList.add("active","show"),t.setAttribute("aria-hidden","false"))}function L(e){const t=document.getElementById(e);t&&(t.classList.remove("active","show"),t.setAttribute("aria-hidden","true"))}function V(e,t,n=!1){e&&(e.textContent=t||"",e.classList.toggle("auth-error",n))}function w(e){return String(e||"").replace(/\{\{\s*([^}]+?)\s*\}\}/g,(t,n)=>{const a=String(n||"").trim();return Object.prototype.hasOwnProperty.call(N,a)?N[a]:""})}function at(){if(Ke(C))return{storage:sessionStorage,key:hn};const e=C.currentUser;return e&&e.id!==void 0&&e.id!==null&&e.is_guest!==!0?{storage:localStorage,key:vn+String(e.id)}:null}function I(){const e=at();if(e)try{e.storage.setItem(e.key,JSON.stringify({tabs:p,activeTabId:A,nextTabNumber:Y}))}catch{}}function ye(){te&&clearTimeout(te),te=setTimeout(()=>{te=null,!(!X(C)||!p.length)&&Z()},150)}function mn(){const e=at();if(!e)return!1;try{const t=JSON.parse(e.storage.getItem(e.key)||"null");return!t||!Array.isArray(t.tabs)||!t.tabs.length?!1:(p=t.tabs.map((n,a)=>({id:n.id||`restored_tab_${a+1}`,requestId:n.requestId??null,collectionId:n.collectionId??null,title:n.title||`Unsaved Request ${a+1}`,state:{...T(),...n.state||{}}})),A=p.some(n=>n.id===t.activeTabId)?t.activeTabId:p[0].id,Y=Number.isFinite(t.nextTabNumber)&&t.nextTabNumber>0?t.nextTabNumber:p.length+1,q(Q()),!0)}catch{return!1}}function gn({resetStorageBackedState:e=!0}={}){M=e?[]:M,N=e?{}:N,F=[],k=null,W=null,K=null,S=T(),p=[],A=null,Y=1,$(),Me(),St(),_(S),Un(),R()}async function Te(){X(C)&&(N=Dt(C.currentUser),M=Vt(C.currentUser),await O(),mn()||U(),q(Q()),_(S),R(),St(),Me())}function ge(e){s("#loginScreen").hidden=e,s("#appContainer").hidden=!e}function ke(){if(X(C)){const e=Ke(C)?"Guest workspace":C.currentUser.username;V(s("#appAuthStatus"),`Signed in as ${e}`),ge(!0)}else V(s("#authStatus"),C.loading?"Checking account...":"Sign in or continue as guest."),ge(!1)}async function ve(e){const t=s("#authUsername").value.trim(),n=s("#authPassword").value;if(!t||!n){V(s("#authStatus"),"Enter a username and password.",!0);return}try{const a=e==="register"?await kt({username:t,password:n}):await qt({username:t,password:n});ke(),await Te(),e==="register"&&a.recovery_key&&(s("#registerRecoveryKey").value=a.recovery_key,s("#registerRecoveryAcknowledge").checked=!1,s("#registerRecoveryCloseBtn").disabled=!0,G("registerSuccessModal"))}catch(a){V(s("#authStatus"),a.message,!0)}}async function wn(){await Tt(),ke(),X(C)&&await Te()}function Sn(){var e,t,n,a,r,o,i;(e=s("#loginBtn"))==null||e.addEventListener("click",()=>ve("login")),(t=s("#registerBtn"))==null||t.addEventListener("click",()=>ve("register")),(n=s("#guestLoginBtn"))==null||n.addEventListener("click",async()=>{await Lt(),ke(),await Te()}),(a=s("#logoutBtn"))==null||a.addEventListener("click",async()=>{try{await Et()}finally{gn(),ge(!1),V(s("#authStatus"),"Signed out."),s("#authPassword").value=""}}),(r=s("#registerRecoveryAcknowledge"))==null||r.addEventListener("change",l=>{s("#registerRecoveryCloseBtn").disabled=!l.target.checked}),(o=s("#registerRecoveryCloseBtn"))==null||o.addEventListener("click",()=>L("registerSuccessModal")),(i=s("#copyRecoveryKeyBtn"))==null||i.addEventListener("click",async()=>{var l;await((l=navigator.clipboard)==null?void 0:l.writeText(s("#registerRecoveryKey").value))}),[s("#authUsername"),s("#authPassword")].forEach(l=>{l==null||l.addEventListener("keydown",d=>{d.key==="Enter"&&ve("login")})})}async function O(){me=!0,ae="",$();try{F=await x.getCollections()}catch(e){F=[],ae=e.message||"Collections could not be loaded.",V(s("#appAuthStatus"),e.message,!0)}finally{me=!1}$()}function st(e=[],t=[]){return e.forEach(n=>{t.push(n),st(n.children||[],t)}),t}function ot(e,t=F){for(const n of t){if(String(n.id)===String(e))return n;const a=ot(e,n.children||[]);if(a)return a}return null}function $(){const e=s("#collectionList");if(e){if(me){e.innerHTML='<p class="empty-state">Loading collections...</p>';return}if(ae){e.innerHTML=`<div class="panel-state panel-state-error"><strong>Collections unavailable</strong><span>${b(ae)}</span></div>`;return}if(!F.length){e.innerHTML='<div class="panel-state"><strong>No collections yet</strong><span>Create a collection or import a Postman collection to start organizing requests.</span></div>';return}e.innerHTML=F.map(t=>rt(t,0)).join("")}}function rt(e,t=0){const n=ne.has(String(e.id)),a=(e.children||[]).map(i=>rt(i,t+1)).join(""),r=(e.requests||[]).map(i=>`
    <button class="request-item ${String(i.id)===String(W)?"active":""}" type="button" data-id="${i.id}" data-collection-id="${e.id}" style="--tree-depth: ${t+1}">
      <span class="request-method">${b(i.method||"GET")}</span>
      <span class="request-item-name">${b(i.name||"Untitled Request")}</span>
    </button>
  `).join(""),o=(e.children||[]).length+(e.requests||[]).length;return`
    <div class="collection-folder ${String(e.id)===String(k)?"active":""}" data-id="${e.id}">
      <button class="folder-header" type="button" data-id="${e.id}" aria-expanded="${String(!n)}" style="--tree-depth: ${t}">
        <span class="folder-arrow" aria-hidden="true">${n?">":"v"}</span>
        <span class="folder-icon" aria-hidden="true">[]</span>
        <span class="folder-name">${b(e.name)}</span>
        <span class="folder-count">${o}</span>
      </button>
      <div class="folder-items" data-parent-id="${e.id}" ${n?"hidden":""}>
        ${a}
        ${r}
      </div>
    </div>
  `}function Cn(e){const t=e.trim().toLowerCase();g("#collectionList .collection-folder, #collectionList .request-item").forEach(n=>{n.hidden=!1}),t&&(g("#collectionList .request-item").forEach(n=>{n.hidden=!n.textContent.toLowerCase().includes(t)}),g("#collectionList .collection-folder").forEach(n=>{var o;const a=(o=n.querySelector(".folder-name"))==null?void 0:o.textContent.toLowerCase().includes(t),r=Array.from(n.querySelectorAll(".request-item:not([hidden]), .collection-folder:not([hidden])")).some(i=>i!==n);n.hidden=!(a||r)}))}function it(){return`tab_${Date.now()}_${Y++}`}function ie(){return{id:it(),requestId:null,collectionId:k,title:`Unsaved Request ${Y-1}`,state:T()}}function U(){if(!p.length){const e=ie();p=[e],A=e.id,I()}}function Q(){return U(),p.find(e=>e.id===A)||p[0]}function q(e){A=e.id,W=e.requestId,k=e.collectionId||k,S={...T(),...e.state||{}}}function Z(){const e=Q();e&&(e.state=Be(),e.requestId=W,e.collectionId=k,e.title=e.requestId?e.state.name||S.name||"Untitled Request":e.title||"Unsaved Request",S={...T(),...e.state},I())}function lt(e){if(U(),A===e)return;Z();const t=p.find(n=>n.id===e);t&&(q(t),_(S),R(),$(),I())}function xn(){U(),Z();const e=ie();p.push(e),q(e),_(S),R(),$(),I()}function Ln(e){if(U(),p.length===1){p=[ie()],q(p[0]),_(S),R(),$(),I();return}const t=p.findIndex(a=>a.id===e);if(t===-1)return;const n=A===e;if(p.splice(t,1),n){const a=p[Math.max(0,t-1)]||p[0];q(a),_(S)}R(),$(),I()}async function En(e){U();const t=p.find(r=>String(r.requestId)===String(e));if(t){lt(t.id);return}const n=await x.getRequest(e);Z();const a={id:it(),requestId:n.id,collectionId:n.collection_id,title:n.name||"Untitled Request",state:{...T(),...n,body_type:n.body_type||(n.body?"text":"none"),body_content:n.body_content??n.body??"",form_data:n.form_data||[],auth_config:n.auth_config||{}}};p.push(a),q(a),_(S),$(),R(),I()}function R(){U();const e=s("#requestTabs");e&&(e.innerHTML=p.map(t=>{var o;const n=t.requestId?((o=t.state)==null?void 0:o.name)||t.title||"Untitled Request":t.title||"Unsaved Request",a=t.id===A,r=p.length>1;return`
      <div class="request-tab-item${a?" active":""}" data-tab-id="${b(t.id)}">
        <button class="request-tab-trigger" type="button" data-tab-id="${b(t.id)}">${b(n)}</button>
        ${r?`<button class="request-tab-close" type="button" data-close-tab="${b(t.id)}" aria-label="Close ${b(n)}">×</button>`:""}
      </div>
    `}).join(""))}function Tn(){var e,t,n,a,r,o,i,l,d;(e=s("#newCollectionBtn"))==null||e.addEventListener("click",()=>{s("#collectionModalTitle").textContent="New Collection",s("#editCollectionId").value="",s("#newColName").value="",s("#newColDesc").value="",G("newCollectionModal")}),(t=s("#newColModalClose"))==null||t.addEventListener("click",()=>L("newCollectionModal")),(n=s("#newColCancelBtn"))==null||n.addEventListener("click",()=>L("newCollectionModal")),(a=s("#newColSaveBtn"))==null||a.addEventListener("click",kn),(r=s("#collectionSearchInput"))==null||r.addEventListener("input",c=>Cn(c.target.value)),(o=s("#collectionList"))==null||o.addEventListener("click",c=>{const y=c.target.closest(".request-item");if(y){En(y.dataset.id);return}const u=c.target.closest(".folder-header");if(u){if(k=u.dataset.id,c.target.closest(".folder-arrow")){const v=String(k);ne.has(v)?ne.delete(v):ne.add(v)}$()}}),(i=s("#collectionList"))==null||i.addEventListener("contextmenu",c=>{const y=c.target.closest(".folder-header"),u=c.target.closest(".request-item");if(!y&&!u)return;c.preventDefault(),J=(y==null?void 0:y.dataset.id)||(u==null?void 0:u.dataset.collectionId)||null,j=(u==null?void 0:u.dataset.id)||null;const v=s(u?"#requestContextMenu":"#contextMenu");qn(v,c.clientX,c.clientY)}),(l=s("#contextMenu"))==null||l.addEventListener("click",Rn),(d=s("#requestContextMenu"))==null||d.addEventListener("click",_n),document.addEventListener("click",c=>{c.target.closest(".context-menu")||le()})}async function kn(){const e=s("#newColName").value.trim();if(!e)return;const t=s("#editCollectionId").value;t?await x.updateCollection(t,{name:e,description:s("#newColDesc").value}):await x.createCollection({name:e,description:s("#newColDesc").value}),L("newCollectionModal"),await O()}function qn(e,t,n){le(),e.style.left=`${t}px`,e.style.top=`${n}px`,e.classList.add("active")}function le(){g(".context-menu").forEach(e=>e.classList.remove("active"))}async function Rn(e){var n;const t=(n=e.target.closest("[data-action]"))==null?void 0:n.dataset.action;if(!(!t||!J))if(le(),t==="add-request")dt({collectionId:J});else if(t==="edit"){const a=ot(J);if(!a)return;s("#collectionModalTitle").textContent="Rename Collection",s("#editCollectionId").value=a.id,s("#newColName").value=a.name||"",s("#newColDesc").value=a.description||"",G("newCollectionModal")}else t==="duplicate"?(await x.duplicateCollection(J),await O()):t==="delete"&&confirm("Delete this collection and its requests?")&&(await x.deleteCollection(J),await O())}async function _n(e){var n;const t=(n=e.target.closest("[data-action]"))==null?void 0:n.dataset.action;if(!(!t||!j))if(le(),t==="edit"){const a=await x.getRequest(j);dt({collectionId:a.collection_id,request:a})}else t==="duplicate"?(await x.duplicateRequest(j),await O()):t==="delete"&&confirm("Delete this request?")&&(await x.deleteRequest(j),p=p.filter(a=>String(a.requestId)!==String(j)),p.length?String(W)===String(j)&&(q(p[0]),_(S)):(p=[ie()],q(p[0]),_(S)),R(),I(),await O())}function dt({collectionId:e,request:t=null}){s("#requestModalTitle").textContent=t?"Rename Request":"New Request",s("#editRequestId").value=(t==null?void 0:t.id)||"",s("#editRequestCollectionId").value=e||k||"",s("#reqNameInput").value=(t==null?void 0:t.name)||"",G("requestModal"),s("#reqNameInput").focus()}function Bn(){var e,t,n;(e=s("#reqModalClose"))==null||e.addEventListener("click",()=>L("requestModal")),(t=s("#reqCancelBtn"))==null||t.addEventListener("click",()=>L("requestModal")),(n=s("#reqSaveBtn"))==null||n.addEventListener("click",async()=>{var i;const a=s("#reqNameInput").value.trim(),r=s("#editRequestId").value,o=s("#editRequestCollectionId").value||k||((i=st(F)[0])==null?void 0:i.id);if(!(!a||!o)){if(r)await x.updateRequest(r,{name:a}),p.forEach(l=>{String(l.requestId)===String(r)&&(l.title=a,l.state={...T(),...l.state||{},name:a})});else{const l=await x.createRequest({...T(),name:a,collection_id:Number(o)}),d=Q();d&&(d.requestId=l.id,d.collectionId=Number(o),d.title=a,d.state={...T(),...d.state||{},name:a,collection_id:Number(o)}),W=l.id}I(),L("requestModal"),await O(),R()}})}function z(e,t,n=""){const a=document.createElement("input");return a.type="text",a.className=`form-input ${e}`,a.placeholder=t,a.value=n||"",a}function de(e="",t=""){const n=document.createElement("div");n.className="key-value-row header-row",n.append(z("header-key","Header name",e),z("header-value","Header value",t));const a=document.createElement("button");a.className="btn btn-icon btn-remove",a.type="button",a.textContent="×",a.addEventListener("click",()=>n.remove()),n.append(a),s("#headersContainer").append(n)}function ct(){s("#headersContainer .header-row")||de()}function se(e="",t=""){const n=document.createElement("div");n.className="key-value-row form-data-row",n.append(z("form-data-key","Field name",e),z("form-data-value","Field value or @file path",t));const a=document.createElement("button");a.className="btn btn-icon btn-remove",a.type="button",a.textContent="×",a.addEventListener("click",()=>n.remove()),n.append(a),s("#formDataRows").append(n)}function qe(e="",t="",n="",a=!0){const r=document.createElement("tr");r.innerHTML=`
    <td><input type="checkbox" class="param-enabled" ${a?"checked":""}></td>
    <td><input type="text" class="form-input param-key" value="${b(e)}" placeholder="key"></td>
    <td><input type="text" class="form-input param-value" value="${b(t)}" placeholder="value"></td>
    <td><input type="text" class="form-input param-desc" value="${b(n)}" placeholder="description"></td>
    <td><button class="btn btn-icon param-remove" type="button">×</button></td>
  `,r.querySelector(".param-remove").addEventListener("click",()=>{r.remove(),he()}),r.querySelectorAll("input").forEach(o=>o.addEventListener("input",he)),r.querySelector(".param-enabled").addEventListener("change",he),s("#paramsBody").append(r)}function ze(e){try{return decodeURIComponent(e)}catch{return e}}function Re(){const e=s("#urlInput").value||"",t=e.indexOf("?");if(s("#paramsBody").innerHTML="",t===-1)return;const n=e.indexOf("#",t),a=e.slice(t+1,n===-1?void 0:n);a&&a.split("&").filter(Boolean).forEach(r=>{const o=r.indexOf("="),i=o===-1?r:r.slice(0,o),l=o===-1?"":r.slice(o+1);qe(ze(i.replace(/\+/g," ")),ze(l.replace(/\+/g," ")),"",!0)})}function he(){const e=s("#urlInput"),t=e.value||"",[n,a=""]=t.split("#"),r=n.split("?")[0],o=bt().filter(i=>i.enabled&&i.key).map(i=>`${encodeURIComponent(i.key)}=${encodeURIComponent(i.value||"")}`).join("&");e.value=`${r}${o?`?${o}`:""}${a?`#${a}`:""}`}function ut(){var a;const e=((a=document.querySelector('input[name="bodyType"]:checked'))==null?void 0:a.value)||"none",t=["json","text","xml"].includes(e),n=["form-urlencoded","form-data"].includes(e);s("#bodyContentEditor").hidden=!t,s("#formDataContainer").hidden=!n}function pt(e="none",t={}){const n=s("#authFields");n&&(e==="bearer"?(n.innerHTML='<label class="field" for="authToken"><span>Token</span><input id="authToken" class="form-input" type="password" placeholder="Bearer token"></label>',s("#authToken").value=t.token||""):e==="basic"?(n.innerHTML=`
      <label class="field" for="authUser"><span>Username</span><input id="authUser" class="form-input" type="text"></label>
      <label class="field" for="authPass"><span>Password</span><input id="authPass" class="form-input" type="password"></label>
    `,s("#authUser").value=t.username||"",s("#authPass").value=t.password||""):e==="apikey"?(n.innerHTML=`
      <label class="field" for="authApiKey"><span>Key</span><input id="authApiKey" class="form-input" type="text"></label>
      <label class="field" for="authApiValue"><span>Value</span><input id="authApiValue" class="form-input" type="password"></label>
      <label class="field" for="authApiIn"><span>Add to</span><select id="authApiIn" class="form-select"><option value="header">Header</option><option value="query">Query</option></select></label>
    `,s("#authApiKey").value=t.key||"",s("#authApiValue").value=t.value||"",s("#authApiIn").value=t.in||"header"):n.innerHTML='<p class="empty-state">No authentication will be added.</p>')}function _e(e){const t=document.querySelector(`input[name="bodyType"][value="${e}"]`);t&&(t.checked=!0),ut()}function Mn(e,t={}){const n=document.querySelector(`input[name="authType"][value="${e}"]`);n&&(n.checked=!0),pt(e,t)}function _(e){var t,n;s("#methodSelect").value=e.method||"GET",s("#urlInput").value=e.url||"",s("#paramsBody").innerHTML="",(e.params||[]).forEach(a=>qe(a.key,a.value,a.description||"",a.enabled!==!1)),(t=e.params)!=null&&t.length||Re(),s("#headersContainer").innerHTML="",(e.headers||[]).forEach(a=>de(a.key||a.name||"",a.value||"")),ct(),_e(e.body_type||"none"),s("#bodyContent").value=e.body_content||e.body||"",s("#formDataRows").innerHTML="",(e.form_data||[]).forEach(a=>se(a.key||"",a.value||"")),(n=e.form_data)!=null&&n.length||se(),Mn(e.auth_type||"none",e.auth_config||{})}function bt(){return g("#paramsBody tr").map(e=>({enabled:e.querySelector(".param-enabled").checked,key:e.querySelector(".param-key").value.trim(),value:e.querySelector(".param-value").value,description:e.querySelector(".param-desc").value}))}function In(){return g("#headersContainer .header-row").map(e=>({key:w(e.querySelector(".header-key").value.trim()),value:w(e.querySelector(".header-value").value)})).filter(e=>e.key)}function $n(){return g("#formDataRows .form-data-row").map(e=>({key:w(e.querySelector(".form-data-key").value.trim()),value:w(e.querySelector(".form-data-value").value)})).filter(e=>e.key)}function An(){var t,n,a,r,o,i,l;const e=((t=document.querySelector('input[name="authType"]:checked'))==null?void 0:t.value)||"none";return e==="bearer"?{token:((n=s("#authToken"))==null?void 0:n.value)||""}:e==="basic"?{username:((a=s("#authUser"))==null?void 0:a.value)||"",password:((r=s("#authPass"))==null?void 0:r.value)||""}:e==="apikey"?{key:((o=s("#authApiKey"))==null?void 0:o.value)||"",value:((i=s("#authApiValue"))==null?void 0:i.value)||"",in:((l=s("#authApiIn"))==null?void 0:l.value)||"header"}:{}}function Be(){var n,a;const e=((n=document.querySelector('input[name="bodyType"]:checked'))==null?void 0:n.value)||"none",t=((a=document.querySelector('input[name="authType"]:checked'))==null?void 0:a.value)||"none";return{...S,method:s("#methodSelect").value,url:s("#urlInput").value.trim(),params:bt(),headers:In(),body_type:e,body_content:s("#bodyContent").value,form_data:$n(),auth_type:t,auth_config:An()}}function ft(e){return e.reduce((t,n)=>(n.key&&(t[n.key]=n.value),t),{})}function yt(e){const t=[...e.headers],n=[...e.params],a=e.auth_config||{};return e.auth_type==="bearer"&&a.token?t.push({key:"Authorization",value:`Bearer ${w(a.token)}`}):e.auth_type==="basic"&&(a.username||a.password)?t.push({key:"Authorization",value:`Basic ${btoa(`${w(a.username)}:${w(a.password)}`)}`}):e.auth_type==="apikey"&&a.key&&(a.in==="query"?n.push({enabled:!0,key:a.key,value:a.value||""}):t.push({key:a.key,value:a.value||""})),{...e,headers:t,params:n}}function vt(e){const[t,n=""]=w(e.url).split("#"),[a,r=""]=t.split("?"),o=new URLSearchParams(r);e.params.filter(l=>l.enabled&&l.key).forEach(l=>o.set(w(l.key),w(l.value)));const i=o.toString();return`${a}${i?`?${i}`:""}${n?`#${n}`:""}`}function ht(e){const t=yt(e),n=t.body_type==="json"?"application/json":t.body_type==="form-urlencoded"?"application/x-www-form-urlencoded":t.body_type==="form-data"?"multipart/form-data":"",a={method:t.method,url:vt(t),headers:ft(t.headers),contentType:n,body:["json","text","xml"].includes(t.body_type)?w(t.body_content):"",formData:t.body_type==="form-data"||t.body_type==="form-urlencoded"?t.form_data:[],verifySsl:!0};return t.body_type==="form-data"&&delete a.body,n||delete a.contentType,a}function Nn(e){const t=yt(e),n=ft(t.headers);let a;return t.body_type==="json"?(n["Content-Type"]=n["Content-Type"]||"application/json",a=w(t.body_content)):["text","xml"].includes(t.body_type)?a=w(t.body_content):t.body_type==="form-urlencoded"?(n["Content-Type"]=n["Content-Type"]||"application/x-www-form-urlencoded",a=new URLSearchParams(t.form_data.map(r=>[w(r.key),w(r.value)]))):t.body_type==="form-data"&&(a=new FormData,t.form_data.forEach(r=>a.append(w(r.key),w(r.value)))),{url:vt(t),options:{method:t.method,headers:n,body:["GET","HEAD"].includes(t.method)?void 0:a,credentials:s("#clientCredentialsSelect").value}}}async function On(e){if(s("#executionModeSelect").value==="client"){const{url:n,options:a}=Nn(e),r=performance.now(),o=await fetch(n,a),i=await o.text();let l=i;try{l=JSON.parse(i)}catch{}return{status:o.status,statusText:o.statusText,headers:Object.fromEntries(o.headers.entries()),body:l,time:Math.round(performance.now()-r)}}return x.sendProxyRequest(ht(e))}function Un(){s("#statusCode").textContent="---",s("#responseTime").textContent="0 ms",s("#responseSize").textContent="0 B",s("#responseHeaders").textContent="",tt(s("#responseBody"),"Send a request to see the response here.",{})}function mt(e){K=e,s("#statusCode").textContent=`${e.status||0} ${e.statusText||""}`.trim(),s("#statusCode").className=`status-badge ${e.status>=200&&e.status<300?"success":e.status>=400?"error":"warning"}`,s("#responseTime").textContent=`${e.time||0} ms`;const t=typeof e.body=="string"?e.body:JSON.stringify(e.body||"",null,2);s("#responseSize").textContent=Xt(new Blob([t]).size),s("#responseHeaders").textContent=JSON.stringify(e.headers||{},null,2),tt(s("#responseBody"),e.body??"",e.headers||{})}async function gt(){const e=Be();if(!e.url){Ve(s("#responseBody"),{title:"URL is required",message:"Enter a request URL before sending.",likelyCause:"The request URL field is empty.",suggestedFix:"Paste a full http:// or https:// URL."});return}try{s("#sendBtn").disabled=!0;const t=await On(e);mt(t),M.unshift({method:e.method,url:e.url,status:t.status,at:new Date().toISOString()}),M=M.slice(0,25),zt(M,C.currentUser),Me()}catch(t){Ve(s("#responseBody"),{title:"Request failed",message:t.message,likelyCause:"The request executor returned an error.",suggestedFix:"Check the URL, proxy mode, and headers.",detailsText:JSON.stringify(t.payload||t,null,2)})}finally{s("#sendBtn").disabled=!1}}function Pn(){var e,t,n,a,r,o,i,l,d,c,y,u,v,h,E;U(),q(Q()),_(S),R(),(e=s("#requestBar"))==null||e.addEventListener("input",ye),(t=s("#requestSection"))==null||t.addEventListener("input",ye),(n=s("#requestSection"))==null||n.addEventListener("change",ye),(a=s("#newTabBtn"))==null||a.addEventListener("click",()=>{xn()}),(r=s("#requestTabs"))==null||r.addEventListener("click",f=>{const m=f.target.closest("[data-close-tab]");if(m){Ln(m.dataset.closeTab);return}const B=f.target.closest("[data-tab-id]");B&&lt(B.dataset.tabId)}),(o=s("#sendBtn"))==null||o.addEventListener("click",gt),(i=s("#addHeaderBtn"))==null||i.addEventListener("click",()=>de()),(l=s("#addParamBtn"))==null||l.addEventListener("click",()=>qe()),(d=s("#addFormDataBtn"))==null||d.addEventListener("click",()=>se()),(c=s("#urlInput"))==null||c.addEventListener("input",Re),(y=s("#prettifyJsonBtn"))==null||y.addEventListener("click",()=>{try{s("#bodyContent").value=JSON.stringify(JSON.parse(s("#bodyContent").value),null,2),_e("json")}catch{alert("Body is not valid JSON.")}}),g('input[name="bodyType"]').forEach(f=>f.addEventListener("change",ut)),g('input[name="authType"]').forEach(f=>f.addEventListener("change",()=>pt(f.value))),g(".tab").forEach(f=>f.addEventListener("click",()=>Hn(f.dataset.tab))),g(".response-tab").forEach(f=>f.addEventListener("click",()=>jn(f.dataset.rtab))),(u=s("#responseBodyViewer"))==null||u.addEventListener("click",f=>{const m=f.target.closest(".json-tree-toggle");m&&yn(s("#responseBody"),m)}),(v=s("#copyResponseBtn"))==null||v.addEventListener("click",async()=>{var m;const f=s("#responseBodyCode");await((m=navigator.clipboard)==null?void 0:m.writeText((f==null?void 0:f.textContent)||""))}),(h=s("#responseFullscreenBtn"))==null||h.addEventListener("click",()=>{s("#responseSection").classList.toggle("fullscreen")}),(E=s("#loopBtn"))==null||E.addEventListener("click",wt),window.addEventListener("beforeunload",()=>{X(C)&&p.length&&Z()})}function Hn(e){g(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===e)),g(".tab-content").forEach(t=>t.classList.toggle("active",t.id===`${e}-tab`))}function jn(e){g(".response-tab").forEach(t=>t.classList.toggle("active",t.dataset.rtab===e)),g(".response-tab-content").forEach(t=>t.classList.toggle("active",t.id===`response-${e}-tab`))}function wt(){const e=s("#loopControls");if(ee){clearInterval(ee),ee=null,e.hidden=!0,s("#loopStatus").textContent="";return}e.hidden=!1;const t=Math.max(100,Number(s("#loopInterval").value||1e3));D=Number(s("#loopCount").value||0),ee=setInterval(async()=>{D>0&&(D-=1,D===0&&wt()),s("#loopStatus").textContent=D>0?`${D} remaining`:"Running",await gt()},t)}function Me(){const e=s("#historyList");e&&(e.innerHTML=M.length?M.map(t=>`<button class="history-item" type="button">${b(t.method)} ${b(t.url)} <span>${b(String(t.status||""))}</span></button>`).join(""):'<p class="empty-state">No history yet.</p>')}function St(){const e=s("#envVarsList");if(!e)return;const t=Object.entries(N);e.innerHTML="",t.forEach(([n,a])=>we(n,a)),t.length||we()}function we(e="",t=""){const n=document.createElement("div");n.className="key-value-row env-row",n.append(z("env-key","key",e),z("env-val","value",t));const a=document.createElement("button");a.className="btn btn-icon",a.type="button",a.textContent="×",a.addEventListener("click",()=>{n.remove(),We()}),n.append(a),n.querySelectorAll("input").forEach(r=>r.addEventListener("input",We)),s("#envVarsList").append(n)}function We(){N=g("#envVarsList .env-row").reduce((e,t)=>{const n=t.querySelector(".env-key").value.trim();return n&&(e[n]=t.querySelector(".env-val").value),e},{}),Jt(N,C.currentUser)}function Fn(){var e,t,n;(e=s("#openEnvVarsModalBtn"))==null||e.addEventListener("click",()=>G("envVarsModal")),(t=s("#envVarsModalClose"))==null||t.addEventListener("click",()=>L("envVarsModal")),(n=s("#addEnvVarBtn"))==null||n.addEventListener("click",()=>we())}function Dn(){var e,t,n,a;g(".sidebar-tab, .category-tab[data-target]").forEach(r=>{r.addEventListener("click",()=>{g(".sidebar-tabs .category-tab").forEach(o=>o.classList.toggle("active",o===r)),g(".sidebar-panel").forEach(o=>o.classList.toggle("active",o.id===r.dataset.target))})}),(e=s("#sidebarToggleBtn"))==null||e.addEventListener("click",()=>s("#sidebar").classList.add("is-open")),(t=s("#sidebarCloseBtn"))==null||t.addEventListener("click",()=>s("#sidebar").classList.remove("is-open")),(n=s("#rightSidebarToggleBtn"))==null||n.addEventListener("click",()=>s("#rightSidebar").classList.add("is-open")),(a=s("#rightSidebarCloseBtn"))==null||a.addEventListener("click",()=>s("#rightSidebar").classList.remove("is-open"))}function Jn(){an({shell:s("#appContainer"),sidebarHandle:s("#sidebarResizeHandle"),toolsHandle:s("#toolsResizeHandle"),responseHandle:s("#responseResizeHandle")})}function Vn(){var t,n,a,r,o,i,l;const e={setMethod:d=>{s("#methodSelect").value=d},setUrl:d=>{s("#urlInput").value=d},syncParamsFromUrl:Re,clearHeaders:()=>{s("#headersContainer").innerHTML=""},addHeaderRow:de,ensureHeaderRow:ct,setBodyType:_e,setBodyContent:d=>{s("#bodyContent").value=d||""},clearFormData:()=>{s("#formDataRows").innerHTML=""},addFormDataRow:se};(t=s("#importBtn"))==null||t.addEventListener("click",()=>G("importModal")),(n=s("#modalClose"))==null||n.addEventListener("click",()=>L("importModal")),(a=s("#exampleCurlBtn"))==null||a.addEventListener("click",()=>{s("#importInput").value=`curl -X POST https://httpbin.org/post -H 'Content-Type: application/json' --data '{"hello":"world"}'`}),g(".import-tab").forEach(d=>{d.addEventListener("click",()=>{g(".import-tab").forEach(c=>c.classList.toggle("active",c===d)),g(".import-panel").forEach(c=>c.classList.toggle("active",c.id===`import-${d.dataset.importTab}-panel`))})}),(r=s("#browseFileBtn"))==null||r.addEventListener("click",()=>s("#importFileInput").click()),(o=s("#importFileInput"))==null||o.addEventListener("change",async d=>{var y;const c=(y=d.target.files)==null?void 0:y[0];c&&(s("#selectedFileName").textContent=c.name,s("#importInput").value=await c.text())}),(i=s("#importConfirmBtn"))==null||i.addEventListener("click",async()=>{const d=s("#importInput").value.trim();if(d)try{let c;if(d.startsWith("curl")){try{c=await x.importData({type:"curl",data:d})}catch{c=Ne(d)}Ae(c,e)}else await x.importData({type:"postman",data:JSON.parse(d)}),await O();L("importModal")}catch(c){alert(`Import failed: ${c.message}`)}}),(l=s("#urlInput"))==null||l.addEventListener("paste",d=>{var u;const c=((u=d.clipboardData)==null?void 0:u.getData("text"))||"";if(!c.trim().startsWith("curl"))return;d.preventDefault();const y=Se(Ne(c));Ae(y,e)})}function zn(){const e=Be(),t=ht(e),n=Object.entries(t.headers||{}).map(([o,i])=>`-H ${JSON.stringify(`${o}: ${i}`)}`),a=t.body?` --data ${JSON.stringify(t.body)}`:"",r=["curl","-X",t.method,...n,JSON.stringify(t.url)].join(" ")+a;s("#sidebarCurlOutput").value=r}function Wn(){var e,t,n,a;(e=s("#generateSidebarCurlBtn"))==null||e.addEventListener("click",zn),(t=s("#copySidebarCurlBtn"))==null||t.addEventListener("click",async()=>{var r;return(r=navigator.clipboard)==null?void 0:r.writeText(s("#sidebarCurlOutput").value)}),(n=s("#saveInstanceBtn"))==null||n.addEventListener("click",Ge),(a=s("#saveResponseSnapshotBtn"))==null||a.addEventListener("click",Ge)}function Ge(){if(!K){s("#responseSnapshotFeedback").textContent="Send a response before saving a snapshot.";return}const e=document.createElement("button");e.className="snapshot-list-item",e.type="button",e.textContent=`${K.status||0} ${new Date().toLocaleTimeString()}`,e.addEventListener("click",()=>mt(K)),s("#snapshotList").prepend(e),s("#responseSnapshotFeedback").textContent="Snapshot saved."}function Gn(){document.addEventListener("click",e=>{var a;const t=e.target.closest("[data-close-modal]");t&&L(t.dataset.closeModal);const n=(a=e.target.classList)!=null&&a.contains("modal")?e.target:null;n&&L(n.id)}),document.addEventListener("keydown",e=>{e.key==="Escape"&&g(".modal.active").forEach(t=>L(t.id))})}function Kn(){Sn(),Jn(),Tn(),Bn(),Pn(),Fn(),Dn(),Vn(),Wn(),Gn(),wn()}document.querySelector("#root").innerHTML=Ot();Kn();
