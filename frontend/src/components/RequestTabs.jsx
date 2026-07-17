import React, {useEffect, useRef} from 'react';
import {AlertTriangle, X} from 'lucide-react';
import {Method} from './Method';

export function requestTabId(requestId) {
  return `request-tab-${requestId}`;
}

export function requestPanelId(requestId) {
  return `request-panel-${requestId}`;
}

export function RequestTabs({requests = [], activeRequestId, onSelectRequest, onCloseRequest, loading = false, error = '', dirtyRequestIds = []}) {
  const tabRefs = useRef(new Map());
  const focusSelectedTabRef = useRef(false);

  useEffect(() => {
    if (!focusSelectedTabRef.current || !activeRequestId) return;

    focusSelectedTabRef.current = false;
    tabRefs.current.get(activeRequestId)?.focus();
  }, [activeRequestId]);

  const selectAndFocusRequest = (requestId) => {
    focusSelectedTabRef.current = true;
    onSelectRequest?.(requestId);
  };

  if (loading) return <div className="tabs"><span className="empty-state">Loading requests…</span></div>;
  if (error) return <div className="tabs"><span className="empty-state error"><AlertTriangle size={12} /> Unable to load requests</span></div>;
  if (!requests.length) return <div className="tabs"><span className="empty-state">No requests available</span></div>;

  return (
    <div className="tabs" role="tablist" aria-label="Open requests">
      {requests.map((request) => {
        const selected = request.id === activeRequestId;
        const dirty = dirtyRequestIds.includes(request.id) || request.is_draft;
        const closeLabel = `Close ${request.name}`;
        const handleTabKeyDown = (event) => {
          const closeShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'w';
          const currentIndex = requests.findIndex((item) => item.id === request.id);
          const lastIndex = requests.length - 1;
          const nextTabIndexByKey = {
            ArrowLeft: currentIndex === 0 ? lastIndex : currentIndex - 1,
            ArrowRight: currentIndex === lastIndex ? 0 : currentIndex + 1,
            Home: 0,
            End: lastIndex,
          };

          if (event.key in nextTabIndexByKey) {
            event.preventDefault();
            selectAndFocusRequest(requests[nextTabIndexByKey[event.key]].id);
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectAndFocusRequest(request.id);
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
            ref={(element) => {
              if (element) {
                tabRefs.current.set(request.id, element);
              } else {
                tabRefs.current.delete(request.id);
              }
            }}
            onClick={() => onSelectRequest?.(request.id)}
            onKeyDown={handleTabKeyDown}
          >
            <Method m={request.method} /><span className="request-tab-label">{request.name}</span>{dirty && <span className="dirty" aria-hidden="true">●</span>}
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
