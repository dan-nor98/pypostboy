import React, {useEffect, useRef} from 'react';
import {commands} from '../data/demoWorkspace';

const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function CommandPalette({onClose, onImportCurl, onImportPostman}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const focusables = () => Array.from(dialog?.querySelectorAll(focusableSelector) || []).filter((element) => !element.disabled);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog?.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => focusables()[0]?.focus());
    return () => dialog?.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <dialog open className="palette" ref={dialogRef} aria-modal="true" aria-label="Command palette" onClick={(event) => event.stopPropagation()}>
        <input placeholder="Type a command or search…" />
        <ul><li><button type="button" onClick={onImportCurl}><span>Import cURL</span><kbd>curl</kbd></button></li><li><button type="button" onClick={onImportPostman}><span>Import Postman</span><kbd>postman</kbd></button></li>{commands.map((command) => <li key={command[0]}><button type="button"><span>{command[0]}</span><kbd>{command[1]}</kbd></button></li>)}</ul>
      </dialog>
    </div>
  );
}
