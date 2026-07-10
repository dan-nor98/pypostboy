export function isDesktopNativeAvailable() {
  return Boolean(window.postboyDesktop && typeof window.postboyDesktop.executeRequest === 'function');
}

export async function executeDesktopNativeRequest(payload) {
  if (!isDesktopNativeAvailable()) {
    throw new Error('Desktop native mode is not available in this runtime.');
  }
  return window.postboyDesktop.executeRequest(payload);
}
