function setProp(node, key, value) {
  if (key === 'children' || value == null || value === false) return;
  if (key === 'className') node.setAttribute('class', value);
  else if (key === 'htmlFor') node.setAttribute('for', value);
  else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
  else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
  else if (value === true) node.setAttribute(key, '');
  else node.setAttribute(key, value);
}
function renderVNode(vnode) {
  if (vnode == null || vnode === false) return document.createTextNode('');
  if (typeof vnode === 'string' || typeof vnode === 'number') return document.createTextNode(vnode);
  if (typeof vnode.type === 'function') return renderVNode(vnode.type(vnode.props || {}));
  if (vnode.type === Fragment) {
    const fragment = document.createDocumentFragment();
    (vnode.props?.children || []).forEach(child => fragment.append(renderVNode(child)));
    return fragment;
  }
  const node = document.createElement(vnode.type);
  Object.entries(vnode.props || {}).forEach(([key, value]) => setProp(node, key, value));
  (vnode.props?.children || []).forEach(child => node.append(renderVNode(child)));
  return node;
}
export const Fragment = Symbol('Fragment');
export function createRoot(container) {
  return { render(vnode) { container.replaceChildren(renderVNode(vnode)); } };
}
