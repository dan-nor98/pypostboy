export function modal({ id, title, body = '', labelledBy = '', className = '' }) {
  const titleId = labelledBy || `${id}Title`;
  return `
    <div id="${id}" class="modal ${className}" role="dialog" aria-modal="true" aria-labelledby="${titleId}" aria-hidden="true">
      <div class="modal-content">
        <button class="modal-close" type="button" data-close-modal="${id}" aria-label="Close">×</button>
        <h3 id="${titleId}">${title}</h3>
        ${body}
      </div>
    </div>
  `;
}
