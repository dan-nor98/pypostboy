import {AlertTriangle, X} from 'lucide-react';
import {Method} from './Method';

export function RequestTabs({requests = [], activeRequestId, onSelectRequest, loading = false, error = ''}) {
  if (loading) return <div className="tabs"><span className="empty-state">Loading requests…</span></div>;
  if (error) return <div className="tabs"><span className="empty-state error"><AlertTriangle size={12} /> Unable to load requests</span></div>;
  if (!requests.length) return <div className="tabs"><span className="empty-state">No requests available</span></div>;

  return (
    <div className="tabs" role="tablist">
      {requests.slice(0, 6).map((request) => (
        <button className={`request-tab ${request.id === activeRequestId ? 'active' : ''}`} key={request.id} onClick={() => onSelectRequest?.(request.id)}>
          <Method m={request.method} />{request.name}<X size={13} />
        </button>
      ))}
    </div>
  );
}
