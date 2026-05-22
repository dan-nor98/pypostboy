const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeUrlWithQuery } = require('./index');

test('mergeUrlWithQuery appends params', () => {
  const merged = mergeUrlWithQuery('https://example.com/path', { a: '1', b: 'two' });
  assert.match(merged, /a=1/);
  assert.match(merged, /b=two/);
});
