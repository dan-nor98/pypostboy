export function createElement(type, props, ...children) {
  return {type, props: {...(props || {}), children: children.flat()}};
}
export function useState(initial) {
  let value = typeof initial === 'function' ? initial() : initial;
  const setValue = next => { value = typeof next === 'function' ? next(value) : next; };
  return [value, setValue];
}
export function useEffect(effect) {
  queueMicrotask(() => {
    const cleanup = effect();
    if (typeof cleanup === 'function') addEventListener('pagehide', cleanup, {once: true});
  });
}
export default {createElement, useState, useEffect};
