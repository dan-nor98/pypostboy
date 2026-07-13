import React, {useEffect, useMemo, useRef, useState} from 'react';
import {bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting} from '@codemirror/language';
import {json} from '@codemirror/lang-json';
import {defaultKeymap, history, historyKeymap, indentWithTab} from '@codemirror/commands';
import {highlightSelectionMatches, openSearchPanel, searchKeymap, search} from '@codemirror/search';
import {Compartment, EditorState} from '@codemirror/state';
import {EditorView, drawSelection, dropCursor, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers} from '@codemirror/view';
import {Search} from 'lucide-react';

function formatJson(value) {
  if (!value.trim()) return value;
  return JSON.stringify(JSON.parse(value), null, 2);
}

export function CodeEditor({
  value = '',
  onChange,
  wordWrap = true,
  readOnly = false,
  label = 'JSON body editor',
}) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const compartmentsRef = useRef(null);
  if (!compartmentsRef.current) {
    compartmentsRef.current = {
      editable: new Compartment(),
      label: new Compartment(),
      readOnly: new Compartment(),
      wrap: new Compartment(),
    };
  }
  const [wrap, setWrap] = useState(wordWrap);
  const [formatError, setFormatError] = useState('');

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { setWrap(wordWrap); }, [wordWrap]);

  const theme = useMemo(() => EditorView.theme({
    '&': {
      backgroundColor: 'var(--color-bg-editor)',
      color: 'var(--color-text-primary)',
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", "SFMono-Regular", Consolas, monospace',
      fontSize: '13px',
      height: '100%',
    },
    '.cm-scroller': {fontFamily: 'inherit', lineHeight: '1.55'},
    '.cm-content': {caretColor: 'var(--color-accent)', padding: '8px 0'},
    '.cm-gutters': {
      backgroundColor: 'var(--color-bg-editor)',
      color: 'var(--color-text-muted)',
      borderRight: '1px solid var(--color-border-subtle)',
    },
    '.cm-activeLine, .cm-activeLineGutter': {backgroundColor: 'var(--color-bg-hover)'},
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {backgroundColor: 'var(--color-bg-selected)'},
    '&.cm-focused': {outline: '1px solid var(--color-accent)', outlineOffset: '-1px'},
    '.cm-search': {
      backgroundColor: 'var(--color-bg-elevated)',
      borderTop: '1px solid var(--color-border-default)',
      color: 'var(--color-text-primary)',
      padding: '6px',
    },
    '.cm-search input': {backgroundColor: 'var(--color-bg-input)', color: 'var(--color-text-primary)'},
    '.cm-matchingBracket': {backgroundColor: 'var(--color-accent-muted)', outline: '1px solid var(--color-accent-border)'},
  }), []);

  useEffect(() => {
    if (!hostRef.current) return undefined;

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      bracketMatching(),
      json(),
      syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
      search({top: true}),
      highlightSelectionMatches(),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      compartmentsRef.current.editable.of(EditorView.editable.of(!readOnly)),
      compartmentsRef.current.readOnly.of(EditorState.readOnly.of(readOnly)),
      theme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
      }),
      compartmentsRef.current.label.of(EditorView.editorAttributes.of({'aria-label': label})),
      compartmentsRef.current.wrap.of(wrap ? EditorView.lineWrapping : []),
    ];

    const view = new EditorView({
      state: EditorState.create({doc: value, extensions}),
      parent: hostRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: {from: 0, to: view.state.doc.length, insert: value},
      });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: compartmentsRef.current.wrap.reconfigure(wrap ? EditorView.lineWrapping : []),
    });
  }, [wrap]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: [
        compartmentsRef.current.editable.reconfigure(EditorView.editable.of(!readOnly)),
        compartmentsRef.current.readOnly.reconfigure(EditorState.readOnly.of(readOnly)),
      ],
    });
  }, [readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: compartmentsRef.current.label.reconfigure(EditorView.editorAttributes.of({'aria-label': label})),
    });
  }, [label]);

  const handleFormat = () => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    try {
      const formatted = formatJson(view.state.doc.toString());
      view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: formatted}});
      setFormatError('');
    } catch (error) {
      setFormatError(error.message);
    }
  };

  const handleSearch = () => {
    if (viewRef.current) openSearchPanel(viewRef.current);
  };

  return (
    <div className="code-editor-shell">
      <div className="code-editor-toolbar">
        <span>JSON</span>
        {formatError && <span className="inline-error">{formatError}</span>}
        <button type="button" onClick={handleSearch}><Search size={13} /> Search</button>
        <button type="button" onClick={handleFormat} disabled={readOnly}>Format</button>
        <label><input type="checkbox" checked={wrap} onChange={(event) => setWrap(event.target.checked)} /> Wrap</label>
      </div>
      <div className="code-editor-host" ref={hostRef} />
    </div>
  );
}
