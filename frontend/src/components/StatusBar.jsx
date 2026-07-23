import React from 'react';

function connectionLabel(status) {
  const labels = {
    connecting: 'Connecting…',
    connected: 'Connected',
    disconnected: 'Disconnected',
    failed: 'Connection failed',
  };
  return labels[status] || labels.disconnected;
}

function proxyLabel(proxy = {}) {
  if (proxy.enabled) return 'Proxy: On';
  return proxy.configured ? 'Proxy: Configured' : 'Proxy: Off';
}

function sslLabel(ssl = {}) {
  const verify = ssl.verify !== false;
  return `${verify ? '' : '⚠ '}SSL: ${ssl.label || (verify ? 'Enabled' : 'Disabled')}`;
}

function cursorLabel(cursorPosition = {}) {
  const line = cursorPosition.line || 1;
  const column = cursorPosition.column || 1;
  return `Ln ${line}, Col ${column}`;
}

function versionLabel(version) {
  if (!version) return 'v0.1.0';
  return String(version).startsWith('v') ? version : `v${version}`;
}

export function StatusBar({
  connectionStatus = 'connecting',
  stage = 'Loading',
  proxy = {enabled: false, configured: false},
  ssl = {verify: true, label: 'Enabled'},
  encoding = 'UTF-8',
  cursorPosition = {line: 1, column: 1},
  version = 'v0.1.0',
}) {
  return (
    <footer className="status" aria-label="Runtime status">
      <span>{connectionLabel(connectionStatus)}</span>
      <span>{stage}</span>
      <span>{proxyLabel(proxy)}</span>
      <span>{sslLabel(ssl)}</span>
      <span>{encoding}</span>
      <span>{cursorLabel(cursorPosition)}</span>
      <span>{versionLabel(version)}</span>
    </footer>
  );
}
