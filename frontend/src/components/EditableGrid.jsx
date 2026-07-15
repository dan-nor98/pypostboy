import React from 'react';
import {MoreHorizontal} from 'lucide-react';
import {IconButton} from './IconButton';

function normalizeRow(row = []) {
  if (Array.isArray(row)) return [row[0] === '' ? '' : '✓', row[1] || '', row[2] || '', row[3] || ''];
  return [row.enabled === false ? '' : '✓', row.key || '', row.value || '', row.description || ''];
}

export function EditableGrid({rows = [], type, onChange}) {
  const editableRows = rows.map(normalizeRow);

  const updateRow = (index, column, value) => {
    if (!onChange) return;
    const nextRows = editableRows.map((row) => [...row]);
    nextRows[index][column] = value;
    onChange(nextRows);
  };

  const addRow = (column, value) => {
    if (!onChange) return;
    const nextRow = ['✓', '', '', ''];
    nextRow[column] = value;
    onChange([...editableRows, nextRow]);
  };

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
        {editableRows.map((row, index) => (
          <tr key={index}>
            <td><input type="checkbox" checked={row[0] === '✓'} onChange={(event) => updateRow(index, 0, event.target.checked ? '✓' : '')} aria-label={`${type} row ${index + 1} enabled`} /></td>
            <td><input className="mono" value={row[1]} onChange={(event) => updateRow(index, 1, event.target.value)} aria-label={`${type} row ${index + 1} key`} /></td>
            <td><input className="mono variable" value={row[2]} onChange={(event) => updateRow(index, 2, event.target.value)} aria-label={`${type} row ${index + 1} value`} /></td>
            <td><input value={row[3]} onChange={(event) => updateRow(index, 3, event.target.value)} aria-label={`${type} row ${index + 1} description`} /></td>
            <td><IconButton label="Row actions"><MoreHorizontal size={14} /></IconButton></td>
          </tr>
        ))}
        <tr className="muted">
          <td><input type="checkbox" checked={false} onChange={(event) => event.target.checked && addRow(0, '✓')} aria-label="New row enabled" /></td>
          <td><input placeholder="Add key" value="" onChange={(event) => addRow(1, event.target.value)} aria-label={`New ${type} key`} /></td>
          <td><input placeholder="Add value" value="" onChange={(event) => addRow(2, event.target.value)} aria-label={`New ${type} value`} /></td>
          <td><input placeholder="Description" value="" onChange={(event) => addRow(3, event.target.value)} aria-label={`New ${type} description`} /></td>
          <td />
        </tr>
      </tbody>
    </table>
  );
}
