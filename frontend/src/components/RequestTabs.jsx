import React from 'react';
import {AlertTriangle, X} from 'lucide-react';
import {Method} from './Method';

export function requestTabId(requestId) {
  return `request-tab-${requestId}`;
}

export function requestPanelId(requestId) {
  return `request-panel-${requestId}`;
}

export function RequestTabs({requests = [], activeRequestId, onSelectRequest, loading = false, error = ''}) {
  if (loading) return <div className="tabs"><span className="empty-state">Loading requests…</span></div>;
  if (error) return <div className="tabs"><span className="empty-state error"><AlertTriangle size={12} /> Unable to load requests</span></div>;
  if (!requests.length) return <div className="tabs"><span className="empty-state">No requests available</span></div>;

  return (
    <div className="tabs" role="tablist" aria-label="Open requests">
      {requests.slice(0, 6).map((request) => {
        const selected = request.id === activeRequestId;
        return (
          <button
            className={`request-tab ${selected ? 'active' : ''}`}
            id={requestTabId(request.id)}
            key={request.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={requestPanelId(request.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelectRequest?.(request.id)}
          >
            <Method m={request.method} />{request.name}<X size={13} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
