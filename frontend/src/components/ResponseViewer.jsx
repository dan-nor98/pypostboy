import React, {useCallback, useMemo, useRef, useState} from 'react';
import {AlertTriangle, CheckCircle2, Copy} from 'lucide-react';
import {CodeEditor} from './CodeEditor';
import {IconButton} from './IconButton';

function isRenderableResponse(response) {
  if (!response) return true;
  if (response.isBinary) return false;
  return !['binary', 'unsupported'].includes(response.bodyType);
}

function hasJsonContentType(response) {
  const contentType = response?.contentType || response?.headers?.['content-type'] || response?.headers?.['Content-Type'] || '';
  return /(^|[/+])json($|[;\s])/i.test(String(contentType));
}

function getResponseBodyDocument(response) {
  const body = response?.body;
  if (body === undefined || body === null) return {value: '', language: 'text'};
  if (typeof body !== 'string') return {value: JSON.stringify(body, null, 2), language: 'json'};

  if (!hasJsonContentType(response)) return {value: body, language: 'text'};

  try {
    return {value: JSON.stringify(JSON.parse(body), null, 2), language: 'json'};
  } catch (_error) {
    return {value: body, language: 'text'};
  }
}

const responseTabs = ['Body', 'Headers', 'Tests'];

function EmptyState({children, tone = ''}) {
  return <div className={`empty-state${tone ? ` ${tone}` : ''}`}>{children}</div>;
}

export function ResponseViewer({response, loading = false, error = ''}) {
  const headers = response?.headers ? Object.entries(response.headers) : [];
  const size = typeof response?.size === 'number' ? response.size : (response?.body ? new Blob([typeof response.body === 'string' ? response.body : JSON.stringify(response.body)]).size : 0);
  const [activeTab, setActiveTab] = useState('Body');
  const [copyStatus, setCopyStatus] = useState('');
  const tabRefs = useRef({});
  const responseBodyDocument = useMemo(() => getResponseBodyDocument(response), [response]);
  const copyableResponseBody = isRenderableResponse(response) ? responseBodyDocument.value : '';
  const canCopyResponseBody = copyableResponseBody.length > 0;

  const focusTab = useCallback((tab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => tabRefs.current[tab]?.focus());
  }, []);

  const handleResponseTabsKeyDown = useCallback((event) => {
    const currentIndex = responseTabs.indexOf(activeTab);
    const keyHandlers = {
      ArrowLeft: () => (currentIndex - 1 + responseTabs.length) % responseTabs.length,
      ArrowRight: () => (currentIndex + 1) % responseTabs.length,
      Home: () => 0,
      End: () => responseTabs.length - 1,
    };
    const getNextIndex = keyHandlers[event.key];
    if (!getNextIndex) return;
    event.preventDefault();
    focusTab(responseTabs[getNextIndex()]);
  }, [activeTab, focusTab]);

  const renderResponseBody = () => {
    if (error) return <EmptyState tone="error">{error}</EmptyState>;
    if (response?.isBinary) return <EmptyState>Binary response not displayed.</EmptyState>;
    if (response && !isRenderableResponse(response)) {
      return <EmptyState>Unsupported content type{response.contentType ? `: ${response.contentType}` : ''}. Response body not displayed.</EmptyState>;
    }
    return (
      <CodeEditor
        value={responseBodyDocument.value}
        readOnly
        language={responseBodyDocument.language}
        label="Response body viewer"
      />
    );
  };

  const handleCopyResponseBody = useCallback(async () => {
    if (!canCopyResponseBody) return;

    try {
      await navigator.clipboard.writeText(copyableResponseBody);
      setCopyStatus('Response body copied to clipboard.');
    } catch (_error) {
      setCopyStatus('Unable to copy response body to clipboard.');
    }
  }, [canCopyResponseBody, copyableResponseBody]);

  return (
    <section className="response" aria-labelledby="response-tabs-label">
      <div className="response-summary">
        {loading && <strong>Sending request…</strong>}
        {error && <strong className="status-error"><AlertTriangle size={14} /> Proxy error</strong>}
        {!loading && !error && response && <strong className="status-ok"><CheckCircle2 size={14} /> {response.status} {response.statusText}</strong>}
        {!loading && !error && !response && <span className="muted">Send a request to view the response.</span>}
        {response && <><span>{response.time} ms</span><span>{size} B</span><span>{headers.length} headers</span></>}
      </div>
      <div className="panel-tabs" role="tablist" aria-label="Response tabs" id="response-tabs-label" onKeyDown={handleResponseTabsKeyDown}>
        {responseTabs.map((tab) => {
          const selected = tab === activeTab;
          const tabSlug = tab.toLowerCase();
          return (
            <button
              key={tab}
              id={`response-tab-${tabSlug}`}
              ref={(element) => { tabRefs.current[tab] = element; }}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`response-panel-${tabSlug}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          );
        })}
        <span className="spacer" />
        <IconButton label="Copy response body" onClick={handleCopyResponseBody} disabled={!canCopyResponseBody}><Copy size={14} /></IconButton>
      </div>
      {copyStatus && <div className={`toast${copyStatus.startsWith('Unable') ? ' error' : ''}`} role="status">{copyStatus}</div>}
      <div className="response-panels">
        <div className="response-body" id="response-panel-body" role="tabpanel" aria-labelledby="response-tab-body" tabIndex={0} hidden={activeTab !== 'Body'}>
          {renderResponseBody()}
        </div>
        <div className="response-headers-panel" id="response-panel-headers" role="tabpanel" aria-labelledby="response-tab-headers" tabIndex={0} hidden={activeTab !== 'Headers'}>
          <table className="headers"><tbody>{headers.length ? headers.map(([key, value]) => <tr key={key}><td>{key}</td><td className="mono">{String(value)}</td><td>Response</td></tr>) : <tr><td className="muted">No response headers yet.</td></tr>}</tbody></table>
        </div>
        <div className="response-empty-panel" id="response-panel-tests" role="tabpanel" aria-labelledby="response-tab-tests" tabIndex={0} hidden={activeTab !== 'Tests'}>
          <EmptyState>Response tests are planned. Add a request test runner to see assertions here.</EmptyState>
        </div>
      </div>
    </section>
  );
}
