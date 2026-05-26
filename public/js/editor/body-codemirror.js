let codemirrorModulesPromise = null;

function loadCodeMirrorModules() {
    if (!codemirrorModulesPromise) {
        codemirrorModulesPromise = Promise.all([
            import('https://esm.sh/@codemirror/state@6.5.2'),
            import('https://esm.sh/@codemirror/view@6.28.6'),
            import('https://esm.sh/@codemirror/commands@6.8.1'),
            import('https://esm.sh/@codemirror/lang-json@6.0.2'),
            import('https://esm.sh/@codemirror/lang-xml@6.1.0')
        ]).then(function(modules) {
            return {
                state: modules[0],
                view: modules[1],
                commands: modules[2],
                json: modules[3],
                xml: modules[4]
            };
        });
    }

    return codemirrorModulesPromise;
}

export async function initBodyContentCodeMirror(options) {
    var container = options && options.container;
    var onChange = options && options.onChange;
    if (!container) return null;

    var loaded = await loadCodeMirrorModules();
    var EditorState = loaded.state.EditorState;
    var Compartment = loaded.state.Compartment;
    var EditorView = loaded.view.EditorView;
    var keymap = loaded.view.keymap;
    var defaultKeymap = loaded.commands.defaultKeymap;
    var history = loaded.commands.history;
    var historyKeymap = loaded.commands.historyKeymap;
    var indentWithTab = loaded.commands.indentWithTab;
    var json = loaded.json.json;
    var xml = loaded.xml.xml;

    var languageCompartment = new Compartment();

    function getLanguageExtension(bodyType) {
        if (bodyType === 'json') return json();
        if (bodyType === 'xml') return xml();
        return [];
    }

    var view = new EditorView({
        state: EditorState.create({
            doc: '',
            extensions: [
                history(),
                keymap.of(defaultKeymap.concat(historyKeymap).concat([indentWithTab])),
                EditorView.lineWrapping,
                languageCompartment.of([]),
                EditorView.updateListener.of(function(update) {
                    if (update.docChanged && typeof onChange === 'function') onChange(update.state.doc.toString());
                })
            ]
        }),
        parent: container
    });

    return {
        setValue: function(value) {
            var next = value || '';
            var current = view.state.doc.toString();
            if (current === next) return;
            view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
        },
        getValue: function() { return view.state.doc.toString(); },
        setBodyType: function(bodyType) {
            view.dispatch({ effects: languageCompartment.reconfigure(getLanguageExtension(bodyType)) });
        },
        focus: function() { view.focus(); },
        destroy: function() { view.destroy(); }
    };
}
