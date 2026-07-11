import {AlertTriangle, MoreHorizontal, Plus, Search} from 'lucide-react';
import {tree} from '../data/demoWorkspace';
import {IconButton} from './IconButton';
import {TreeNode} from './TreeNode';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="side-title">
        <span>COLLECTIONS</span>
        <IconButton label="Create request Ctrl+N"><Plus size={15} /></IconButton>
        <IconButton label="Collection actions"><MoreHorizontal size={15} /></IconButton>
      </div>
      <div className="filter"><Search size={14} /><input placeholder="Filter collections" /></div>
      <div className="banner"><AlertTriangle size={14} /> SSL verification disabled for Staging</div>
      <div role="tree" className="tree">
        {tree.map((node, index) => <TreeNode node={node} key={index} />)}
      </div>
    </aside>
  );
}
