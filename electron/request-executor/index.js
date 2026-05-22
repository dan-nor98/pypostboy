const { request: undiciRequest } = require('undici');
const { performance } = require('node:perf_hooks');

function mergeUrlWithQuery(url, query) {
  const parsed = new URL(url);
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    parsed.searchParams.set(k, String(v));
  });
  return parsed.toString();
}

async function executeDesktopRequest(payload) {
  const finalUrl = mergeUrlWithQuery(payload.url, payload.query);
  const start = performance.now();
  try {
    const response = await undiciRequest(finalUrl, {
      method: payload.method,
      headers: payload.headers,
      body: payload.body,
      maxRedirections: payload.followRedirects ? payload.maxRedirects : 0,
      headersTimeout: payload.timeoutMs,
      bodyTimeout: payload.timeoutMs
    });
    const textBody = await response.body.text();
    const durationMs = Math.round(performance.now() - start);
    return {
      ok: true,
      status: response.statusCode,
      statusText: '',
      headers: response.headers || {},
      body: textBody,
      durationMs
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error.message,
        code: error.code || 'DESKTOP_REQUEST_ERROR',
        name: error.name || 'Error'
      },
      durationMs: Math.round(performance.now() - start)
    };
  }
}

module.exports = { executeDesktopRequest, mergeUrlWithQuery };
