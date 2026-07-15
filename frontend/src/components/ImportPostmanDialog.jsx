import React, {useState} from 'react';
import {apiClient} from '../api/client';
import {Button} from './Button';
import {issueText} from './ImportCurlDialog';

async function readFileText(file) {
  if (!file) return '';
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || '');
    reader.onerror = () => reject(reader.error || new Error('Unable to read the selected file.'));
    reader.readAsText(file);
  });
}

export function ImportPostmanDialog({onClose, onImported}) {
  const [jsonText, setJsonText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name || '');
    setErrors([]);
    if (!file) return;
    try {
      setJsonText(await readFileText(file));
    } catch (error) {
      setErrors([{message: error.message || 'Unable to read the selected file.'}]);
    }
  };

  const handleImport = async (event) => {
    event.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      const parsedJson = JSON.parse(jsonText);
      const imported = await apiClient.importData('postman', parsedJson);
      await onImported?.(imported.data || imported);
      onClose?.();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setErrors([{code: 'invalid_json', message: 'Enter valid Postman collection JSON before importing.'}]);
      } else {
        setErrors(error.errors?.length ? error.errors : [{message: error.message || 'Postman import failed.'}]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <dialog open className="import-dialog" aria-modal="true" aria-label="Import Postman" onClick={(event) => event.stopPropagation()}>
        <form onSubmit={handleImport}>
          <div className="section-head"><span>Import Postman</span><button type="button" onClick={onClose}>Close</button></div>
          <label className="field-stack">
            <span>Upload Postman JSON file</span>
            <input type="file" accept=".json,application/json" onChange={handleFileChange} />
            {selectedFileName && <span className="hint">Selected {selectedFileName}</span>}
          </label>
          <label className="field-stack">
            <span>Paste Postman JSON</span>
            <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} rows={10} placeholder='{"info":{"name":"Collection"},"item":[]}' />
          </label>
          <Button type="submit" disabled={!jsonText.trim() || submitting}>{submitting ? 'Importing…' : 'Import Postman'}</Button>
        </form>

        {errors.length > 0 && (
          <div className="banner error" role="alert" aria-live="assertive">
            <strong>Import failed</strong>
            <ul>{errors.map((importError, index) => <li key={index}>{issueText(importError)}</li>)}</ul>
          </div>
        )}
      </dialog>
    </div>
  );
}
