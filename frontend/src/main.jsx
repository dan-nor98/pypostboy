import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ChevronDown, Search, Settings} from 'lucide-react';
import {
  ActivityBar,
  Button,
  CodeEditor,
  CommandPalette,
  EditableGrid,
  IconButton,
  RequestTabs,
  RequestToolbar,
  ResponseViewer,
  Sidebar,
  StatusBar,
} from './components';
import {apiClient} from './api/client';
import {params} from './data/demoWorkspace';
import './styles.css';

const defaultRequest = {
  method: 'GET',
  url: '',
  name: 'Untitled Request',
  headers: [],
  body_content: '',
  body_raw_type: 'application/json',
};

function flattenRequests(collections) {
  return collections.flatMap((collection) => [
    ...(collection.requests || []),
    ...flattenRequests(collection.children || []),
  ]);
}

function headersArrayToObject(headers = []) {
  return headers.reduce((result, header) => {
    if (Array.isArray(header)) {
      const [enabled, key, value] = header.length > 2 ? header : ['✓', header[0], header[1]];
      if (enabled && key) result[key] = value;
      return result;
    }
    if (header?.enabled !== false && header?.key) result[header.key] = header.value || '';
    return result;
  }, {});
}

function App() {
  const [palette, setPalette] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [sending, setSending] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState('');
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [proxyResult, setProxyResult] = useState(null);
  const [proxyError, setProxyError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadCollections() {
      setCollectionsLoading(true);
      setCollectionsError('');
      try {
        const data = await apiClient.listCollections();
        if (!cancelled) {
          setCollections(data);
          setActiveRequestId((current) => current || flattenRequests(data)[0]?.id || null);
        }
      } catch (error) {
        if (!cancelled) setCollectionsError(error.message);
      } finally {
        if (!cancelled) setCollectionsLoading(false);
      }
    }
    loadCollections();
    return () => { cancelled = true; };
  }, []);

  const requests = useMemo(() => flattenRequests(collections), [collections]);
  const activeRequest = requests.find((request) => request.id === activeRequestId) || requests[0] || defaultRequest;
  const requestBody = activeRequest.body_content || activeRequest.body_raw || '';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    const handleKeyDown = (event) => {
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key === 'Enter') {
        event.preventDefault();
        sendRequest();
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setPalette((open) => !open);
      }

      if (meta && event.key === ',') {
        event.preventDefault();
        setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
      }
    };

    addEventListener('keydown', handleKeyDown);
    return () => removeEventListener('keydown', handleKeyDown);
  }, [theme, activeRequest]);

  const sendRequest = async () => {
    if (!activeRequest.url) {
      setProxyError('Select a request with a URL before sending.');
      return;
    }

    setSending(true);
    setProxyError('');
    setProxyResult(null);
    try {
      const result = await apiClient.proxyRequest({
        method: activeRequest.method || 'GET',
        url: activeRequest.url,
        headers: headersArrayToObject(activeRequest.headers),
        body: requestBody,
        contentType: activeRequest.body_raw_type || 'application/json',
      });
      setProxyResult(result);
    } catch (error) {
      setProxyError(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="header">
        <strong className="brand">PostBoy</strong>
        <button className="selector">Workspace: Local API <ChevronDown size={13} /></button>
        <button className="selector">Environment: Local <ChevronDown size={13} /></button>
        <div className="global-search"><Search size={14} /><input placeholder="Search requests, URLs, headers (Ctrl+Shift+F)" /></div>
        <Button kind="ghost" onClick={() => setPalette(true)}>Command Palette <kbd>Ctrl⇧P</kbd></Button>
        <IconButton label="Toggle theme Ctrl+,"><Settings size={16} /></IconButton>
      </header>

      <main className="workspace">
        <ActivityBar />
        <Sidebar
          collections={collections}
          loading={collectionsLoading}
          error={collectionsError}
          activeRequestId={activeRequest.id}
          onSelectRequest={setActiveRequestId}
        />
        <section className="main">
          <RequestTabs requests={requests} activeRequestId={activeRequest.id} onSelectRequest={setActiveRequestId} loading={collectionsLoading} error={collectionsError} />
          <RequestToolbar sending={sending} onSend={sendRequest} request={activeRequest} disabled={!activeRequest.url} />
          <div className="panel-tabs">
            <button className="active">Params</button><button>Authorization</button><button>Headers</button><button>Body</button><button>Scripts</button><button>Tests</button>
            {collectionsError && <span className="inline-error">{collectionsError}</span>}
          </div>
          <div className="request-grid">
            <section>
              <div className="section-head"><span>Query Parameters</span><button>Bulk Edit</button></div>
              {requests.length ? <EditableGrid rows={params} type="parameter" /> : <div className="empty-state">No requests yet. Create or import a request to begin.</div>}
              <CodeEditor value={requestBody} wordWrap label="Request JSON body editor" />
            </section>
            <aside className="inspector">
              <h3>Request</h3>
              <p className="mono variable">{activeRequest.name}</p>
              <p>{activeRequest.method} {activeRequest.url || 'No URL configured'}</p>
              <h3>Headers</h3>
              {(activeRequest.headers || []).length ? <p>{activeRequest.headers.length} configured headers</p> : <p className="hint">No headers configured.</p>}
            </aside>
          </div>
          <div className="divider" />
          <ResponseViewer response={proxyResult} loading={sending} error={proxyError} />
        </section>
      </main>

      <StatusBar />
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      {proxyError && <div className="toast error" role="status">{proxyError}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
