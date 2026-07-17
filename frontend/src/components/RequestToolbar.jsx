import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import {Circle, MoreHorizontal, Play, Save} from 'lucide-react';
import {Button} from './Button';
import {IconButton} from './IconButton';

function normalizeActions({actions, request, onSaveAs, onDuplicate, onRename, onMove, onExport, onGenerateCode, onDelete}) {
  if (actions) return actions.filter(Boolean);
  const isSavedRequest = request?.id && !request?.is_draft && !String(request.id).startsWith('draft-request-');
  return [
    onSaveAs && {id: 'save-as', label: 'Save as…', onSelect: onSaveAs},
    onDuplicate && {id: 'duplicate', label: 'Duplicate request', onSelect: onDuplicate},
    onRename && {id: 'rename', label: 'Rename request', onSelect: onRename},
    isSavedRequest && onMove && {id: 'move', label: 'Move request…', onSelect: onMove},
    isSavedRequest && onExport && {id: 'export', label: 'Copy as cURL', onSelect: onExport},
    onGenerateCode && {id: 'generate-code', label: 'Generate code', onSelect: onGenerateCode},
    isSavedRequest && onDelete && {id: 'delete', label: 'Delete request…', destructive: true, onSelect: onDelete},
  ].filter(Boolean);
}

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
  actions,
  onSaveAs,
  onDuplicate,
  onRename,
  onMove,
  onExport,
  onGenerateCode,
  onDelete,
}) {
  const menuId = useId();
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuActions = useMemo(
    () => normalizeActions({actions, request, onSaveAs, onDuplicate, onRename, onMove, onExport, onGenerateCode, onDelete}),
    [actions, request, onSaveAs, onDuplicate, onRename, onMove, onExport, onGenerateCode, onDelete],
  );

  const closeMenu = () => {
    setOpen(false);
    setActiveIndex(0);
  };

  const openMenu = () => {
    if (!menuActions.length) return;
    setOpen(true);
    setActiveIndex(0);
  };

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      closeMenu();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => menuRef.current?.querySelector('[role="menuitem"]')?.focus());
  }, [open]);

  const invokeAction = (action) => {
    if (!action) return;
    if (action.destructive && !window.confirm(`Delete ${request?.name || 'this request'}? This cannot be undone.`)) return;
    closeMenu();
    action.onSelect?.(request);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (activeIndex + offset + menuActions.length) % menuActions.length;
      setActiveIndex(nextIndex);
      menuRef.current?.querySelectorAll('[role="menuitem"]')[nextIndex]?.focus();
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : menuActions.length - 1;
      setActiveIndex(nextIndex);
      menuRef.current?.querySelectorAll('[role="menuitem"]')[nextIndex]?.focus();
    }
  };

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
      <div className="request-actions-menu">
        <IconButton
          ref={triggerRef}
          label="More request actions"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          disabled={!menuActions.length}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={(event) => {
            if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
              event.preventDefault();
              openMenu();
            }
          }}
        >
          <MoreHorizontal size={16} />
        </IconButton>
        {open && (
          <div id={menuId} className="request-actions-popover" role="menu" aria-label="Request actions" ref={menuRef} onKeyDown={handleMenuKeyDown}>
            {menuActions.map((action, index) => (
              <button
                key={action.id || action.label}
                type="button"
                role="menuitem"
                className={action.destructive ? 'danger' : undefined}
                tabIndex={index === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => invokeAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
