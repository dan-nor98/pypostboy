export const formatRpm = (value: number): string => `${new Intl.NumberFormat('en-US').format(value)} RPM`;

export const formatLatencyMs = (value: number): string => `${Math.round(value)}ms`;

export const formatPercentage = (value: number, digits = 2): string => `${value.toFixed(digits)}%`;

export const formatUptimeSla = (uptimeRatio: number): string => `SLA ${formatPercentage(uptimeRatio * 100, 2)}`;
