export function button({ id = '', className = '', variant = 'secondary', type = 'button', label = '', attrs = '' }) {
  const classes = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ');
  const idAttr = id ? ` id="${id}"` : '';
  return `<button${idAttr} class="${classes}" type="${type}" ${attrs}>${label}</button>`;
}

export function linkButton({ id = '', className = '', variant = 'ghost', href = '#', label = '' }) {
  const classes = ['btn', `btn-${variant}`, className].filter(Boolean).join(' ');
  const idAttr = id ? ` id="${id}"` : '';
  return `<a${idAttr} class="${classes}" href="${href}">${label}</a>`;
}
