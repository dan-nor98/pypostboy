import React from 'react';
import {AlertTriangle, X} from 'lucide-react';
import {Method} from './Method';

export function requestTabId(requestId) {
  return `request-tab-${requestId}`;
}

export function requestPanelId(requestId) {
  return `request-panel-${requestId}`;
}

export function RequestTabs({requests = [], activeRequestId, onSelectRequest, onCloseRequest, loading = false, error = '', dirtyRequestIds = []}) {
  if (loading) return <div className="tabs"><span className="empty-state">Loading requests…</span></div>;
  if (error) return <div className="tabs"><span className="empty-state error"><AlertTriangle size={12} /> Unable to load requests</span></div>;
  if (!requests.length) return <div className="tabs"><span className="empty-state">No requests available</span></div>;

  return (
    <div className="tabs" role="tablist" aria-label="Open requests">
      {requests.slice(0, 6).map((request) => {
        const selected = request.id === activeRequestId;
        const dirty = dirtyRequestIds.includes(request.id) || request.is_draft;
        const closeLabel = `Close ${request.name}`;
        const handleTabKeyDown = (event) => {
          const closeShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'w';
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectRequest?.(request.id);
          }
          if (event.key === 'Delete' || closeShortcut) {
            event.preventDefault();
            onCloseRequest?.(request.id);
          }
        };
        return (
          <div
            className={`request-tab ${selected ? 'active' : ''}`}
            id={requestTabId(request.id)}
            key={request.id}
            role="tab"
            aria-selected={selected}
            aria-controls={requestPanelId(request.id)}
            aria-label={`${request.name}${dirty ? ' unsaved' : ''}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelectRequest?.(request.id)}
            onKeyDown={handleTabKeyDown}
          >
            <Method m={request.method} />{request.name}{dirty && <span className="dirty" aria-hidden="true">●</span>}
            <button
              className="request-tab-close"
              type="button"
              aria-label={closeLabel}
              onClick={(event) => {
                event.stopPropagation();
                onCloseRequest?.(request.id);
              }}
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
