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
  const mode = proxy.mode || (proxy.enabled ? 'enabled' : 'disabled');
  if (mode === 'disabled' || proxy.enabled === false) return 'Proxy: Disabled';
  if (proxy.target) return `Proxy: ${proxy.transport || 'http'} target`;
  return proxy.configured ? 'Proxy: Configured' : 'Proxy: On';
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

function stageText(stage, stageLabel, stageClassification) {
  const fallback = stage || 'Loading';
  if (stageLabel) return stageLabel;
  return stageClassification === 'non-production' ? `${fallback} (non-production)` : fallback;
}

function stageClassName(stageClassification) {
  return `status-stage status-stage-${stageClassification === 'production' ? 'production' : 'non-production'}`;
}

export function StatusBar({
  connectionStatus = 'connecting',
  stage = 'Loading',
  stageLabel = '',
  stageClassification = 'non-production',
  proxy = {enabled: false, configured: false},
  ssl = {verify: true, label: 'Enabled'},
  encoding = 'UTF-8',
  cursorPosition = {line: 1, column: 1},
  version = 'v0.1.0',
  diagnostics = [],
  retry = {},
}) {
  return (
    <footer className="status" aria-label="Runtime status">
      <span title={diagnostics.join('; ')}>{connectionLabel(connectionStatus)}</span>
      <span className={stageClassName(stageClassification)} aria-label={`Runtime stage: ${stageText(stage, stageLabel, stageClassification)}`}>{stageText(stage, stageLabel, stageClassification)}</span>
      <span title={(proxy.diagnostics || []).join('; ')}>{proxyLabel(proxy)}</span>
      <span>{sslLabel(ssl)}</span>
      <span>{encoding}</span>
      <span>{cursorLabel(cursorPosition)}</span>
      {diagnostics.length > 0 && <span>{diagnostics[0]}</span>}
      {retry.retryable && retry.nextRetryMs && <span>{`Retry in ${Math.round(retry.nextRetryMs / 1000)}s`}</span>}
      <span>{versionLabel(version)}</span>
    </footer>
  );
}
