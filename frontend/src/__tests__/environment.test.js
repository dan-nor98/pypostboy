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

describe('request header rows', () => {
  test('preserves duplicate, disabled, empty, and variable-based header rows', () => {
    const result = resolveRequestVariables({
      url: '{{baseUrl}}/widgets',
      headers: [
        {enabled: true, key: 'Accept', value: 'application/json'},
        {enabled: true, key: 'Accept', value: 'text/plain'},
        {enabled: false, key: 'X-Disabled', value: '{{token}}'},
        {enabled: true, key: 'X-Empty', value: ''},
        {enabled: true, key: 'X-{{tenant}}', value: '{{token}}'},
      ],
      body: '',
    }, {variables: [
      {key: 'baseUrl', value: 'https://api.test'},
      {key: 'tenant', value: 'Tenant'},
      {key: 'token', value: 'abc123'},
    ]});

    expect(result.headers).toEqual([
      {enabled: true, key: 'Accept', value: 'application/json'},
      {enabled: true, key: 'Accept', value: 'text/plain'},
      {enabled: false, key: 'X-Disabled', value: 'abc123'},
      {enabled: true, key: 'X-Empty', value: ''},
      {enabled: true, key: 'X-Tenant', value: 'abc123'},
    ]);
    expect(result.unresolved).toEqual([]);
  });
});
