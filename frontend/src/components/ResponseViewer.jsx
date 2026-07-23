import React, {useCallback, useMemo, useRef, useState} from 'react';
import {AlertTriangle, CheckCircle2, Copy} from 'lucide-react';
import {CodeEditor} from './CodeEditor';
import {IconButton} from './IconButton';

// Keep inline rendering below CodeMirror stress thresholds. Larger proxy bodies
// receive a lightweight preview plus metadata so the UI remains responsive.
export const MAX_INLINE_RENDERED_RESPONSE_BYTES = 64_000;
export const MAX_COPIED_RESPONSE_BYTES = 1_000_000;

function isRenderableResponse(response) {
  if (!response) return true;
  if (response.isBinary) return false;
  return !['binary', 'unsupported'].includes(response.bodyType);
}

function hasJsonContentType(response) {
  const contentType = response?.contentType || response?.headers?.['content-type'] || response?.headers?.['Content-Type'] || '';
  return /(^|[/+])json($|[;\s])/i.test(String(contentType));
}

function formatJsonPreservingLexemes(source) {
  const text = String(source);
  let index = 0;
  let output = '';
  let indentLevel = 0;
  let inString = false;
  let escaped = false;
  const indent = () => '  '.repeat(indentLevel);

  while (index < text.length) {
    const char = text[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
    } else if (char === '{' || char === '[') {
      const nextNonWhitespace = text.slice(index + 1).match(/\S/)?.[0];
      output += char;
      if ((char === '{' && nextNonWhitespace !== '}') || (char === '[' && nextNonWhitespace !== ']')) {
        indentLevel += 1;
        output += `\n${indent()}`;
      }
    } else if (char === '}' || char === ']') {
      indentLevel = Math.max(0, indentLevel - 1);
      if (output.endsWith('{') || output.endsWith('[')) {
        output += char;
      } else {
        if (output.endsWith('\n')) {
          output += indent();
        } else {
          output += `\n${indent()}`;
        }
        output += char;
      }
    } else if (char === ',') {
      output += `,\n${indent()}`;
    } else if (char === ':') {
      output += ': ';
    } else {
      output += char;
    }

    index += 1;
  }

  return output;
}

function responseHeaderValue(response, headerName) {
  const headers = response?.headers || {};
  const lowerHeaderName = headerName.toLowerCase();
  const headerKey = Object.keys(headers).find((key) => key.toLowerCase() === lowerHeaderName);
  return headerKey ? headers[headerKey] : undefined;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'unknown size';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function responseOriginalSize(response, fallbackSize) {
  return typeof response?.originalSize === 'number' ? response.originalSize : fallbackSize;
}

function hasEmptyResponseBody(response) {
  if (!response) return false;

  const body = response.body;
  if (typeof body === 'string') return body.length === 0;
  if (body !== undefined && body !== null) return false;
  if (response.bodyType === 'empty') return true;
  if (response.size === 0) return true;

  const contentLength = responseHeaderValue(response, 'content-length');
  return contentLength !== undefined && Number(contentLength) === 0;
}

function getResponseBodyDocument(response) {
  const body = response?.body;
  if (body === undefined || body === null) return {value: '', language: 'text'};
  if (typeof body !== 'string') return {value: JSON.stringify(body, null, 2), language: 'json'};

  if (!hasJsonContentType(response)) return {value: body, language: 'text'};
  if (response.isJsonValid === false) return {value: body, language: 'text'};

  try {
    JSON.parse(body);
    return {value: formatJsonPreservingLexemes(body), language: 'json'};
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
  const originalSize = responseOriginalSize(response, size);
  const [activeTab, setActiveTab] = useState('Body');
  const [copyStatus, setCopyStatus] = useState('');
  const tabRefs = useRef({});
  const responseBodyDocument = useMemo(() => getResponseBodyDocument(response), [response]);
  const rawResponseBody = typeof response?.body === 'string' ? response.body : responseBodyDocument.value;
  const copyableResponseBody = isRenderableResponse(response) ? rawResponseBody : '';
  const copyableResponseBytes = copyableResponseBody ? new Blob([copyableResponseBody]).size : 0;
  const canCopyResponseBody = copyableResponseBody.length > 0 && copyableResponseBytes <= MAX_COPIED_RESPONSE_BYTES;

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
    if (!response) return <EmptyState>No response yet.</EmptyState>;
    if (response?.isBinary) return <EmptyState>Binary response not displayed.</EmptyState>;
    if (response && !isRenderableResponse(response)) {
      return <EmptyState>Unsupported content type{response.contentType ? `: ${response.contentType}` : ''}. Response body not displayed.</EmptyState>;
    }
    if (hasEmptyResponseBody(response)) return <EmptyState>Response body is empty.</EmptyState>;
    const displayedSize = new Blob([responseBodyDocument.value]).size;
    if (displayedSize > MAX_INLINE_RENDERED_RESPONSE_BYTES || response?.isTruncated) {
      const preview = responseBodyDocument.value.slice(0, MAX_INLINE_RENDERED_RESPONSE_BYTES);
      return (
        <div className="large-response-fallback">
          <EmptyState tone="warning">
            Response body preview truncated for responsiveness. Showing up to {formatBytes(MAX_INLINE_RENDERED_RESPONSE_BYTES)} of {formatBytes(originalSize)}.
            {response?.isTruncated ? ' The backend also truncated the copied/displayed payload.' : ''}
          </EmptyState>
          {preview && <pre className="response-preview" aria-label="Truncated response body preview">{preview}</pre>}
        </div>
      );
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
        {response && <><span>{response.time} ms</span><span>{formatBytes(originalSize)}</span>{response.isTruncated && <span>truncated</span>}<span>{headers.length} headers</span></>}
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
