const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validateDesktopRequestPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Payload must be an object');

  const method = String(payload.method || '').toUpperCase();
  if (!ALLOWED_METHODS.has(method)) throw new Error('Unsupported HTTP method');

  const url = String(payload.url || '').trim();
  let parsed;
  try { parsed = new URL(url); } catch (_err) { throw new Error('Invalid URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP(S) protocols are allowed');

  const headers = payload.headers || {};
  if (typeof headers !== 'object' || Array.isArray(headers)) throw new Error('Headers must be an object');

  const query = payload.query || {};
  if (typeof query !== 'object' || Array.isArray(query)) throw new Error('Query params must be an object');

  const timeoutMs = toNumber(payload.timeoutMs, 30000);
  if (timeoutMs < 1 || timeoutMs > 120000) throw new Error('timeoutMs must be between 1 and 120000');

  const maxRedirects = toNumber(payload.maxRedirects, 5);
  if (maxRedirects < 0 || maxRedirects > 20) throw new Error('maxRedirects must be between 0 and 20');

  return {
    method,
    url: parsed.toString(),
    headers,
    query,
    body: payload.body == null ? null : String(payload.body),
    timeoutMs,
    maxRedirects,
    followRedirects: payload.followRedirects !== false
  };
}

module.exports = { validateDesktopRequestPayload };
