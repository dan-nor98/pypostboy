import React, {useCallback, useRef, useState} from 'react';
import {AlertTriangle, CheckCircle2, Copy} from 'lucide-react';
import {CodeBlock} from './CodeBlock';
import {IconButton} from './IconButton';

function formatBody(body) {
  if (body === undefined || body === null) return [''];
  if (typeof body === 'string') return body.split('\n');
  return JSON.stringify(body, null, 2).split('\n');
}

const responseTabs = ['Body', 'Headers', 'Tests'];

function EmptyState({children, tone = ''}) {
  return <div className={`empty-state${tone ? ` ${tone}` : ''}`}>{children}</div>;
}

export function ResponseViewer({response, loading = false, error = ''}) {
  const headers = response?.headers ? Object.entries(response.headers) : [];
  const size = response?.body ? new Blob([typeof response.body === 'string' ? response.body : JSON.stringify(response.body)]).size : 0;
  const [activeTab, setActiveTab] = useState('Body');
  const tabRefs = useRef({});

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
        <IconButton label="Copy response body"><Copy size={14} /></IconButton>
      </div>
      <div className="response-panels">
        <div className="response-body" id="response-panel-body" role="tabpanel" aria-labelledby="response-tab-body" tabIndex={0} hidden={activeTab !== 'Body'}>
          {error ? <EmptyState tone="error">{error}</EmptyState> : <CodeBlock response lines={formatBody(response?.body)} />}
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
