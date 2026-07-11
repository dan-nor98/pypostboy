import {Circle, MoreHorizontal, Play, Save} from 'lucide-react';
import {Button} from './Button';
import {IconButton} from './IconButton';

export function RequestToolbar({sending, onSend, request, disabled = false}) {
  return (
    <div className="request-toolbar">
      <select className="method-select" value={request?.method || 'GET'} onChange={() => {}}><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select>
      <input className="url-input" value={request?.url || ''} placeholder="Select a request" readOnly />
      <Button kind="primary" onClick={onSend} disabled={disabled || sending}>
        {sending ? <><Circle className="spin" size={14} /> Sending…</> : <><Play size={14} /> Send</>} <kbd>Ctrl↵</kbd>
      </Button>
      <Button><Save size={14} /> Save</Button>
      <IconButton label="More request actions"><MoreHorizontal size={16} /></IconButton>
    </div>
  );
}
