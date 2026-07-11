import {requestBodyLines, responseBodyLines} from '../data/demoWorkspace';

export function CodeBlock({response = false}) {
  const lines = response ? responseBodyLines : requestBodyLines;

  return (
    <pre className="editor" aria-label={response ? 'Response body editor' : 'Request body editor'}>
      {lines.map((line, index) => (
        <div className="code-line" key={line + index}>
          <span className="line-no">{index + 1}</span>
          <code>{line}</code>
        </div>
      ))}
    </pre>
  );
}
