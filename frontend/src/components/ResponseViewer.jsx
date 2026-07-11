import {CheckCircle2, Copy} from 'lucide-react';
import {headers} from '../data/demoWorkspace';
import {CodeBlock} from './CodeBlock';
import {IconButton} from './IconButton';

export function ResponseViewer() {
  return (
    <section className="response">
      <div className="response-summary">
        <strong className="status-ok"><CheckCircle2 size={14} /> 201 Created</strong>
        <span>382 ms</span><span>1.8 KB</span><span>JSON</span><span>TLS verified</span><span>14:32:18</span>
      </div>
      <div className="panel-tabs">
        <button className="active">Body</button><button>Headers</button><button>Cookies</button><button>Tests</button><button>Timeline</button><button>Console</button>
        <span className="spacer" />
        <IconButton label="Copy response body"><Copy size={14} /></IconButton>
      </div>
      <div className="response-body">
        <CodeBlock response />
        <table className="headers"><tbody>{headers.map((header) => <tr key={header[0]}><td>{header[0]}</td><td className="mono">{header[1]}</td><td>{header[2]}</td></tr>)}</tbody></table>
      </div>
    </section>
  );
}
