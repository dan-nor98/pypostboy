const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDesktopRequestPayload } = require('./validation');

test('accepts valid payload', () => {
  const out = validateDesktopRequestPayload({ method: 'get', url: 'https://example.com', headers: {}, query: {} });
  assert.equal(out.method, 'GET');
});

test('rejects invalid url', () => {
  assert.throws(() => validateDesktopRequestPayload({ method: 'GET', url: 'not-a-url' }), /Invalid URL/);
});
