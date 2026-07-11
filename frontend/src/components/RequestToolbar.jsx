import {Circle, MoreHorizontal, Play, Save} from 'lucide-react';
import {Button} from './Button';
import {IconButton} from './IconButton';

export function RequestToolbar({sending, onSend}) {
  return (
    <div className="request-toolbar">
      <select className="method-select"><option>POST</option><option>GET</option></select>
      <input className="url-input" value="{{baseUrl}}/v1/deposits" readOnly />
      <Button kind="primary" onClick={onSend}>
        {sending ? <><Circle className="spin" size={14} /> Sending…</> : <><Play size={14} /> Send</>} <kbd>Ctrl↵</kbd>
      </Button>
      <Button><Save size={14} /> Save</Button>
      <IconButton label="More request actions"><MoreHorizontal size={16} /></IconButton>
    </div>
  );
}
