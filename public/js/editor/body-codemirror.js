function normalizeValue(value) {
    return value == null ? '' : String(value);
}

function createEditorElement() {
    var textarea = document.createElement('textarea');
    textarea.className = 'form-input body-content-cm-fallback';
    textarea.setAttribute('aria-label', 'Request body editor');
    textarea.setAttribute('spellcheck', 'false');
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.resize = 'none';
    textarea.style.border = '0';
    textarea.style.outline = 'none';
    textarea.style.background = 'transparent';
    textarea.style.color = 'inherit';
    textarea.style.font = 'inherit';
    textarea.style.padding = '12px';
    return textarea;
}

export async function initBodyContentCodeMirror(options) {
    var opts = options || {};
    var container = opts.container;
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : function() {};

    if (!container) return null;

    var textarea = createEditorElement();
    var destroyed = false;
    var bodyType = 'none';

    function emitChange() {
        if (destroyed) return;
        onChange(textarea.value);
    }

    textarea.addEventListener('input', emitChange);
    container.replaceChildren(textarea);

    return {
        setValue: function(value) {
            textarea.value = normalizeValue(value);
        },
        getValue: function() {
            return textarea.value;
        },
        setBodyType: function(value) {
            bodyType = value || 'none';
            textarea.setAttribute('data-body-type', bodyType);

            if (bodyType === 'json') {
                textarea.setAttribute('placeholder', '{\n  "key": "value"\n}');
                textarea.setAttribute('inputmode', 'text');
            } else if (bodyType === 'xml') {
                textarea.setAttribute('placeholder', '<root>\n  <value />\n</root>');
                textarea.setAttribute('inputmode', 'text');
            } else {
                textarea.setAttribute('placeholder', 'Enter request body...');
                textarea.setAttribute('inputmode', 'text');
            }
        },
        requestMeasure: function() {
            if (destroyed) return;
            textarea.style.height = '100%';
        },
        focus: function() {
            if (destroyed) return;
            textarea.focus();
        },
        destroy: function() {
            if (destroyed) return;
            destroyed = true;
            textarea.removeEventListener('input', emitChange);
            if (textarea.parentNode === container) {
                container.removeChild(textarea);
            }
        }
    };
}
