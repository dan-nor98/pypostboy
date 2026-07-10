export function field({ id, label, type = 'text', placeholder = '', autocomplete = '', className = '', value = '' }) {
  const auto = autocomplete ? ` autocomplete="${autocomplete}"` : '';
  return `
    <label class="field ${className}" for="${id}">
      <span>${label}</span>
      <input id="${id}" class="form-input" type="${type}" placeholder="${placeholder}" value="${value}"${auto}>
    </label>
  `;
}

export function textareaField({ id, label, rows = 4, placeholder = '', readonly = false, className = '' }) {
  return `
    <label class="field ${className}" for="${id}">
      <span>${label}</span>
      <textarea id="${id}" class="form-textarea" rows="${rows}" placeholder="${placeholder}" ${readonly ? 'readonly' : ''}></textarea>
    </label>
  `;
}

export function selectField({ id, label, options = [], className = '' }) {
  return `
    <label class="field ${className}" for="${id}">
      <span>${label}</span>
      <select id="${id}" class="form-select">
        ${options.map((option) => `<option value="${option.value}" ${option.selected ? 'selected' : ''}>${option.label}</option>`).join('')}
      </select>
    </label>
  `;
}
