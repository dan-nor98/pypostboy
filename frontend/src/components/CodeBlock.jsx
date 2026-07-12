import React from 'react';
import {requestBodyLines, responseBodyLines} from '../data/demoWorkspace';

export function CodeBlock({response = false, lines}) {
  const displayLines = lines || (response ? responseBodyLines : requestBodyLines);

  return (
    <pre className="editor" aria-label={response ? 'Response body editor' : 'Request body editor'}>
      {displayLines.map((line, index) => (
        <div className="code-line" key={line + index}>
          <span className="line-no">{index + 1}</span>
          <code>{line}</code>
        </div>
      ))}
    </pre>
  );
}
