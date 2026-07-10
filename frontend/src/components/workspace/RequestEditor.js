import { selectField } from '../common/Form.js';

const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((method) => ({
  label: method,
  value: method,
  selected: method === 'GET',
}));

export function renderRequestEditor() {
  return `
    <section class="request-card" id="requestBar" aria-label="Request builder">
      <div class="url-bar">
        ${selectField({ id: 'methodSelect', label: 'Method', options: methodOptions, className: 'method-field' })}
        <label class="field url-field" for="urlInput">
          <span>URL</span>
          <input type="text" id="urlInput" class="form-input" placeholder="Enter request URL or paste cURL command...">
        </label>
        <button class="btn btn-primary send-button" id="sendBtn" type="button">Send</button>
      </div>
      <div class="request-options" id="requestBarSecondary">
        ${selectField({
          id: 'executionModeSelect',
          label: 'Run via',
          options: [
            { value: 'client', label: 'Client side' },
            { value: 'server', label: 'Server proxy', selected: true },
            { value: 'desktop-native', label: 'Desktop native' },
          ],
        })}
        ${selectField({
          id: 'clientCredentialsSelect',
          label: 'Credentials',
          options: [
            { value: 'omit', label: 'omit' },
            { value: 'same-origin', label: 'same-origin' },
            { value: 'include', label: 'include' },
          ],
        })}
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
          ${['none', 'json', 'text', 'xml', 'form-urlencoded', 'form-data'].map((type) => `
            <label><input type="radio" name="bodyType" value="${type}" ${type === 'none' ? 'checked' : ''}><span>${type}</span></label>
          `).join('')}
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
          ${[
            ['none', 'No Auth'],
            ['bearer', 'Bearer Token'],
            ['basic', 'Basic Auth'],
            ['apikey', 'API Key'],
          ].map(([value, label]) => `
            <label><input type="radio" name="authType" value="${value}" ${value === 'none' ? 'checked' : ''}><span>${label}</span></label>
          `).join('')}
        </div>
        <div class="auth-fields" id="authFields"></div>
      </div>
    </section>
  `;
}
