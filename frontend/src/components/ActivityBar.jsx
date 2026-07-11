import {Archive, Braces, Clock, Settings, Zap} from 'lucide-react';
import {IconButton} from './IconButton';

export function ActivityBar() {
  return (
    <nav className="activity" aria-label="Activity bar">
      <IconButton label="Collections"><Archive /></IconButton>
      <IconButton label="History"><Clock /></IconButton>
      <IconButton label="Environments"><Braces /></IconButton>
      <IconButton label="Monitors"><Zap /></IconButton>
      <span className="spacer" />
      <IconButton label="Settings Ctrl+,"><Settings /></IconButton>
    </nav>
  );
}
