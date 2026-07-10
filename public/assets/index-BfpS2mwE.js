import{f as Me,b as ce,l as Ct,s as ue,c as St,a as xt,d as S,e as K,i as Lt,r as Et,g as Tt,h as Ge,u as C}from"./user-CHff2p5H.js";function kt(){return`
    <main id="loginScreen" class="login-screen" aria-labelledby="loginTitle">
      <section class="login-card">
        <div class="login-branding" aria-hidden="true">PB</div>
        <p class="login-kicker">API Testing Client</p>
        <h1 id="loginTitle">PostBoy</h1>
        <p class="login-subtitle">Sign in to sync your workspace, create an account, or continue with a temporary guest workspace.</p>
        <div class="account-status login-status" id="authStatus" role="status">Checking account...</div>
        <div class="login-fields">
          ${Me({id:"authUsername",label:"Username",autocomplete:"username",placeholder:"Username",className:"compact-field"})}
          ${Me({id:"authPassword",label:"Password",type:"password",autocomplete:"current-password",placeholder:"Password",className:"compact-field"})}
        </div>
        <div class="login-actions">
          ${ce({id:"loginBtn",variant:"primary",label:"Log in"})}
          ${ce({id:"registerBtn",variant:"secondary",label:"Create account"})}
          ${Ct({id:"forgotPasswordBtn",className:"login-link-button",href:"/recover.html",label:"Forgot password?"})}
          ${ce({id:"guestLoginBtn",variant:"ghost",label:"Continue as guest"})}
        </div>
        <p class="login-warning" role="note">Guest mode stores request workspace data in this browser session. Avoid entering secrets; sensitive headers and auth fields are redacted before storage.</p>
      </section>
    </main>
  `}function qt(){return`
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
  `}const Rt=["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"].map(e=>({label:e,value:e,selected:e==="GET"}));function _t(){return`
    <section class="request-card" id="requestBar" aria-label="Request builder">
      <div class="url-bar">
        ${ue({id:"methodSelect",label:"Method",options:Rt,className:"method-field"})}
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
  `}function Bt(){return`
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
  `}function It(){return`
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
  `}function Mt(){return`
    <div class="app-shell" id="appContainer" hidden>
      ${qt()}
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
          ${_t()}
        </div>
        <div class="resize-handle resize-handle-horizontal" id="responseResizeHandle" role="separator" aria-orientation="horizontal" aria-label="Resize response panel" tabindex="0"></div>
        ${Bt()}
      </main>
      <div class="resize-handle resize-handle-vertical" id="toolsResizeHandle" role="separator" aria-orientation="vertical" aria-label="Resize tools sidebar" tabindex="0"></div>
      ${It()}
    </div>
  `}function $t(){return`
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
  `}function Nt(){return`
    ${kt()}
    ${Mt()}
    ${$t()}
    <div class="loading-overlay" id="loadingOverlay" hidden>
      <div class="spinner"></div>
    </div>
  `}const At="postboy_env",Ot=At+"_user_",Ht="postboy_history",Ut=Ht+"_user_";function Pt(e){return!e||e.is_guest===!0}function Ke(e,t){return Pt(t)||t.id===void 0||t.id===null?null:e+String(t.id)}function Xe(e){return Ke(Ot,e)}function Ye(e){return Ke(Ut,e)}function Qe(e,t){try{return JSON.parse(e||JSON.stringify(t))}catch{return t}}function jt(e){var t=Xe(e);return t?Qe(localStorage.getItem(t),{}):{}}function Ft(e,t){var n=Xe(t);n&&localStorage.setItem(n,JSON.stringify(e))}function Dt(e){var t=Ye(e);return t?Qe(localStorage.getItem(t),[]):[]}function Jt(e,t){var n=Ye(t);n&&localStorage.setItem(n,JSON.stringify(e))}function Vt(e){for(var t=[],n=0;n<e.length;){for(;n<e.length&&/\s/.test(e[n]);)n++;if(n>=e.length)break;if(e[n]==="$"&&e[n+1]==="'"){var a="";for(n+=2;n<e.length;){if(e[n]==="'"){if(n+1<e.length&&e[n+1]==="'"){a+="'",n+=2;continue}n++;break}if(e[n]==="\\"&&n+1<e.length){a+=zt(e[n+1]),n+=2;continue}a+=e[n],n++}t.push(a)}else if(e[n]==="'"||e[n]==='"'){for(var r=e[n++],o="";n<e.length&&e[n]!==r;)e[n]==="\\"&&n+1<e.length?o+=e[++n]:o+=e[n],n++;n++,t.push(o)}else if(e[n]==="$"&&e[n+1]==="("){var i=1;for(n+=2;n<e.length&&i>0;)e[n]==="("&&i++,e[n]===")"&&i--,n++;t.push("$(...)")}else{for(var l="";n<e.length&&!/\s/.test(e[n]);)l+=e[n++];t.push(l)}}return t}function zt(e){var t={"'":"'","\\":"\\",a:"\x07",b:"\b",f:"\f",n:`
`,r:"\r",t:"	",v:"\v"};return Object.prototype.hasOwnProperty.call(t,e)?t[e]:"\\"+e}function Ce(e){e=e||{};var t={method:String(e.method||"GET").toUpperCase(),url:e.url||"",headers:Array.isArray(e.headers)?e.headers:[],body_type:e.body_type||"none",body_content:e.body_content||"",form_data:Array.isArray(e.form_data)?e.form_data:[]};return t.body_type==="form-urlencoded"&&t.form_data.length===0&&t.body_content&&(t.form_data=Wt(t.body_content)),t}function Wt(e){return String(e).split("&").reduce(function(t,n){if(!n)return t;var a=n.indexOf("=");return a===-1||t.push({key:$e(n.substring(0,a)),value:$e(n.substring(a+1))}),t},[])}function $e(e){var t=String(e).replace(/\+/g," ");try{return decodeURIComponent(t)}catch{return t}}function Ne(e,t){var n=Ce(e);return t.setMethod(n.method),t.setUrl(n.url),t.syncParamsFromUrl(),t.clearHeaders(),n.headers.forEach(function(a){t.addHeaderRow(a.key||"",a.value||"")}),t.ensureHeaderRow(),t.setBodyType(n.body_type),t.setBodyContent(n.body_content),t.clearFormData(),n.form_data.forEach(function(a){t.addFormDataRow(a.key||"",a.value||"")}),n}function Ae(e){e=(e||"").replace(/\\\r?\n/g," ").trim();for(var t=Vt(e),n={method:"GET",url:"",headers:[],body_type:"none",body_content:"",form_data:[]},a=!1,r=0;r<t.length;r++){var o=t[r],i;if(o!=="curl"){if(o==="-X"||o==="--request"){n.method=(t[++r]||n.method).toUpperCase(),a=!0;continue}if(o.indexOf("--request=")===0){n.method=o.substring(10).toUpperCase(),a=!0;continue}if(o.indexOf("-X")===0&&o.length>2){n.method=o.substring(2).toUpperCase(),a=!0;continue}if(o==="--url"){n.url=t[++r]||"";continue}if(o.indexOf("--url=")===0){n.url=o.substring(6);continue}if(o==="-H"||o==="--header"){i=t[++r]||"",pe(n.headers,i);continue}if(o.indexOf("--header=")===0){pe(n.headers,o.substring(9));continue}if(o.indexOf("-H")===0&&o.length>2){pe(n.headers,o.substring(2));continue}if(o==="--json"){i=t[++r]||"",Oe(n,i);continue}if(o.indexOf("--json=")===0){Oe(n,o.substring(7));continue}if(["-d","--data","--data-raw","--data-binary","--data-urlencode"].indexOf(o)!==-1){i=t[++r]||"",n.body_content=n.body_content?n.body_content+"&"+i:i,n.body_type=o==="--data-urlencode"?"form-urlencoded":fe(n.body_content,n.headers);continue}if(o.indexOf("--data=")===0||o.indexOf("--data-raw=")===0||o.indexOf("--data-binary=")===0||o.indexOf("--data-urlencode=")===0){i=o.substring(o.indexOf("=")+1),n.body_content=n.body_content?n.body_content+"&"+i:i,n.body_type=o.indexOf("--data-urlencode=")===0?"form-urlencoded":fe(n.body_content,n.headers);continue}if(o.indexOf("-d")===0&&o.length>2){i=o.substring(2),n.body_content=n.body_content?n.body_content+"&"+i:i,n.body_type=fe(n.body_content,n.headers);continue}if(o==="-F"||o==="--form"){be(n.form_data,t[++r]||""),n.body_type="form-data",n.body_content="";continue}if(o.indexOf("--form=")===0){be(n.form_data,o.substring(7)),n.body_type="form-data",n.body_content="";continue}if(o.indexOf("-F")===0&&o.length>2){be(n.form_data,o.substring(2)),n.body_type="form-data",n.body_content="";continue}if(o==="-I"||o==="--head"){n.method="HEAD",a=!0;continue}if(o==="-G"||o==="--get"){n.method="GET",a=!0;continue}o.charAt(0)!=="-"&&!n.url&&(n.url=o)}}return(n.body_content||n.form_data.length)&&n.method==="GET"&&!a&&(n.method="POST"),Ce(n)}function pe(e,t){var n=t.indexOf(":");n<=0||e.push({key:t.substring(0,n).trim(),value:t.substring(n+1).trim()})}function Oe(e,t){e.body_content=e.body_content?e.body_content+"&"+t:t,e.body_type="json",He(e.headers,"Content-Type","application/json"),He(e.headers,"Accept","application/json")}function He(e,t,n){var a=t.toLowerCase(),r=e.some(function(o){return(o.key||"").toLowerCase()===a});r||e.push({key:t,value:n})}function be(e,t){var n=t.indexOf("=");n<=0||e.push({key:t.substring(0,n),value:t.substring(n+1)})}function fe(e,t){var n="";if(t.some(function(a){return(a.key||"").toLowerCase()==="content-type"?(n=(a.value||"").toLowerCase(),!0):!1}),n.indexOf("application/json")!==-1)return"json";if(n.indexOf("application/x-www-form-urlencoded")!==-1)return"form-urlencoded";if(n.indexOf("/xml")!==-1||n.indexOf("+xml")!==-1)return"xml";try{return JSON.parse(e),"json"}catch{return/^\s*<[^>]+>/.test(e)?"xml":/^[^=&]+=[^&]*(?:&[^=&]+=[^&]*)*$/.test(e)?"form-urlencoded":"text"}}function Gt(e){return e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB"}function f(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function Se(e){return typeof e!="string"&&(e=JSON.stringify(e,void 0,2)),e=f(e),e.replace(/(&quot;(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\])*?&quot;(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,function(t){var n="json-number";return/^&quot;/.test(t)?n=/:$/.test(t)?"json-key":"json-string":/true|false/.test(t)?n="json-boolean":/null/.test(t)&&(n="json-null"),'<span class="'+n+'">'+t+"</span>"})}function Kt(e){var t=f(e);return t.replace(/(&lt;\/?)([\w:-]+)([\s\S]*?)(\/?&gt;)/g,function(n,a,r,o,i){return o=o.replace(/([\w:-]+)(=)(\&quot;.*?\&quot;|\&#039;.*?\&#039;|[^\s]+)/g,function(l,d,c,p){return'<span class="syntax-attr-name">'+d+"</span>"+c+'<span class="syntax-attr-value">'+p+"</span>"}),'<span class="syntax-tag">'+a+r+"</span>"+o+'<span class="syntax-tag">'+i+"</span>"})}function Xt(e){return f(e).replace(/^([^:\n]+)(:)(.*)$/gm,function(t,n,a,r){return'<span class="syntax-header-name">'+n+"</span>"+a+'<span class="syntax-header-value">'+r+"</span>"})}function Yt(e){return f(e).replace(/\b(https?:\/\/[^\s<]+)\b/g,'<span class="syntax-url">$1</span>').replace(/\b([A-Z][A-Z0-9_-]{2,})\b/g,'<span class="syntax-keyword">$1</span>').replace(/\b(-?\d+(?:\.\d+)?)\b/g,'<span class="json-number">$1</span>')}function Qt(e,t){var n=String(t||"").toLowerCase(),a=String(e||"").trim();return/json|javascript|problem\+json|ld\+json/.test(n)?"json":/xml|html|svg|xhtml|rss|atom/.test(n)?"markup":/http|message\/rfc822/.test(n)?"headers":/text\/plain|text\/csv|application\/x-www-form-urlencoded/.test(n)||!a?"text":/^(HTTP\/\d(?:\.\d)? \d{3}|[A-Za-z0-9-]+\s*:)/.test(a)?"headers":/^</.test(a)&&/>\s*$/.test(a)?"markup":/^[{[]/.test(a)?"json":"text"}function Zt(e,t){return t==="json"?Se(e):t==="markup"?Kt(e):t==="headers"?Xt(e):Yt(e)}const P=(e,t,n)=>Math.min(n,Math.max(t,e));function j(e,t){const n=Number(e);return Number.isFinite(n)?n:t}function en(e,t){try{return{...t,...JSON.parse(localStorage.getItem(e)||"{}")}}catch{return{...t}}}function tn(e,t){try{localStorage.setItem(e,JSON.stringify(t))}catch{}}function nn({shell:e,sidebarHandle:t,toolsHandle:n,responseHandle:a,storageKey:r="postboy_panel_layout"}={}){if(!e)return;const o={sidebarWidth:320,toolsWidth:320,responseHeight:360},i={sidebarMin:240,sidebarMax:460,toolsMin:260,toolsMax:460,responseMin:240,responseMax:620},l=en(r,o);function d(){e.style.setProperty("--sidebar-width",`${P(j(l.sidebarWidth,o.sidebarWidth),i.sidebarMin,i.sidebarMax)}px`),e.style.setProperty("--tools-width",`${P(j(l.toolsWidth,o.toolsWidth),i.toolsMin,i.toolsMax)}px`),e.style.setProperty("--response-height",`${P(j(l.responseHeight,o.responseHeight),i.responseMin,i.responseMax)}px`)}function c(p,u){p&&p.addEventListener("pointerdown",g=>{if(window.matchMedia("(max-width: 1180px)").matches&&p!==a)return;g.preventDefault(),p.setPointerCapture(g.pointerId),e.classList.add("is-resizing");const m={x:g.clientX,y:g.clientY,sidebarWidth:j(l.sidebarWidth,o.sidebarWidth),toolsWidth:j(l.toolsWidth,o.toolsWidth),responseHeight:j(l.responseHeight,o.responseHeight)};function E(L){u(L,m),d()}function y(){e.classList.remove("is-resizing"),tn(r,l),window.removeEventListener("pointermove",E),window.removeEventListener("pointerup",y),window.removeEventListener("pointercancel",y)}window.addEventListener("pointermove",E),window.addEventListener("pointerup",y),window.addEventListener("pointercancel",y)})}c(t,(p,u)=>{l.sidebarWidth=P(u.sidebarWidth+p.clientX-u.x,i.sidebarMin,i.sidebarMax)}),c(n,(p,u)=>{l.toolsWidth=P(u.toolsWidth-(p.clientX-u.x),i.toolsMin,i.toolsMax)}),c(a,(p,u)=>{l.responseHeight=P(u.responseHeight-(p.clientY-u.y),i.responseMin,Math.min(i.responseMax,window.innerHeight-260))}),d()}function an(e,t){if(!e||!t)return"";var n=t.toLowerCase();if(typeof e=="string"){for(var a=e.split(/\r?\n/),r=0;r<a.length;r++){var o=a[r].indexOf(":");if(o>-1&&a[r].slice(0,o).trim().toLowerCase()===n)return a[r].slice(o+1).trim()}return""}for(var i=Object.keys(e),l=0;l<i.length;l++)if(i[l].toLowerCase()===n)return e[i[l]];return""}function oe(e){return e?e.querySelector("code")||e:null}function sn(e){return!e||!e.parentElement?null:e.parentElement.querySelector(".response-line-numbers")}function Ue(e){return e===""?1:e.split(`
`).length}function on(e,t){for(var n=e.parentElement;n&&n!==t;){if(n.classList&&n.classList.contains("json-tree-children")){var a=n.parentElement;if(a&&a.classList&&a.classList.contains("is-collapsed"))return!0}n=n.parentElement}return!1}function rn(e){if(!e.querySelectorAll)return[];var t=e.querySelectorAll(".json-tree-line");if(!t.length)return[];for(var n=[],a=0;a<t.length;a++)on(t[a],e)||n.push(a+1);return n}function re(e){var t=oe(e),n=sn(e);if(!(!t||!n)){var a=!!(t.classList&&t.classList.contains&&t.classList.contains("json-tree")||typeof t.innerHTML=="string"&&t.innerHTML.indexOf("json-tree-line")>-1),r=a?rn(t):[];if(!r.length)for(var o=Ue(a?bn(t)||t.textContent||"":t.textContent||""),i=1;i<=o;i++)r.push(i);for(var l=[],d=0;d<r.length;d++)l.push("<span>"+r[d]+"</span>");n.innerHTML=l.join(`<span class="line-number-break">
</span>`)}}function ln(e){return typeof e=="object"&&e!==null?{text:JSON.stringify(e,null,2),format:"json"}:{text:String(e||""),format:""}}function xe(e){return e!==null&&typeof e=="object"}function dn(e){return Object.prototype.toString.call(e)==="[object Array]"}function Pe(e){return e==null?"":'<span class="json-key">'+f(JSON.stringify(String(e)))+":</span> "}function cn(e){return Se(JSON.stringify(e))}function un(e,t){var n=e==="array"?"Toggle array with ":"Toggle object with ";return n+=t+(t===1?" child":" children"),'<button class="json-tree-toggle" type="button" aria-expanded="true" aria-label="'+f(n)+'">▾</button>'}function Ze(e,t,n,a){var r=a?",":"",o=' style="--json-depth: '+n+'"';if(!xe(e))return'<div class="json-tree-line"'+o+">"+Pe(t)+cn(e)+r+"</div>";var i=dn(e),l=i?e.map(function(L,Z){return Z}):Object.keys(e),d=l.length,c=i?"[":"{",p=i?"]":"}",u=i?"[…]":"{…}",g=i?"array":"object",m='<div class="json-tree-node" data-json-type="'+g+'">';m+='<div class="json-tree-line"'+o+">",d?m+=un(g,d):m+='<span class="json-tree-toggle-spacer"></span>',m+=Pe(t),m+='<span class="json-tree-open">'+c+"</span>",m+='<span class="json-tree-summary" aria-hidden="true">'+u+r+"</span>",m+="</div>",m+='<div class="json-tree-children">';for(var E=0;E<l.length;E++){var y=l[E];m+=Ze(e[y],i?null:y,n+1,E<l.length-1)}return m+='<div class="json-tree-line json-tree-close"'+o+">"+p+r+"</div>",m+="</div>",m+="</div>",m}function pn(e){return xe(e)?Ze(e,null,0,!1):Se(JSON.stringify(e,null,2))}function je(e,t){e&&(e.dataset?e.dataset.rawBody=t:e.__rawBody=t)}function bn(e){return e?e.dataset&&typeof e.dataset.rawBody=="string"?e.dataset.rawBody:typeof e.__rawBody=="string"?e.__rawBody:"":""}function Le(e,t,n){var a=String(n||"");je(e,a),t&&t!==e&&je(t,a)}function Ee(e,t){e.classList&&e.classList.toggle&&e.classList.toggle("json-tree",t)}function Fe(e,t,n){var a=JSON.stringify(n,null,2);Le(e,t,a),Ee(t,xe(n)),t.innerHTML=pn(n),re(e)}function fn(e,t){if(!(!e||!t)){var n=oe(e),a=t.closest(".json-tree-node");if(!(!n||!a||!n.contains(a))){var r=!a.classList.contains("is-collapsed");a.classList.toggle("is-collapsed",r),t.setAttribute("aria-expanded",r?"false":"true"),t.textContent=r?"▸":"▾",re(e)}}}function et(e,t,n){if(e){var a=oe(e);if(a){a.classList&&a.classList.remove&&a.classList.remove("response-issue");var r=ln(t);if(r.format==="json"){Fe(e,a,JSON.parse(r.text));return}var o=an(n,"content-type"),i=Qt(r.text,o);if(i==="json")try{Fe(e,a,JSON.parse(r.text));return}catch{}Le(e,a,r.text),Ee(a,!1),a.innerHTML=Zt(r.text,i),re(e)}}}function De(e,t){return'<div class="response-issue-row"><span class="response-issue-row-label">'+f(e)+'</span><span class="response-issue-row-value">'+f(t||"Not available")+"</span></div>"}function Je(e,t){if(!(!e||!t)){var n=oe(e);if(n){var a=t.variant||"error",r=t.icon||"⛔",o=t.title||"Request failed",i=t.message||"The request could not be completed.",l=a==="warning"?"Warning":a==="info"?"Info":"Error",d=t.likelyCause||"No likely cause was provided.",c=t.suggestedFix||"Retry the request and verify your settings.",p=t.detailsText||"",u=t.cta||null;Le(e,n,p),Ee(n,!1),n.classList&&n.classList.add&&n.classList.add("response-issue"),n.innerHTML='<section class="response-issue-card response-issue-'+f(a)+'" role="alert" aria-live="polite"><header class="response-issue-header"><span class="response-issue-icon" aria-hidden="true">'+f(r)+'</span><h4 class="response-issue-title">'+f(o)+'</h4><span class="response-issue-severity" aria-label="Severity">'+f(l)+'</span></header><p class="response-issue-message">'+f(i)+"</p>"+De("Likely cause",d)+De("Suggested fix",c)+(u&&u.label?'<button class="response-issue-cta btn-secondary" type="button" data-action="'+f(u.action||"")+'">'+f(u.label)+"</button>":"")+'<details class="response-issue-details"><summary>Details</summary><pre>'+f(p)+"</pre></details></section>",re(e)}}}const T=()=>({name:"Untitled Request",method:"GET",url:"",params:[],headers:[],body_type:"none",body_content:"",form_data:[],auth_type:"none",auth_config:{}});let U=[],k=null,z=null,w=T(),b=[],$=null,N={},B=[],G=null,D=null,H=null,ee=null,F=0,X=1,te=null,he=!1,ae="";const ne=new Set,tt="postboy_request_tabs",yn=`${tt}_user_`,vn=`${tt}_guest`,s=e=>document.querySelector(e),v=e=>Array.from(document.querySelectorAll(e));function W(e){const t=document.getElementById(e);t&&(t.classList.add("active","show"),t.setAttribute("aria-hidden","false"))}function x(e){const t=document.getElementById(e);t&&(t.classList.remove("active","show"),t.setAttribute("aria-hidden","true"))}function J(e,t,n=!1){e&&(e.textContent=t||"",e.classList.toggle("auth-error",n))}function h(e){return String(e||"").replace(/\{\{\s*([^}]+?)\s*\}\}/g,(t,n)=>{const a=String(n||"").trim();return Object.prototype.hasOwnProperty.call(N,a)?N[a]:""})}function nt(){if(Ge(C))return{storage:sessionStorage,key:vn};const e=C.currentUser;return e&&e.id!==void 0&&e.id!==null&&e.is_guest!==!0?{storage:localStorage,key:yn+String(e.id)}:null}function I(){const e=nt();if(e)try{e.storage.setItem(e.key,JSON.stringify({tabs:b,activeTabId:$,nextTabNumber:X}))}catch{}}function ye(){te&&clearTimeout(te),te=setTimeout(()=>{te=null,!(!K(C)||!b.length)&&Q()},150)}function mn(){const e=nt();if(!e)return!1;try{const t=JSON.parse(e.storage.getItem(e.key)||"null");return!t||!Array.isArray(t.tabs)||!t.tabs.length?!1:(b=t.tabs.map((n,a)=>({id:n.id||`restored_tab_${a+1}`,requestId:n.requestId??null,collectionId:n.collectionId??null,title:n.title||`Unsaved Request ${a+1}`,state:{...T(),...n.state||{}}})),$=b.some(n=>n.id===t.activeTabId)?t.activeTabId:b[0].id,X=Number.isFinite(t.nextTabNumber)&&t.nextTabNumber>0?t.nextTabNumber:b.length+1,q(Y()),!0)}catch{return!1}}function hn({resetStorageBackedState:e=!0}={}){B=e?[]:B,N=e?{}:N,U=[],k=null,z=null,G=null,w=T(),b=[],$=null,X=1,M(),Ie(),wt(),_(w),On(),R()}async function Te(){K(C)&&(N=jt(C.currentUser),B=Dt(C.currentUser),await A(),mn()||O(),q(Y()),_(w),R(),wt(),Ie())}function ge(e){s("#loginScreen").hidden=e,s("#appContainer").hidden=!e}function ke(){if(K(C)){const e=Ge(C)?"Guest workspace":C.currentUser.username;J(s("#appAuthStatus"),`Signed in as ${e}`),ge(!0)}else J(s("#authStatus"),C.loading?"Checking account...":"Sign in or continue as guest."),ge(!1)}async function ve(e){const t=s("#authUsername").value.trim(),n=s("#authPassword").value;if(!t||!n){J(s("#authStatus"),"Enter a username and password.",!0);return}try{const a=e==="register"?await Et({username:t,password:n}):await Tt({username:t,password:n});ke(),await Te(),e==="register"&&a.recovery_key&&(s("#registerRecoveryKey").value=a.recovery_key,s("#registerRecoveryAcknowledge").checked=!1,s("#registerRecoveryCloseBtn").disabled=!0,W("registerSuccessModal"))}catch(a){J(s("#authStatus"),a.message,!0)}}async function gn(){await Lt(),ke(),K(C)&&await Te()}function wn(){var e,t,n,a,r,o,i;(e=s("#loginBtn"))==null||e.addEventListener("click",()=>ve("login")),(t=s("#registerBtn"))==null||t.addEventListener("click",()=>ve("register")),(n=s("#guestLoginBtn"))==null||n.addEventListener("click",async()=>{await St(),ke(),await Te()}),(a=s("#logoutBtn"))==null||a.addEventListener("click",async()=>{try{await xt()}finally{hn(),ge(!1),J(s("#authStatus"),"Signed out."),s("#authPassword").value=""}}),(r=s("#registerRecoveryAcknowledge"))==null||r.addEventListener("change",l=>{s("#registerRecoveryCloseBtn").disabled=!l.target.checked}),(o=s("#registerRecoveryCloseBtn"))==null||o.addEventListener("click",()=>x("registerSuccessModal")),(i=s("#copyRecoveryKeyBtn"))==null||i.addEventListener("click",async()=>{var l;await((l=navigator.clipboard)==null?void 0:l.writeText(s("#registerRecoveryKey").value))}),[s("#authUsername"),s("#authPassword")].forEach(l=>{l==null||l.addEventListener("keydown",d=>{d.key==="Enter"&&ve("login")})})}async function A(){he=!0,ae="",M();try{U=await S.getCollections()}catch(e){U=[],ae=e.message||"Collections could not be loaded.",J(s("#appAuthStatus"),e.message,!0)}finally{he=!1}M()}function at(e=[],t=[]){return e.forEach(n=>{t.push(n),at(n.children||[],t)}),t}function st(e,t=U){for(const n of t){if(String(n.id)===String(e))return n;const a=st(e,n.children||[]);if(a)return a}return null}function M(){const e=s("#collectionList");if(e){if(he){e.innerHTML='<p class="empty-state">Loading collections...</p>';return}if(ae){e.innerHTML=`<div class="panel-state panel-state-error"><strong>Collections unavailable</strong><span>${f(ae)}</span></div>`;return}if(!U.length){e.innerHTML='<div class="panel-state"><strong>No collections yet</strong><span>Create a collection or import a Postman collection to start organizing requests.</span></div>';return}e.innerHTML=U.map(t=>ot(t,0)).join("")}}function ot(e,t=0){const n=ne.has(String(e.id)),a=(e.children||[]).map(i=>ot(i,t+1)).join(""),r=(e.requests||[]).map(i=>`
    <button class="request-item ${String(i.id)===String(z)?"active":""}" type="button" data-id="${i.id}" data-collection-id="${e.id}" style="--tree-depth: ${t+1}">
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
  `}function Cn(e){const t=e.trim().toLowerCase();v("#collectionList .collection-folder, #collectionList .request-item").forEach(n=>{n.hidden=!1}),t&&(v("#collectionList .request-item").forEach(n=>{n.hidden=!n.textContent.toLowerCase().includes(t)}),v("#collectionList .collection-folder").forEach(n=>{var o;const a=(o=n.querySelector(".folder-name"))==null?void 0:o.textContent.toLowerCase().includes(t),r=Array.from(n.querySelectorAll(".request-item:not([hidden]), .collection-folder:not([hidden])")).some(i=>i!==n);n.hidden=!(a||r)}))}function rt(){return`tab_${Date.now()}_${X++}`}function ie(){return{id:rt(),requestId:null,collectionId:k,title:`Unsaved Request ${X-1}`,state:T()}}function O(){if(!b.length){const e=ie();b=[e],$=e.id,I()}}function Y(){return O(),b.find(e=>e.id===$)||b[0]}function q(e){$=e.id,z=e.requestId,k=e.collectionId||k,w={...T(),...e.state||{}}}function Q(){const e=Y();e&&(e.state=Be(),e.requestId=z,e.collectionId=k,e.title=e.requestId?e.state.name||w.name||"Untitled Request":e.title||"Unsaved Request",w={...T(),...e.state},I())}function it(e){if(O(),$===e)return;Q();const t=b.find(n=>n.id===e);t&&(q(t),_(w),R(),M(),I())}function Sn(){O(),Q();const e=ie();b.push(e),q(e),_(w),R(),M(),I()}function xn(e){if(O(),b.length===1){b=[ie()],q(b[0]),_(w),R(),M(),I();return}const t=b.findIndex(a=>a.id===e);if(t===-1)return;const n=$===e;if(b.splice(t,1),n){const a=b[Math.max(0,t-1)]||b[0];q(a),_(w)}R(),M(),I()}async function Ln(e){O();const t=b.find(r=>String(r.requestId)===String(e));if(t){it(t.id);return}const n=await S.getRequest(e);Q();const a={id:rt(),requestId:n.id,collectionId:n.collection_id,title:n.name||"Untitled Request",state:{...T(),...n,body_type:n.body_type||(n.body?"text":"none"),body_content:n.body_content??n.body??"",form_data:n.form_data||[],auth_config:n.auth_config||{}}};b.push(a),q(a),_(w),M(),R(),I()}function R(){O();const e=s("#requestTabs");e&&(e.innerHTML=b.map(t=>{var o;const n=t.requestId?((o=t.state)==null?void 0:o.name)||t.title||"Untitled Request":t.title||"Unsaved Request",a=t.id===$,r=b.length>1;return`
      <div class="request-tab-item${a?" active":""}" data-tab-id="${f(t.id)}">
        <button class="request-tab-trigger" type="button" data-tab-id="${f(t.id)}">${f(n)}</button>
        ${r?`<button class="request-tab-close" type="button" data-close-tab="${f(t.id)}" aria-label="Close ${f(n)}">×</button>`:""}
      </div>
    `}).join(""))}function En(){var e,t,n,a,r,o,i,l,d;(e=s("#newCollectionBtn"))==null||e.addEventListener("click",()=>{s("#collectionModalTitle").textContent="New Collection",s("#editCollectionId").value="",s("#newColName").value="",s("#newColDesc").value="",W("newCollectionModal")}),(t=s("#newColModalClose"))==null||t.addEventListener("click",()=>x("newCollectionModal")),(n=s("#newColCancelBtn"))==null||n.addEventListener("click",()=>x("newCollectionModal")),(a=s("#newColSaveBtn"))==null||a.addEventListener("click",Tn),(r=s("#collectionSearchInput"))==null||r.addEventListener("input",c=>Cn(c.target.value)),(o=s("#collectionList"))==null||o.addEventListener("click",c=>{const p=c.target.closest(".request-item");if(p){Ln(p.dataset.id);return}const u=c.target.closest(".folder-header");if(u){k=u.dataset.id;const g=String(k);ne.has(g)?ne.delete(g):ne.add(g),M()}}),(i=s("#collectionList"))==null||i.addEventListener("contextmenu",c=>{const p=c.target.closest(".folder-header"),u=c.target.closest(".request-item");if(!p&&!u)return;c.preventDefault(),D=(p==null?void 0:p.dataset.id)||(u==null?void 0:u.dataset.collectionId)||null,H=(u==null?void 0:u.dataset.id)||null;const g=s(u?"#requestContextMenu":"#contextMenu");kn(g,c.clientX,c.clientY)}),(l=s("#contextMenu"))==null||l.addEventListener("click",qn),(d=s("#requestContextMenu"))==null||d.addEventListener("click",Rn),document.addEventListener("click",c=>{c.target.closest(".context-menu")||le()})}async function Tn(){const e=s("#newColName").value.trim();if(!e)return;const t=s("#editCollectionId").value;t?await S.updateCollection(t,{name:e,description:s("#newColDesc").value}):await S.createCollection({name:e,description:s("#newColDesc").value}),x("newCollectionModal"),await A()}function kn(e,t,n){le(),e.style.left=`${t}px`,e.style.top=`${n}px`,e.classList.add("active")}function le(){v(".context-menu").forEach(e=>e.classList.remove("active"))}async function qn(e){var n;const t=(n=e.target.closest("[data-action]"))==null?void 0:n.dataset.action;if(!(!t||!D))if(le(),t==="add-request")lt({collectionId:D});else if(t==="edit"){const a=st(D);if(!a)return;s("#collectionModalTitle").textContent="Rename Collection",s("#editCollectionId").value=a.id,s("#newColName").value=a.name||"",s("#newColDesc").value=a.description||"",W("newCollectionModal")}else t==="duplicate"?(await S.duplicateCollection(D),await A()):t==="delete"&&confirm("Delete this collection and its requests?")&&(await S.deleteCollection(D),await A())}async function Rn(e){var n;const t=(n=e.target.closest("[data-action]"))==null?void 0:n.dataset.action;if(!(!t||!H))if(le(),t==="edit"){const a=await S.getRequest(H);lt({collectionId:a.collection_id,request:a})}else t==="duplicate"?(await S.duplicateRequest(H),await A()):t==="delete"&&confirm("Delete this request?")&&(await S.deleteRequest(H),b=b.filter(a=>String(a.requestId)!==String(H)),b.length?String(z)===String(H)&&(q(b[0]),_(w)):(b=[ie()],q(b[0]),_(w)),R(),I(),await A())}function lt({collectionId:e,request:t=null}){s("#requestModalTitle").textContent=t?"Rename Request":"New Request",s("#editRequestId").value=(t==null?void 0:t.id)||"",s("#editRequestCollectionId").value=e||k||"",s("#reqNameInput").value=(t==null?void 0:t.name)||"",W("requestModal"),s("#reqNameInput").focus()}function _n(){var e,t,n;(e=s("#reqModalClose"))==null||e.addEventListener("click",()=>x("requestModal")),(t=s("#reqCancelBtn"))==null||t.addEventListener("click",()=>x("requestModal")),(n=s("#reqSaveBtn"))==null||n.addEventListener("click",async()=>{var i;const a=s("#reqNameInput").value.trim(),r=s("#editRequestId").value,o=s("#editRequestCollectionId").value||k||((i=at(U)[0])==null?void 0:i.id);if(!(!a||!o)){if(r)await S.updateRequest(r,{name:a}),b.forEach(l=>{String(l.requestId)===String(r)&&(l.title=a,l.state={...T(),...l.state||{},name:a})});else{const l=await S.createRequest({...T(),name:a,collection_id:Number(o)}),d=Y();d&&(d.requestId=l.id,d.collectionId=Number(o),d.title=a,d.state={...T(),...d.state||{},name:a,collection_id:Number(o)}),z=l.id}I(),x("requestModal"),await A(),R()}})}function V(e,t,n=""){const a=document.createElement("input");return a.type="text",a.className=`form-input ${e}`,a.placeholder=t,a.value=n||"",a}function de(e="",t=""){const n=document.createElement("div");n.className="key-value-row header-row",n.append(V("header-key","Header name",e),V("header-value","Header value",t));const a=document.createElement("button");a.className="btn btn-icon btn-remove",a.type="button",a.textContent="×",a.addEventListener("click",()=>n.remove()),n.append(a),s("#headersContainer").append(n)}function dt(){s("#headersContainer .header-row")||de()}function se(e="",t=""){const n=document.createElement("div");n.className="key-value-row form-data-row",n.append(V("form-data-key","Field name",e),V("form-data-value","Field value or @file path",t));const a=document.createElement("button");a.className="btn btn-icon btn-remove",a.type="button",a.textContent="×",a.addEventListener("click",()=>n.remove()),n.append(a),s("#formDataRows").append(n)}function qe(e="",t="",n="",a=!0){const r=document.createElement("tr");r.innerHTML=`
    <td><input type="checkbox" class="param-enabled" ${a?"checked":""}></td>
    <td><input type="text" class="form-input param-key" value="${f(e)}" placeholder="key"></td>
    <td><input type="text" class="form-input param-value" value="${f(t)}" placeholder="value"></td>
    <td><input type="text" class="form-input param-desc" value="${f(n)}" placeholder="description"></td>
    <td><button class="btn btn-icon param-remove" type="button">×</button></td>
  `,r.querySelector(".param-remove").addEventListener("click",()=>{r.remove(),me()}),r.querySelectorAll("input").forEach(o=>o.addEventListener("input",me)),r.querySelector(".param-enabled").addEventListener("change",me),s("#paramsBody").append(r)}function Ve(e){try{return decodeURIComponent(e)}catch{return e}}function Re(){const e=s("#urlInput").value||"",t=e.indexOf("?");if(s("#paramsBody").innerHTML="",t===-1)return;const n=e.indexOf("#",t),a=e.slice(t+1,n===-1?void 0:n);a&&a.split("&").filter(Boolean).forEach(r=>{const o=r.indexOf("="),i=o===-1?r:r.slice(0,o),l=o===-1?"":r.slice(o+1);qe(Ve(i.replace(/\+/g," ")),Ve(l.replace(/\+/g," ")),"",!0)})}function me(){const e=s("#urlInput"),t=e.value||"",[n,a=""]=t.split("#"),r=n.split("?")[0],o=pt().filter(i=>i.enabled&&i.key).map(i=>`${encodeURIComponent(i.key)}=${encodeURIComponent(i.value||"")}`).join("&");e.value=`${r}${o?`?${o}`:""}${a?`#${a}`:""}`}function ct(){var a;const e=((a=document.querySelector('input[name="bodyType"]:checked'))==null?void 0:a.value)||"none",t=["json","text","xml"].includes(e),n=["form-urlencoded","form-data"].includes(e);s("#bodyContentEditor").hidden=!t,s("#formDataContainer").hidden=!n}function ut(e="none",t={}){const n=s("#authFields");n&&(e==="bearer"?(n.innerHTML='<label class="field" for="authToken"><span>Token</span><input id="authToken" class="form-input" type="password" placeholder="Bearer token"></label>',s("#authToken").value=t.token||""):e==="basic"?(n.innerHTML=`
      <label class="field" for="authUser"><span>Username</span><input id="authUser" class="form-input" type="text"></label>
      <label class="field" for="authPass"><span>Password</span><input id="authPass" class="form-input" type="password"></label>
    `,s("#authUser").value=t.username||"",s("#authPass").value=t.password||""):e==="apikey"?(n.innerHTML=`
      <label class="field" for="authApiKey"><span>Key</span><input id="authApiKey" class="form-input" type="text"></label>
      <label class="field" for="authApiValue"><span>Value</span><input id="authApiValue" class="form-input" type="password"></label>
      <label class="field" for="authApiIn"><span>Add to</span><select id="authApiIn" class="form-select"><option value="header">Header</option><option value="query">Query</option></select></label>
    `,s("#authApiKey").value=t.key||"",s("#authApiValue").value=t.value||"",s("#authApiIn").value=t.in||"header"):n.innerHTML='<p class="empty-state">No authentication will be added.</p>')}function _e(e){const t=document.querySelector(`input[name="bodyType"][value="${e}"]`);t&&(t.checked=!0),ct()}function Bn(e,t={}){const n=document.querySelector(`input[name="authType"][value="${e}"]`);n&&(n.checked=!0),ut(e,t)}function _(e){var t,n;s("#methodSelect").value=e.method||"GET",s("#urlInput").value=e.url||"",s("#paramsBody").innerHTML="",(e.params||[]).forEach(a=>qe(a.key,a.value,a.description||"",a.enabled!==!1)),(t=e.params)!=null&&t.length||Re(),s("#headersContainer").innerHTML="",(e.headers||[]).forEach(a=>de(a.key||a.name||"",a.value||"")),dt(),_e(e.body_type||"none"),s("#bodyContent").value=e.body_content||e.body||"",s("#formDataRows").innerHTML="",(e.form_data||[]).forEach(a=>se(a.key||"",a.value||"")),(n=e.form_data)!=null&&n.length||se(),Bn(e.auth_type||"none",e.auth_config||{})}function pt(){return v("#paramsBody tr").map(e=>({enabled:e.querySelector(".param-enabled").checked,key:e.querySelector(".param-key").value.trim(),value:e.querySelector(".param-value").value,description:e.querySelector(".param-desc").value}))}function In(){return v("#headersContainer .header-row").map(e=>({key:h(e.querySelector(".header-key").value.trim()),value:h(e.querySelector(".header-value").value)})).filter(e=>e.key)}function Mn(){return v("#formDataRows .form-data-row").map(e=>({key:h(e.querySelector(".form-data-key").value.trim()),value:h(e.querySelector(".form-data-value").value)})).filter(e=>e.key)}function $n(){var t,n,a,r,o,i,l;const e=((t=document.querySelector('input[name="authType"]:checked'))==null?void 0:t.value)||"none";return e==="bearer"?{token:((n=s("#authToken"))==null?void 0:n.value)||""}:e==="basic"?{username:((a=s("#authUser"))==null?void 0:a.value)||"",password:((r=s("#authPass"))==null?void 0:r.value)||""}:e==="apikey"?{key:((o=s("#authApiKey"))==null?void 0:o.value)||"",value:((i=s("#authApiValue"))==null?void 0:i.value)||"",in:((l=s("#authApiIn"))==null?void 0:l.value)||"header"}:{}}function Be(){var n,a;const e=((n=document.querySelector('input[name="bodyType"]:checked'))==null?void 0:n.value)||"none",t=((a=document.querySelector('input[name="authType"]:checked'))==null?void 0:a.value)||"none";return{...w,method:s("#methodSelect").value,url:s("#urlInput").value.trim(),params:pt(),headers:In(),body_type:e,body_content:s("#bodyContent").value,form_data:Mn(),auth_type:t,auth_config:$n()}}function bt(e){return e.reduce((t,n)=>(n.key&&(t[n.key]=n.value),t),{})}function ft(e){const t=[...e.headers],n=[...e.params],a=e.auth_config||{};return e.auth_type==="bearer"&&a.token?t.push({key:"Authorization",value:`Bearer ${h(a.token)}`}):e.auth_type==="basic"&&(a.username||a.password)?t.push({key:"Authorization",value:`Basic ${btoa(`${h(a.username)}:${h(a.password)}`)}`}):e.auth_type==="apikey"&&a.key&&(a.in==="query"?n.push({enabled:!0,key:a.key,value:a.value||""}):t.push({key:a.key,value:a.value||""})),{...e,headers:t,params:n}}function yt(e){const[t,n=""]=h(e.url).split("#"),[a,r=""]=t.split("?"),o=new URLSearchParams(r);e.params.filter(l=>l.enabled&&l.key).forEach(l=>o.set(h(l.key),h(l.value)));const i=o.toString();return`${a}${i?`?${i}`:""}${n?`#${n}`:""}`}function vt(e){const t=ft(e),n=t.body_type==="json"?"application/json":t.body_type==="form-urlencoded"?"application/x-www-form-urlencoded":t.body_type==="form-data"?"multipart/form-data":"",a={method:t.method,url:yt(t),headers:bt(t.headers),contentType:n,body:["json","text","xml"].includes(t.body_type)?h(t.body_content):"",formData:t.body_type==="form-data"||t.body_type==="form-urlencoded"?t.form_data:[],verifySsl:!0};return t.body_type==="form-data"&&delete a.body,n||delete a.contentType,a}function Nn(e){const t=ft(e),n=bt(t.headers);let a;return t.body_type==="json"?(n["Content-Type"]=n["Content-Type"]||"application/json",a=h(t.body_content)):["text","xml"].includes(t.body_type)?a=h(t.body_content):t.body_type==="form-urlencoded"?(n["Content-Type"]=n["Content-Type"]||"application/x-www-form-urlencoded",a=new URLSearchParams(t.form_data.map(r=>[h(r.key),h(r.value)]))):t.body_type==="form-data"&&(a=new FormData,t.form_data.forEach(r=>a.append(h(r.key),h(r.value)))),{url:yt(t),options:{method:t.method,headers:n,body:["GET","HEAD"].includes(t.method)?void 0:a,credentials:s("#clientCredentialsSelect").value}}}async function An(e){if(s("#executionModeSelect").value==="client"){const{url:n,options:a}=Nn(e),r=performance.now(),o=await fetch(n,a),i=await o.text();let l=i;try{l=JSON.parse(i)}catch{}return{status:o.status,statusText:o.statusText,headers:Object.fromEntries(o.headers.entries()),body:l,time:Math.round(performance.now()-r)}}return S.sendProxyRequest(vt(e))}function On(){s("#statusCode").textContent="---",s("#responseTime").textContent="0 ms",s("#responseSize").textContent="0 B",s("#responseHeaders").textContent="",et(s("#responseBody"),"Send a request to see the response here.",{})}function mt(e){G=e,s("#statusCode").textContent=`${e.status||0} ${e.statusText||""}`.trim(),s("#statusCode").className=`status-badge ${e.status>=200&&e.status<300?"success":e.status>=400?"error":"warning"}`,s("#responseTime").textContent=`${e.time||0} ms`;const t=typeof e.body=="string"?e.body:JSON.stringify(e.body||"",null,2);s("#responseSize").textContent=Gt(new Blob([t]).size),s("#responseHeaders").textContent=JSON.stringify(e.headers||{},null,2),et(s("#responseBody"),e.body??"",e.headers||{})}async function ht(){const e=Be();if(!e.url){Je(s("#responseBody"),{title:"URL is required",message:"Enter a request URL before sending.",likelyCause:"The request URL field is empty.",suggestedFix:"Paste a full http:// or https:// URL."});return}try{s("#sendBtn").disabled=!0;const t=await An(e);mt(t),B.unshift({method:e.method,url:e.url,status:t.status,at:new Date().toISOString()}),B=B.slice(0,25),Jt(B,C.currentUser),Ie()}catch(t){Je(s("#responseBody"),{title:"Request failed",message:t.message,likelyCause:"The request executor returned an error.",suggestedFix:"Check the URL, proxy mode, and headers.",detailsText:JSON.stringify(t.payload||t,null,2)})}finally{s("#sendBtn").disabled=!1}}function Hn(){var e,t,n,a,r,o,i,l,d,c,p,u,g,m,E;O(),q(Y()),_(w),R(),(e=s("#requestBar"))==null||e.addEventListener("input",ye),(t=s("#requestSection"))==null||t.addEventListener("input",ye),(n=s("#requestSection"))==null||n.addEventListener("change",ye),(a=s("#newTabBtn"))==null||a.addEventListener("click",()=>{Sn()}),(r=s("#requestTabs"))==null||r.addEventListener("click",y=>{const L=y.target.closest("[data-close-tab]");if(L){xn(L.dataset.closeTab);return}const Z=y.target.closest("[data-tab-id]");Z&&it(Z.dataset.tabId)}),(o=s("#sendBtn"))==null||o.addEventListener("click",ht),(i=s("#addHeaderBtn"))==null||i.addEventListener("click",()=>de()),(l=s("#addParamBtn"))==null||l.addEventListener("click",()=>qe()),(d=s("#addFormDataBtn"))==null||d.addEventListener("click",()=>se()),(c=s("#urlInput"))==null||c.addEventListener("input",Re),(p=s("#prettifyJsonBtn"))==null||p.addEventListener("click",()=>{try{s("#bodyContent").value=JSON.stringify(JSON.parse(s("#bodyContent").value),null,2),_e("json")}catch{alert("Body is not valid JSON.")}}),v('input[name="bodyType"]').forEach(y=>y.addEventListener("change",ct)),v('input[name="authType"]').forEach(y=>y.addEventListener("change",()=>ut(y.value))),v(".tab").forEach(y=>y.addEventListener("click",()=>Un(y.dataset.tab))),v(".response-tab").forEach(y=>y.addEventListener("click",()=>Pn(y.dataset.rtab))),(u=s("#responseBodyViewer"))==null||u.addEventListener("click",y=>{const L=y.target.closest(".json-tree-toggle");L&&fn(s("#responseBody"),L)}),(g=s("#copyResponseBtn"))==null||g.addEventListener("click",async()=>{var L;const y=s("#responseBodyCode");await((L=navigator.clipboard)==null?void 0:L.writeText((y==null?void 0:y.textContent)||""))}),(m=s("#responseFullscreenBtn"))==null||m.addEventListener("click",()=>{s("#responseSection").classList.toggle("fullscreen")}),(E=s("#loopBtn"))==null||E.addEventListener("click",gt),window.addEventListener("beforeunload",()=>{K(C)&&b.length&&Q()})}function Un(e){v(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===e)),v(".tab-content").forEach(t=>t.classList.toggle("active",t.id===`${e}-tab`))}function Pn(e){v(".response-tab").forEach(t=>t.classList.toggle("active",t.dataset.rtab===e)),v(".response-tab-content").forEach(t=>t.classList.toggle("active",t.id===`response-${e}-tab`))}function gt(){const e=s("#loopControls");if(ee){clearInterval(ee),ee=null,e.hidden=!0,s("#loopStatus").textContent="";return}e.hidden=!1;const t=Math.max(100,Number(s("#loopInterval").value||1e3));F=Number(s("#loopCount").value||0),ee=setInterval(async()=>{F>0&&(F-=1,F===0&&gt()),s("#loopStatus").textContent=F>0?`${F} remaining`:"Running",await ht()},t)}function Ie(){const e=s("#historyList");e&&(e.innerHTML=B.length?B.map(t=>`<button class="history-item" type="button">${f(t.method)} ${f(t.url)} <span>${f(String(t.status||""))}</span></button>`).join(""):'<p class="empty-state">No history yet.</p>')}function wt(){const e=s("#envVarsList");if(!e)return;const t=Object.entries(N);e.innerHTML="",t.forEach(([n,a])=>we(n,a)),t.length||we()}function we(e="",t=""){const n=document.createElement("div");n.className="key-value-row env-row",n.append(V("env-key","key",e),V("env-val","value",t));const a=document.createElement("button");a.className="btn btn-icon",a.type="button",a.textContent="×",a.addEventListener("click",()=>{n.remove(),ze()}),n.append(a),n.querySelectorAll("input").forEach(r=>r.addEventListener("input",ze)),s("#envVarsList").append(n)}function ze(){N=v("#envVarsList .env-row").reduce((e,t)=>{const n=t.querySelector(".env-key").value.trim();return n&&(e[n]=t.querySelector(".env-val").value),e},{}),Ft(N,C.currentUser)}function jn(){var e,t,n;(e=s("#openEnvVarsModalBtn"))==null||e.addEventListener("click",()=>W("envVarsModal")),(t=s("#envVarsModalClose"))==null||t.addEventListener("click",()=>x("envVarsModal")),(n=s("#addEnvVarBtn"))==null||n.addEventListener("click",()=>we())}function Fn(){var e,t,n,a;v(".sidebar-tab, .category-tab[data-target]").forEach(r=>{r.addEventListener("click",()=>{v(".sidebar-tabs .category-tab").forEach(o=>o.classList.toggle("active",o===r)),v(".sidebar-panel").forEach(o=>o.classList.toggle("active",o.id===r.dataset.target))})}),(e=s("#sidebarToggleBtn"))==null||e.addEventListener("click",()=>s("#sidebar").classList.add("is-open")),(t=s("#sidebarCloseBtn"))==null||t.addEventListener("click",()=>s("#sidebar").classList.remove("is-open")),(n=s("#rightSidebarToggleBtn"))==null||n.addEventListener("click",()=>s("#rightSidebar").classList.add("is-open")),(a=s("#rightSidebarCloseBtn"))==null||a.addEventListener("click",()=>s("#rightSidebar").classList.remove("is-open"))}function Dn(){nn({shell:s("#appContainer"),sidebarHandle:s("#sidebarResizeHandle"),toolsHandle:s("#toolsResizeHandle"),responseHandle:s("#responseResizeHandle")})}function Jn(){var t,n,a,r,o,i,l;const e={setMethod:d=>{s("#methodSelect").value=d},setUrl:d=>{s("#urlInput").value=d},syncParamsFromUrl:Re,clearHeaders:()=>{s("#headersContainer").innerHTML=""},addHeaderRow:de,ensureHeaderRow:dt,setBodyType:_e,setBodyContent:d=>{s("#bodyContent").value=d||""},clearFormData:()=>{s("#formDataRows").innerHTML=""},addFormDataRow:se};(t=s("#importBtn"))==null||t.addEventListener("click",()=>W("importModal")),(n=s("#modalClose"))==null||n.addEventListener("click",()=>x("importModal")),(a=s("#exampleCurlBtn"))==null||a.addEventListener("click",()=>{s("#importInput").value=`curl -X POST https://httpbin.org/post -H 'Content-Type: application/json' --data '{"hello":"world"}'`}),v(".import-tab").forEach(d=>{d.addEventListener("click",()=>{v(".import-tab").forEach(c=>c.classList.toggle("active",c===d)),v(".import-panel").forEach(c=>c.classList.toggle("active",c.id===`import-${d.dataset.importTab}-panel`))})}),(r=s("#browseFileBtn"))==null||r.addEventListener("click",()=>s("#importFileInput").click()),(o=s("#importFileInput"))==null||o.addEventListener("change",async d=>{var p;const c=(p=d.target.files)==null?void 0:p[0];c&&(s("#selectedFileName").textContent=c.name,s("#importInput").value=await c.text())}),(i=s("#importConfirmBtn"))==null||i.addEventListener("click",async()=>{const d=s("#importInput").value.trim();if(d)try{let c;if(d.startsWith("curl")){try{c=await S.importData({type:"curl",data:d})}catch{c=Ae(d)}Ne(c,e)}else await S.importData({type:"postman",data:JSON.parse(d)}),await A();x("importModal")}catch(c){alert(`Import failed: ${c.message}`)}}),(l=s("#urlInput"))==null||l.addEventListener("paste",d=>{var u;const c=((u=d.clipboardData)==null?void 0:u.getData("text"))||"";if(!c.trim().startsWith("curl"))return;d.preventDefault();const p=Ce(Ae(c));Ne(p,e)})}function Vn(){const e=Be(),t=vt(e),n=Object.entries(t.headers||{}).map(([o,i])=>`-H ${JSON.stringify(`${o}: ${i}`)}`),a=t.body?` --data ${JSON.stringify(t.body)}`:"",r=["curl","-X",t.method,...n,JSON.stringify(t.url)].join(" ")+a;s("#sidebarCurlOutput").value=r}function zn(){var e,t,n,a;(e=s("#generateSidebarCurlBtn"))==null||e.addEventListener("click",Vn),(t=s("#copySidebarCurlBtn"))==null||t.addEventListener("click",async()=>{var r;return(r=navigator.clipboard)==null?void 0:r.writeText(s("#sidebarCurlOutput").value)}),(n=s("#saveInstanceBtn"))==null||n.addEventListener("click",We),(a=s("#saveResponseSnapshotBtn"))==null||a.addEventListener("click",We)}function We(){if(!G){s("#responseSnapshotFeedback").textContent="Send a response before saving a snapshot.";return}const e=document.createElement("button");e.className="snapshot-list-item",e.type="button",e.textContent=`${G.status||0} ${new Date().toLocaleTimeString()}`,e.addEventListener("click",()=>mt(G)),s("#snapshotList").prepend(e),s("#responseSnapshotFeedback").textContent="Snapshot saved."}function Wn(){document.addEventListener("click",e=>{var a;const t=e.target.closest("[data-close-modal]");t&&x(t.dataset.closeModal);const n=(a=e.target.classList)!=null&&a.contains("modal")?e.target:null;n&&x(n.id)}),document.addEventListener("keydown",e=>{e.key==="Escape"&&v(".modal.active").forEach(t=>x(t.id))})}function Gn(){wn(),Dn(),En(),_n(),Hn(),jn(),Fn(),Jn(),zn(),Wn(),gn()}document.querySelector("#root").innerHTML=Nt();Gn();
