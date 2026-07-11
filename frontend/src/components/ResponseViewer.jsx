import {AlertTriangle, CheckCircle2, Copy} from 'lucide-react';
import {CodeBlock} from './CodeBlock';
import {IconButton} from './IconButton';

function formatBody(body) {
  if (body === undefined || body === null) return [''];
  if (typeof body === 'string') return body.split('\n');
  return JSON.stringify(body, null, 2).split('\n');
}

export function ResponseViewer({response, loading = false, error = ''}) {
  const headers = response?.headers ? Object.entries(response.headers) : [];
  const size = response?.body ? new Blob([typeof response.body === 'string' ? response.body : JSON.stringify(response.body)]).size : 0;

  return (
    <section className="response">
      <div className="response-summary">
        {loading && <strong>Sending request…</strong>}
        {error && <strong className="status-error"><AlertTriangle size={14} /> Proxy error</strong>}
        {!loading && !error && response && <strong className="status-ok"><CheckCircle2 size={14} /> {response.status} {response.statusText}</strong>}
        {!loading && !error && !response && <span className="muted">Send a request to view the response.</span>}
        {response && <><span>{response.time} ms</span><span>{size} B</span><span>{headers.length} headers</span></>}
      </div>
      <div className="panel-tabs">
        <button className="active">Body</button><button>Headers</button><button>Cookies</button><button>Tests</button><button>Timeline</button><button>Console</button>
        <span className="spacer" />
        <IconButton label="Copy response body"><Copy size={14} /></IconButton>
      </div>
      <div className="response-body">
        {error ? <div className="empty-state error">{error}</div> : <CodeBlock response lines={formatBody(response?.body)} />}
        <table className="headers"><tbody>{headers.length ? headers.map(([key, value]) => <tr key={key}><td>{key}</td><td className="mono">{String(value)}</td><td>Response</td></tr>) : <tr><td className="muted">No response headers yet.</td></tr>}</tbody></table>
      </div>
    </section>
  );
}
