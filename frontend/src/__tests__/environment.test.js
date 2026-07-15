import {describe, expect, test} from 'vitest';
import {interpolateVariables, maskSecret, resolveRequestVariables} from '../environment';

describe('environment variables', () => {
  test('interpolates variables in URL, headers, and body', () => {
    const result = resolveRequestVariables({
      url: '{{baseUrl}}/widgets',
      headers: {Authorization: 'Bearer {{token}}'},
      body: '{"token":"{{token}}"}',
    }, {variables: [{key: 'baseUrl', value: 'https://api.test'}, {key: 'token', value: 'abc123'}]});

    expect(result).toMatchObject({
      url: 'https://api.test/widgets',
      headers: {Authorization: 'Bearer abc123'},
      body: '{"token":"abc123"}',
      unresolved: [],
    });
  });

  test('reports unresolved variables', () => {
    expect(interpolateVariables('{{missing}}/health', {})).toEqual({
      resolved: '{{missing}}/health',
      unresolved: ['missing'],
    });
  });

  test('masks secret values', () => {
    expect(maskSecret('super-secret-token')).toBe('su••••••••en');
    expect(maskSecret('abc')).toBe('••••');
  });
});
