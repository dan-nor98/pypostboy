import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AlertTriangle, CheckCircle2, Copy} from 'lucide-react';
import {CodeBlock} from './CodeBlock';
import {IconButton} from './IconButton';

function formatBody(body) {
  if (body === undefined || body === null) return [''];
  if (typeof body === 'string') return body.split('\n');
  return JSON.stringify(body, null, 2).split('\n');
}


const RESPONSE_HEADERS_SPLIT_STORAGE_KEY = 'pypostboy.responseHeadersRatio';
const DEFAULT_RESPONSE_HEADERS_RATIO = 35;
const MIN_RESPONSE_HEADERS_RATIO = 25;
const MAX_RESPONSE_HEADERS_RATIO = 60;
const RESPONSE_HEADERS_KEYBOARD_STEP = 5;

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readStoredNumber(key, fallback, min, max) {
  const stored = Number(localStorage.getItem(key));
  return Number.isFinite(stored) ? clampNumber(stored, min, max) : fallback;
}

const responseTabs = ['Body', 'Headers', 'Cookies', 'Tests', 'Timeline', 'Console'];

export function ResponseViewer({response, loading = false, error = ''}) {
  const headers = response?.headers ? Object.entries(response.headers) : [];
  const size = response?.body ? new Blob([typeof response.body === 'string' ? response.body : JSON.stringify(response.body)]).size : 0;
  const activeTab = 'Body';
  const bodyPanelRef = useRef(null);
  const [headersRatio, setHeadersRatio] = useState(() => readStoredNumber(RESPONSE_HEADERS_SPLIT_STORAGE_KEY, DEFAULT_RESPONSE_HEADERS_RATIO, MIN_RESPONSE_HEADERS_RATIO, MAX_RESPONSE_HEADERS_RATIO));

  useEffect(() => {
    localStorage.setItem(RESPONSE_HEADERS_SPLIT_STORAGE_KEY, String(headersRatio));
  }, [headersRatio]);

  const updateHeadersRatio = useCallback((nextRatio) => {
    setHeadersRatio(clampNumber(Math.round(nextRatio), MIN_RESPONSE_HEADERS_RATIO, MAX_RESPONSE_HEADERS_RATIO));
  }, []);

  const resizeHeadersFromClientX = useCallback((clientX) => {
    const bounds = bodyPanelRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const dividerOffset = clientX - bounds.left;
    const nextHeadersRatio = ((bounds.width - dividerOffset) / bounds.width) * 100;
    updateHeadersRatio(nextHeadersRatio);
  }, [updateHeadersRatio]);

  const handleHeadersDividerPointerDown = useCallback((event) => {
    event.preventDefault();
    resizeHeadersFromClientX(event.clientX);
    const handlePointerMove = (moveEvent) => resizeHeadersFromClientX(moveEvent.clientX);
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [resizeHeadersFromClientX]);

  const handleHeadersDividerKeyDown = useCallback((event) => {
    const keySteps = {ArrowLeft: RESPONSE_HEADERS_KEYBOARD_STEP, ArrowRight: -RESPONSE_HEADERS_KEYBOARD_STEP, Home: MAX_RESPONSE_HEADERS_RATIO - headersRatio, End: MIN_RESPONSE_HEADERS_RATIO - headersRatio};
    if (!(event.key in keySteps)) return;
    event.preventDefault();
    updateHeadersRatio(headersRatio + keySteps[event.key]);
  }, [headersRatio, updateHeadersRatio]);

  return (
    <section className="response" aria-labelledby="response-tabs-label">
      <div className="response-summary">
        {loading && <strong>Sending request…</strong>}
        {error && <strong className="status-error"><AlertTriangle size={14} /> Proxy error</strong>}
        {!loading && !error && response && <strong className="status-ok"><CheckCircle2 size={14} /> {response.status} {response.statusText}</strong>}
        {!loading && !error && !response && <span className="muted">Send a request to view the response.</span>}
        {response && <><span>{response.time} ms</span><span>{size} B</span><span>{headers.length} headers</span></>}
      </div>
      <div className="panel-tabs" role="tablist" aria-label="Response tabs" id="response-tabs-label">
        {responseTabs.map((tab) => {
          const selected = tab === activeTab;
          const tabSlug = tab.toLowerCase();
          return <button key={tab} id={`response-tab-${tabSlug}`} role="tab" type="button" aria-selected={selected} aria-controls={`response-panel-${tabSlug}`} tabIndex={selected ? 0 : -1} className={selected ? 'active' : ''}>{tab}</button>;
        })}
        <span className="spacer" />
        <IconButton label="Copy response body"><Copy size={14} /></IconButton>
      </div>
      <div className="response-body" id="response-panel-body" role="tabpanel" aria-labelledby="response-tab-body" tabIndex={0} ref={bodyPanelRef} style={{gridTemplateColumns: `minmax(0, ${100 - headersRatio}fr) 5px minmax(240px, ${headersRatio}fr)`}}>
        {error ? <div className="empty-state error">{error}</div> : <CodeBlock response lines={formatBody(response?.body)} />}
        <div
          className="divider response-headers-divider"
          role="separator"
          aria-label="Resize response body and headers"
          aria-orientation="vertical"
          aria-valuemin={MIN_RESPONSE_HEADERS_RATIO}
          aria-valuemax={MAX_RESPONSE_HEADERS_RATIO}
          aria-valuenow={headersRatio}
          tabIndex={0}
          onPointerDown={handleHeadersDividerPointerDown}
          onKeyDown={handleHeadersDividerKeyDown}
        />
        <table className="headers"><tbody>{headers.length ? headers.map(([key, value]) => <tr key={key}><td>{key}</td><td className="mono">{String(value)}</td><td>Response</td></tr>) : <tr><td className="muted">No response headers yet.</td></tr>}</tbody></table>
      </div>
      {responseTabs.filter((tab) => tab !== activeTab).map((tab) => {
        const tabSlug = tab.toLowerCase();
        return <div key={tab} id={`response-panel-${tabSlug}`} role="tabpanel" aria-labelledby={`response-tab-${tabSlug}`} hidden />;
      })}
    </section>
  );
}
