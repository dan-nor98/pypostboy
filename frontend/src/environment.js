export const defaultEnvironments = [
  {
    id: 'local',
    name: 'Local',
    variables: [
      {key: 'baseUrl', value: 'https://example.test', secret: false},
      {key: 'token', value: '', secret: true},
      {key: 'password', value: '', secret: true},
    ],
  },
];

export const variablePattern = /{{\s*([A-Za-z_][\w.-]*)\s*}}/g;

export function isSensitiveName(name = '') {
  return /(token|secret|password|passwd|api[_-]?key|authorization|bearer)/i.test(name);
}

export function maskSecret(value = '') {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 2)}${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-2)}`;
}

export function environmentVariables(environment) {
  return (environment?.variables || []).reduce((result, variable) => {
    if (variable.key) result[variable.key] = variable.value || '';
    return result;
  }, {});
}

export function findVariableTokens(value = '') {
  const tokens = [];
  String(value).replace(variablePattern, (match, name, offset) => {
    tokens.push({match, name, from: offset, to: offset + match.length});
    return match;
  });
  return tokens;
}

export function interpolateVariables(value = '', variables = {}) {
  const unresolved = [];
  const resolved = String(value).replace(variablePattern, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(variables, name) && variables[name] !== '') {
      return variables[name];
    }
    unresolved.push(name);
    return match;
  });
  return {resolved, unresolved};
}

export function uniqueUnresolved(items) {
  return [...new Set(items.flatMap((item) => item.unresolved || []))];
}

export function resolveRequestVariables({url = '', headers = {}, body = ''}, environment) {
  const variables = environmentVariables(environment);
  const resolvedUrl = interpolateVariables(url, variables);
  const resolvedBody = interpolateVariables(body, variables);
  const headerEntries = Object.entries(headers).map(([key, value]) => {
    const resolvedKey = interpolateVariables(key, variables);
    const resolvedValue = interpolateVariables(value, variables);
    return [resolvedKey.resolved, resolvedValue.resolved, [...resolvedKey.unresolved, ...resolvedValue.unresolved]];
  });
  return {
    url: resolvedUrl.resolved,
    body: resolvedBody.resolved,
    headers: Object.fromEntries(headerEntries.map(([key, value]) => [key, value])),
    unresolved: uniqueUnresolved([resolvedUrl, resolvedBody, ...headerEntries.map(([, , unresolved]) => ({unresolved}))]),
  };
}
