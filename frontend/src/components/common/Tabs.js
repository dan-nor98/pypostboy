export function tabs(items, className = 'tab-bar') {
  return `
    <div class="${className}" role="tablist">
      ${items.map((item, index) => `<button class="tab ${index === 0 ? 'active' : ''}" type="button" data-tab="${item.id}" role="tab">${item.label}</button>`).join('')}
    </div>
  `;
}
