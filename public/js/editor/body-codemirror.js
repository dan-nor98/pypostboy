import { escapeHtml, highlightJson, highlightXml } from '../utils/format.js';

function normalizeValue(value) {
    return value == null ? '' : String(value);
}

function createEditorElement() {
    var wrapper = document.createElement('div');
    wrapper.className = 'body-content-cm-fallback';

    var highlightLayer = document.createElement('pre');
    highlightLayer.className = 'body-content-cm-highlight';
    highlightLayer.setAttribute('aria-hidden', 'true');

    var textarea = document.createElement('textarea');
    textarea.className = 'form-input body-content-cm-textarea';
    textarea.setAttribute('aria-label', 'Request body editor');
    textarea.setAttribute('spellcheck', 'false');

    wrapper.appendChild(highlightLayer);
    wrapper.appendChild(textarea);
    return { wrapper, textarea, highlightLayer };
}

export async function initBodyContentCodeMirror(options) {
    var opts = options || {};
    var container = opts.container;
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : function() {};

    if (!container) return null;

    var editorElements = createEditorElement();
    var wrapper = editorElements.wrapper;
    var textarea = editorElements.textarea;
    var highlightLayer = editorElements.highlightLayer;
    var destroyed = false;
    var bodyType = 'none';
    var highlightedText = '';

    function highlightBodyValue(value) {
        var normalized = normalizeValue(value);
        if (!normalized) return '<br />';
        if (bodyType === 'json') return highlightJson(normalized);
        if (bodyType === 'xml') return highlightXml(normalized);
        return escapeHtml(normalized);
    }

    function renderHighlight() {
        highlightedText = highlightBodyValue(textarea.value);
        highlightLayer.innerHTML = highlightedText;
    }

    function emitChange() {
        if (destroyed) return;
        renderHighlight();
        onChange(textarea.value);
    }

    textarea.addEventListener('input', emitChange);
    textarea.addEventListener('scroll', function() {
        highlightLayer.scrollTop = textarea.scrollTop;
        highlightLayer.scrollLeft = textarea.scrollLeft;
    });
    container.replaceChildren(wrapper);
    renderHighlight();

    return {
        setValue: function(value) {
            textarea.value = normalizeValue(value);
            renderHighlight();
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
            renderHighlight();
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
