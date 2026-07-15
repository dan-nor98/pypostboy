import React from 'react';
import {isSensitiveName, maskSecret} from '../environment';

export function EnvironmentPanel({environments, activeEnvironmentId, onSelectEnvironment, onUpdateEnvironment}) {
  const activeEnvironment = environments.find((environment) => environment.id === activeEnvironmentId) || environments[0];

  const updateVariable = (index, field, value) => {
    const variables = [...(activeEnvironment.variables || [])];
    variables[index] = {...variables[index], [field]: value};
    if (field === 'key' && isSensitiveName(value)) variables[index].secret = true;
    onUpdateEnvironment({...activeEnvironment, variables});
  };

  const addVariable = () => {
    onUpdateEnvironment({
      ...activeEnvironment,
      variables: [...(activeEnvironment.variables || []), {key: '', value: '', secret: false}],
    });
  };

  return (
    <aside className="environment-panel" aria-label="Environment panel">
      <div className="side-title"><span>ENVIRONMENTS</span></div>
      <label className="environment-select">Active environment
        <select value={activeEnvironment?.id || ''} onChange={(event) => onSelectEnvironment(event.target.value)}>
          {environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)}
        </select>
      </label>
      <div className="section-head"><span>Variables</span><button type="button" onClick={addVariable}>Add</button></div>
      <div className="environment-vars">
        {(activeEnvironment?.variables || []).map((variable, index) => {
          const secret = variable.secret || isSensitiveName(variable.key);
          return (
            <div className="environment-var" key={index}>
              <input aria-label={`Variable ${index + 1} name`} value={variable.key} placeholder="baseUrl" onChange={(event) => updateVariable(index, 'key', event.target.value)} />
              <input
                aria-label={`Variable ${index + 1} value`}
                value={secret ? maskSecret(variable.value) : variable.value}
                placeholder="Value"
                onChange={(event) => updateVariable(index, 'value', event.target.value)}
                readOnly={secret && Boolean(variable.value)}
              />
              <label><input type="checkbox" checked={secret} onChange={(event) => updateVariable(index, 'secret', event.target.checked)} /> Secret</label>
            </div>
          );
        })}
      </div>
      <p className="hint">Use variables as <code>{'{{baseUrl}}'}</code>. Secret-looking names are masked.</p>
    </aside>
  );
}
