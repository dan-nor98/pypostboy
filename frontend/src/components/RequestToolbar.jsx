import React from 'react';
import {Circle, MoreHorizontal, Play, Save} from 'lucide-react';
import {Button} from './Button';
import {IconButton} from './IconButton';

export function RequestToolbar({
  sending,
  onSend,
  request,
  disabled = false,
  onMethodChange,
  onUrlChange,
  onSave,
  saving = false,
  saveDisabled = false,
}) {
  return (
    <div className="request-toolbar">
      <select
        aria-label="HTTP method"
        className="method-select"
        value={request?.method || 'GET'}
        onChange={(event) => onMethodChange?.(event.target.value)}
      >
        <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option><option>HEAD</option><option>OPTIONS</option>
      </select>
      <input
        aria-label="Request URL"
        className="url-input"
        value={request?.url || ''}
        placeholder="Select a request"
        onChange={(event) => onUrlChange?.(event.target.value)}
      />
      <Button kind="primary" onClick={onSend} disabled={disabled || sending}>
        {sending ? <><Circle className="spin" size={14} /> Sending…</> : <><Play size={14} /> Send</>} <kbd>Ctrl↵</kbd>
      </Button>
      <Button onClick={onSave} disabled={saveDisabled || saving}>
        <Save size={14} /> {saving ? 'Saving…' : 'Save'}
      </Button>
      <IconButton label="More request actions"><MoreHorizontal size={16} /></IconButton>
    </div>
  );
}
