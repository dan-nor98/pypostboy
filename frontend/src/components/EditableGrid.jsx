import React from 'react';
import {MoreHorizontal} from 'lucide-react';
import {IconButton} from './IconButton';

export function EditableGrid({rows, type}) {
  return (
    <table className="grid">
      <thead>
        <tr>
          <th>Enabled</th>
          <th>Key</th>
          <th>Value</th>
          <th>Description</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td><input type="checkbox" defaultChecked={row[0] === '✓'} aria-label={`${type} row ${index + 1} enabled`} /></td>
            <td className="mono">{row[1]}</td>
            <td className="mono variable">{row[2]}</td>
            <td>{row[3]}</td>
            <td><IconButton label="Row actions"><MoreHorizontal size={14} /></IconButton></td>
          </tr>
        ))}
        <tr className="muted">
          <td><input type="checkbox" aria-label="New row enabled" /></td>
          <td>Add key</td>
          <td>Add value</td>
          <td>Description</td>
          <td />
        </tr>
      </tbody>
    </table>
  );
}
