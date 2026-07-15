import React, {useMemo, useState} from 'react';
import {apiClient} from '../api/client';
import {Button} from './Button';

function flattenCollections(collections, depth = 0) {
  return collections.flatMap((collection) => [
    {id: collection.id, name: collection.name, depth},
    ...flattenCollections(collection.children || [], depth + 1),
  ]);
}

export function issueText(issue) {
  if (!issue) return '';
  if (typeof issue === 'string') return issue;
  return [issue.code, issue.message].filter(Boolean).join(': ');
}

function headersToRows(headers = {}) {
  if (Array.isArray(headers)) return headers;
  return Object.entries(headers).map(([key, value]) => ({enabled: true, key, value}));
}

function requestName(parsed) {
  try {
    const url = new URL(parsed.url);
    return `${parsed.method || 'GET'} ${url.pathname || '/'}`;
  } catch (_error) {
    return `${parsed.method || 'GET'} imported cURL`;
  }
}

export function ImportCurlDialog({collections = [], onClose, onCreated}) {
  const collectionOptions = useMemo(() => flattenCollections(collections), [collections]);
  const [curlText, setCurlText] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState(collectionOptions[0]?.id || '');
  const [parsed, setParsed] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleParse = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setParsed(null);
    setErrors([]);
    setWarnings([]);
    try {
      const result = await apiClient.importData('curl', curlText);
      const parsedResult = result.data || result;
      setParsed(parsedResult);
      setWarnings(parsedResult.warnings || result.warnings || []);
    } catch (error) {
      setErrors(error.errors || [{message: error.message}]);
      setWarnings(error.warnings || []);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!parsed || !selectedCollectionId) return;
    setCreating(true);
    setErrors([]);
    try {
      const created = await apiClient.createRequest({
        ...parsed,
        name: requestName(parsed),
        collection_id: selectedCollectionId,
        headers: headersToRows(parsed.headers),
        body_raw_type: parsed.body_type === 'json' ? 'application/json' : 'text/plain',
      });
      await onCreated?.(created.data || created);
      onClose?.();
    } catch (error) {
      setErrors(error.errors || [{message: error.message}]);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <dialog open className="import-dialog" aria-modal="true" aria-label="Import cURL" onClick={(event) => event.stopPropagation()}>
        <form onSubmit={handleParse}>
          <div className="section-head"><span>Import cURL</span><button type="button" onClick={onClose}>Close</button></div>
          <label className="field-stack">
            <span>Paste cURL command</span>
            <textarea value={curlText} onChange={(event) => setCurlText(event.target.value)} rows={8} placeholder="curl https://api.example.test -H 'Accept: application/json'" />
          </label>
          <Button type="submit" disabled={!curlText.trim() || submitting}>{submitting ? 'Parsing…' : 'Parse cURL'}</Button>
        </form>

        {warnings.length > 0 && <div className="banner warning"><strong>Warnings</strong><ul>{warnings.map((warning, index) => <li key={index}>{issueText(warning)}</li>)}</ul></div>}
        {errors.length > 0 && <div className="banner error" role="alert" aria-live="assertive"><strong>Errors</strong><ul>{errors.map((parseError, index) => <li key={index}>{issueText(parseError)}</li>)}</ul></div>}

        {parsed && (
          <section aria-label="Parsed cURL request" className="parsed-import">
            <dl>
              <dt>Method</dt><dd>{parsed.method}</dd>
              <dt>URL</dt><dd>{parsed.url}</dd>
              <dt>Headers</dt><dd><pre>{JSON.stringify(parsed.headers || {}, null, 2)}</pre></dd>
              <dt>Body type</dt><dd>{parsed.body_type}</dd>
              <dt>Body content</dt><dd><pre>{parsed.body_content || '(empty)'}</pre></dd>
              <dt>Form data</dt><dd><pre>{JSON.stringify(parsed.form_data || [], null, 2)}</pre></dd>
            </dl>
            <label className="field-stack">
              <span>Collection</span>
              <select aria-label="Collection" value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)}>
                {collectionOptions.map((collection) => <option key={collection.id} value={collection.id}>{`${'— '.repeat(collection.depth)}${collection.name}`}</option>)}
              </select>
            </label>
            <Button onClick={handleCreate} disabled={!selectedCollectionId || creating}>{creating ? 'Creating…' : 'Create request'}</Button>
          </section>
        )}
      </dialog>
    </div>
  );
}
