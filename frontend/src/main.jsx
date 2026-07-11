import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ChevronDown, Search, Settings} from 'lucide-react';
import {
  ActivityBar,
  Button,
  CodeBlock,
  CommandPalette,
  EditableGrid,
  IconButton,
  RequestTabs,
  RequestToolbar,
  ResponseViewer,
  Sidebar,
  StatusBar,
} from './components';
import {params} from './data/demoWorkspace';
import './styles.css';

function App() {
  const [palette, setPalette] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    const handleKeyDown = (event) => {
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key === 'Enter') {
        event.preventDefault();
        setSending(true);
        setTimeout(() => setSending(false), 900);
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
  }, [theme]);

  const sendRequest = () => {
    setSending(true);
    setTimeout(() => setSending(false), 900);
  };

  return (
    <div className="app-shell">
      <header className="header">
        <strong className="brand">PostBoy</strong>
        <button className="selector">Workspace: Payments API <ChevronDown size={13} /></button>
        <button className="selector">Environment: Staging <ChevronDown size={13} /></button>
        <div className="global-search"><Search size={14} /><input placeholder="Search requests, URLs, headers (Ctrl+Shift+F)" /></div>
        <Button kind="ghost" onClick={() => setPalette(true)}>Command Palette <kbd>Ctrl⇧P</kbd></Button>
        <IconButton label="Toggle theme Ctrl+,"><Settings size={16} /></IconButton>
      </header>

      <main className="workspace">
        <ActivityBar />
        <Sidebar />
        <section className="main">
          <RequestTabs />
          <RequestToolbar sending={sending} onSend={sendRequest} />
          <div className="panel-tabs">
            <button className="active">Params</button><button>Authorization</button><button>Headers</button><button>Body</button><button>Scripts</button><button>Tests</button>
            <span className="inline-error">Invalid variable: {'{{callbackUrl}}'}</span>
          </div>
          <div className="request-grid">
            <section>
              <div className="section-head"><span>Query Parameters</span><button>Bulk Edit</button></div>
              <EditableGrid rows={params} type="parameter" />
              <CodeBlock />
            </section>
            <aside className="inspector">
              <h3>Authorization</h3>
              <label>Type<select><option>Bearer Token</option></select></label>
              <label>Token<input type="password" value="stg_••••••••••••••" readOnly /></label>
              <p className="hint">Inherited from Collection → Payments API</p>
              <h3>Variable Inspector</h3>
              <p className="mono variable">{'{{baseUrl}}'}</p>
              <p>Resolved value: https://staging.example.com</p>
              <p>Source: Environment → Staging</p>
            </aside>
          </div>
          <div className="divider" />
          <ResponseViewer />
        </section>
      </main>

      <StatusBar />
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      <div className="toast" role="status">Request saved locally · 3 unsaved changes</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
