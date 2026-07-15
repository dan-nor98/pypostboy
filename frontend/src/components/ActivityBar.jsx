import React from 'react';
import {Archive, Braces, Clock, Settings, Zap} from 'lucide-react';
import {IconButton} from './IconButton';

export function ActivityBar({activePanel = 'collections', onSelectPanel}) {
  return (
    <nav className="activity" aria-label="Activity bar">
      <IconButton label="Collections" aria-pressed={activePanel === 'collections'} onClick={() => onSelectPanel?.('collections')}><Archive /></IconButton>
      <IconButton label="History"><Clock /></IconButton>
      <IconButton label="Environments" aria-pressed={activePanel === 'environments'} onClick={() => onSelectPanel?.('environments')}><Braces /></IconButton>
      <IconButton label="Monitors"><Zap /></IconButton>
      <span className="spacer" />
      <IconButton label="Settings Ctrl+,"><Settings /></IconButton>
    </nav>
  );
}
