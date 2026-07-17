import React, {useEffect, useRef, useState} from 'react';
import {Copy, Trash2} from 'lucide-react';
import {IconButton} from './IconButton';

function normalizeRow(row = []) {
  if (Array.isArray(row)) return [row[0] === '' ? '' : '✓', row[1] || '', row[2] || '', row[3] || ''];
  return [row.enabled === false ? '' : '✓', row.key || '', row.value || '', row.description || ''];
}

export function EditableGrid({rows = [], type, onChange}) {
  const editableRows = rows.map(normalizeRow);
  const [selectedRowIndex, setSelectedRowIndex] = useState(editableRows.length ? 0 : null);
  const [pendingFocus, setPendingFocus] = useState(null);
  const keyInputRefs = useRef([]);

  useEffect(() => {
    if (selectedRowIndex === null || selectedRowIndex < editableRows.length) return;
    setSelectedRowIndex(editableRows.length ? editableRows.length - 1 : null);
  }, [editableRows.length, selectedRowIndex]);

  useEffect(() => {
    if (!pendingFocus || editableRows.length !== pendingFocus.rowCount) return;
    keyInputRefs.current[pendingFocus.index]?.focus();
    setPendingFocus(null);
  }, [editableRows.length, pendingFocus]);

  const updateRow = (index, column, value) => {
    if (!onChange) return;
    setSelectedRowIndex(index);
    const nextRows = editableRows.map((row) => [...row]);
    nextRows[index][column] = value;
    onChange(nextRows);
  };

  const addRow = (column, value) => {
    if (!onChange) return;
    const nextRow = ['✓', '', '', ''];
    nextRow[column] = value;
    const nextRows = [...editableRows, nextRow];
    setSelectedRowIndex(nextRows.length - 1);
    setPendingFocus({index: nextRows.length - 1, rowCount: nextRows.length});
    onChange(nextRows);
  };

  const duplicateSelectedRow = (index) => {
    if (!onChange) return;
    const selectedRow = editableRows[index];
    if (!selectedRow) return;
    const nextRows = [
      ...editableRows.slice(0, index + 1),
      [...selectedRow],
      ...editableRows.slice(index + 1),
    ];
    setSelectedRowIndex(index + 1);
    setPendingFocus({index: index + 1, rowCount: nextRows.length});
    onChange(nextRows);
  };

  const removeSelectedRow = (index) => {
    if (!onChange) return;
    if (!editableRows[index]) return;
    const nextRows = editableRows.filter((_, rowIndex) => rowIndex !== index);
    const nextSelectedIndex = nextRows.length ? Math.min(index, nextRows.length - 1) : null;
    setSelectedRowIndex(nextSelectedIndex);
    setPendingFocus(nextSelectedIndex === null ? null : {index: nextSelectedIndex, rowCount: nextRows.length});
    onChange(nextRows);
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
          <tr key={index} aria-selected={selectedRowIndex === index} onFocusCapture={() => setSelectedRowIndex(index)} onClick={() => setSelectedRowIndex(index)}>
            <td><input type="checkbox" checked={row[0] === '✓'} onChange={(event) => updateRow(index, 0, event.target.checked ? '✓' : '')} aria-label={`${type} row ${index + 1} enabled`} /></td>
            <td><input ref={(element) => { keyInputRefs.current[index] = element; }} className="mono" value={row[1]} onChange={(event) => updateRow(index, 1, event.target.value)} aria-label={`${type} row ${index + 1} key`} /></td>
            <td><input className="mono variable" value={row[2]} onChange={(event) => updateRow(index, 2, event.target.value)} aria-label={`${type} row ${index + 1} value`} /></td>
            <td><input value={row[3]} onChange={(event) => updateRow(index, 3, event.target.value)} aria-label={`${type} row ${index + 1} description`} /></td>
            <td>
              <div className="row-actions" aria-label={`${type} row ${index + 1} actions`}>
                <IconButton label={`Duplicate ${type} row ${index + 1}`} onClick={() => duplicateSelectedRow(index)}><Copy size={14} /></IconButton>
                <IconButton label={`Remove ${type} row ${index + 1}`} onClick={() => removeSelectedRow(index)}><Trash2 size={14} /></IconButton>
              </div>
            </td>
          </tr>
        ))}
        <tr className="muted">
          <td><input type="checkbox" checked={false} onChange={(event) => event.target.checked && addRow(0, '✓')} aria-label="New row enabled" /></td>
          <td><input ref={(element) => { keyInputRefs.current[editableRows.length] = element; }} placeholder="Add key" value="" onChange={(event) => addRow(1, event.target.value)} aria-label={`New ${type} key`} /></td>
          <td><input placeholder="Add value" value="" onChange={(event) => addRow(2, event.target.value)} aria-label={`New ${type} value`} /></td>
          <td><input placeholder="Description" value="" onChange={(event) => addRow(3, event.target.value)} aria-label={`New ${type} description`} /></td>
          <td />
        </tr>
      </tbody>
    </table>
  );
}
