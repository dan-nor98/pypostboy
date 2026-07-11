import {ChevronDown, Folder} from 'lucide-react';
import {Method} from './Method';

export function TreeNode({node, depth = 0}) {
  if (Array.isArray(node)) {
    return (
      <div className={`tree-row ${node[2] ? 'selected' : ''}`} role="treeitem" style={{'--depth': depth}}>
        <span />
        <Method m={node[0]} />
        <span className="truncate">{node[1]}</span>
        {node[2] && <span className="dirty">●</span>}
      </div>
    );
  }

  return (
    <>
      <div className="tree-row folder" role="treeitem" aria-expanded={node.open} style={{'--depth': depth}}>
        <ChevronDown size={13} className={node.open ? '' : 'collapsed'} />
        <Folder size={14} />
        <span className="truncate">{node.name}</span>
      </div>
      {node.open && node.children.map((child, index) => <TreeNode key={index} node={child} depth={depth + 1} />)}
    </>
  );
}
