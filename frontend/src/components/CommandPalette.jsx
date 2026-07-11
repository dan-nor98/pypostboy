import {commands} from '../data/demoWorkspace';

export function CommandPalette({onClose}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <dialog open className="palette" onClick={(event) => event.stopPropagation()}>
        <input autoFocus placeholder="Type a command or search…" />
        <ul>{commands.map((command) => <li key={command[0]}><span>{command[0]}</span><kbd>{command[1]}</kbd></li>)}</ul>
      </dialog>
    </div>
  );
}
