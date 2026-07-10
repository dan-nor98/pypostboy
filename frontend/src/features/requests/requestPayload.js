export function headersToObject(headers) {
  return (headers || []).reduce((acc, header) => {
    if (header.key) acc[header.key] = header.value;
    return acc;
  }, {});
}

export function applyAuthToRequest(state, replaceEnvVars = (value) => value) {
  const headers = [...(state.headers || [])];
  const params = [...(state.params || [])];
  const config = state.auth_config || {};
  if (state.auth_type === 'bearer' && config.token) {
    headers.push({ key: 'Authorization', value: `Bearer ${replaceEnvVars(config.token)}` });
  } else if (state.auth_type === 'basic' && (config.username || config.password)) {
    headers.push({ key: 'Authorization', value: `Basic ${btoa(`${replaceEnvVars(config.username)}:${replaceEnvVars(config.password)}`)}` });
  } else if (state.auth_type === 'apikey' && config.key) {
    if (config.in === 'query') params.push({ enabled: true, key: config.key, value: config.value || '' });
    else headers.push({ key: config.key, value: config.value || '' });
  }
  return { ...state, headers, params };
}

export function buildFinalUrl(state, replaceEnvVars = (value) => value) {
  const [baseWithQuery, hash = ''] = replaceEnvVars(state.url).split('#');
  const [base, existingQuery = ''] = baseWithQuery.split('?');
  const search = new URLSearchParams(existingQuery);
  (state.params || []).filter((param) => param.enabled && param.key).forEach((param) => search.set(replaceEnvVars(param.key), replaceEnvVars(param.value)));
  const query = search.toString();
  return `${base}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

export function buildServerProxyPayload(state, replaceEnvVars = (value) => value) {
  const request = applyAuthToRequest(state, replaceEnvVars);
  const contentType = request.body_type === 'json'
    ? 'application/json'
    : request.body_type === 'form-urlencoded'
      ? 'application/x-www-form-urlencoded'
      : request.body_type === 'form-data'
        ? 'multipart/form-data'
        : '';
  const payload = {
    method: request.method,
    url: buildFinalUrl(request, replaceEnvVars),
    headers: headersToObject(request.headers),
    contentType,
    body: ['json', 'text', 'xml'].includes(request.body_type) ? replaceEnvVars(request.body_content) : '',
    formData: request.body_type === 'form-data' || request.body_type === 'form-urlencoded' ? request.form_data : [],
    verifySsl: true,
  };
  if (request.body_type === 'form-data') delete payload.body;
  if (!contentType) delete payload.contentType;
  return payload;
}

export function buildClientFetchOptions(state, credentials = 'omit', replaceEnvVars = (value) => value) {
  const request = applyAuthToRequest(state, replaceEnvVars);
  const headers = headersToObject(request.headers);
  let body;
  if (request.body_type === 'json') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    body = replaceEnvVars(request.body_content);
  } else if (['text', 'xml'].includes(request.body_type)) {
    body = replaceEnvVars(request.body_content);
  } else if (request.body_type === 'form-urlencoded') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
    body = new URLSearchParams((request.form_data || []).map((field) => [replaceEnvVars(field.key), replaceEnvVars(field.value)]));
  } else if (request.body_type === 'form-data') {
    body = new FormData();
    (request.form_data || []).forEach((field) => body.append(replaceEnvVars(field.key), replaceEnvVars(field.value)));
  }
  return {
    url: buildFinalUrl(request, replaceEnvVars),
    options: {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : body,
      credentials,
    },
  };
}
