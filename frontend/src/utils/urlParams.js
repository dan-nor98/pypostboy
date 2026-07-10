export function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (_err) {
    return value;
  }
}

export function parseQueryParamsFromUrl(urlValue) {
  const queryIndex = String(urlValue || '').indexOf('?');
  if (queryIndex === -1) return [];
  const hashIndex = String(urlValue || '').indexOf('#', queryIndex);
  const query = String(urlValue || '').slice(queryIndex + 1, hashIndex === -1 ? undefined : hashIndex);
  if (!query) return [];

  return query.split('&').filter(Boolean).map((pair) => {
    const equalIndex = pair.indexOf('=');
    const rawKey = equalIndex === -1 ? pair : pair.slice(0, equalIndex);
    const rawValue = equalIndex === -1 ? '' : pair.slice(equalIndex + 1);
    return {
      enabled: true,
      key: safeDecodeURIComponent(rawKey.replace(/\+/g, ' ')),
      value: safeDecodeURIComponent(rawValue.replace(/\+/g, ' ')),
      description: '',
    };
  });
}

export function buildUrlWithParams(originalUrl, params) {
  const [baseWithQuery, hash = ''] = String(originalUrl || '').split('#');
  const base = baseWithQuery.split('?')[0];
  const query = (params || [])
    .filter((param) => param.enabled && param.key)
    .map((param) => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value || '')}`)
    .join('&');
  return `${base}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}
