import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting} from '@codemirror/language';
import {json} from '@codemirror/lang-json';
import {defaultKeymap, history, historyKeymap, indentWithTab} from '@codemirror/commands';
import {highlightSelectionMatches, openSearchPanel, searchKeymap, search} from '@codemirror/search';
import {Compartment, EditorState, RangeSetBuilder} from '@codemirror/state';
import {Decoration, EditorView, ViewPlugin, drawSelection, dropCursor, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers} from '@codemirror/view';
import {Search} from 'lucide-react';
import {variablePattern} from '../environment';


function buildVariableDecorations(view) {
  const builder = new RangeSetBuilder();
  for (const {from, to, text} of view.visibleRanges.map((range) => ({...range, text: view.state.doc.sliceString(range.from, range.to)}))) {
    variablePattern.lastIndex = 0;
    let match;
    while ((match = variablePattern.exec(text)) !== null) {
      builder.add(from + match.index, from + match.index + match[0].length, Decoration.mark({class: 'cm-env-variable-token'}));
    }
  }
  return builder.finish();
}

export const environmentVariableHighlight = ViewPlugin.fromClass(class {
  constructor(view) { this.decorations = buildVariableDecorations(view); }
  update(update) {
    if (update.docChanged || update.viewportChanged) this.decorations = buildVariableDecorations(update.view);
  }
}, {decorations: (plugin) => plugin.decorations});

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
  language = 'json',
  editorId = label,
  onCursorChange,
  onFocusChange,
}) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onCursorChangeRef = useRef(onCursorChange);
  const onFocusChangeRef = useRef(onFocusChange);
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
  useEffect(() => { onCursorChangeRef.current = onCursorChange; }, [onCursorChange]);
  useEffect(() => { onFocusChangeRef.current = onFocusChange; }, [onFocusChange]);
  useEffect(() => { setWrap(wordWrap); }, [wordWrap]);

  const emitCursorChange = useCallback((state) => {
    const selection = state.selection;
    const line = state.doc.lineAt(selection.main.head);
    onCursorChangeRef.current?.({
      id: editorId,
      label,
      line: line.number,
      column: selection.main.head - line.from + 1,
    });
  }, [editorId, label]);

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
    '.cm-env-variable-token': {backgroundColor: 'var(--color-accent-muted)', color: 'var(--color-accent)', borderRadius: '3px', padding: '0 1px'},
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
      ...(language === 'json' ? [json()] : []),
      syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
      search({top: true}),
      highlightSelectionMatches(),
      highlightActiveLine(),
      environmentVariableHighlight,
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      compartmentsRef.current.editable.of(EditorView.editable.of(!readOnly)),
      compartmentsRef.current.readOnly.of(EditorState.readOnly.of(readOnly)),
      theme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
        if (update.selectionSet) emitCursorChange(update.state);
      }),
      EditorView.domEventHandlers({
        focus: (_event, view) => {
          onFocusChangeRef.current?.({id: editorId, label, focused: true});
          emitCursorChange(view.state);
        },
        blur: () => {
          onFocusChangeRef.current?.({id: editorId, label, focused: false});
        },
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
  }, [emitCursorChange, editorId, label, language, theme]);

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
        <span>{language === 'json' ? 'JSON' : 'Text'}</span>
        {formatError && <span className="inline-error">{formatError}</span>}
        <button type="button" onClick={handleSearch}><Search size={13} /> Search</button>
        <button type="button" onClick={handleFormat} disabled={readOnly}>Format</button>
        <label><input type="checkbox" checked={wrap} onChange={(event) => setWrap(event.target.checked)} /> Wrap</label>
      </div>
      <div className="code-editor-host" ref={hostRef} />
    </div>
  );
}
