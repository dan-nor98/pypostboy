import type { AssistantInsight, DashboardViewModel, ErrorBreakdownSlice, InfraStatus, TrafficPoint, WorkflowStep } from './viewModel';

const mockTrafficSeed: TrafficPoint[] = [
  { timestamp: '08:00', rpm: 980, latencyMs: 124 },
  { timestamp: '10:00', rpm: 1260, latencyMs: 112 },
  { timestamp: '12:00', rpm: 1620, latencyMs: 136 },
  { timestamp: '14:00', rpm: 1810, latencyMs: 145 },
  { timestamp: '16:00', rpm: 1710, latencyMs: 129 },
  { timestamp: '18:00', rpm: 1490, latencyMs: 121 },
];

const mockDistributionSeed: ErrorBreakdownSlice[] = [
  { name: 'Healthy 2xx', percent: 82, status: 'healthy' },
  { name: 'Warning 4xx', percent: 11, status: 'warning' },
  { name: 'Error 5xx', percent: 7, status: 'error' },
];

const mockInfraSummarySeed: InfraStatus[] = [
  { label: 'P1 alerts', value: 2, icon: 'alert', status: 'error' },
  { label: 'SLA breaches', value: 1, icon: 'shield', status: 'warning' },
  { label: 'Failed tests', value: 4, icon: 'error', status: 'error' },
  { label: 'Passing tests', value: 47, icon: 'check', status: 'healthy' },
];

const mockAssistantInsightsSeed: AssistantInsight[] = [
  { prompt: 'Investigate AP-South latency spike', insight: 'Cache warmup lag likely from 08:00 autoscale replacement.' },
  { prompt: 'Summarize failed tests', insight: 'Billing contract test failed after invoice_total field precision change.' },
  { prompt: 'Optimize retry policy', insight: 'Drop GET retries from 5 to 3 for idempotent endpoints to protect upstream quotas.' },
];

const mockRunbookSeed: WorkflowStep[] = [
  { label: 'Execute production-safe action', action: 'deploy_canary' },
  { label: 'Execute production-safe action', action: 'restart_node' },
  { label: 'Execute production-safe action', action: 'rotate_cluster' },
  { label: 'Execute production-safe action', action: 'open_incident' },
  { label: 'Execute production-safe action', action: 'snapshot_state' },
  { label: 'Execute production-safe action', action: 'schedule_follow_up' },
];

export const adaptMockDashboardSeeds = (): DashboardViewModel => ({
  traffic: mockTrafficSeed,
  responseDistribution: mockDistributionSeed,
  infraSummary: mockInfraSummarySeed,
  assistantInsights: mockAssistantInsightsSeed,
  runbookSteps: mockRunbookSeed,
});

/**
 * Expected backend payload mapping for future integration:
 * - metrics.traffic_points[] => TrafficPoint { timestamp <- time_bucket_utc, rpm <- requests_per_minute, latencyMs <- p95_latency_ms }
 * - metrics.response_distribution[] => ErrorBreakdownSlice { name <- label, percent <- percentage, status <- health_state }
 * - monitoring.infra_summary[] => InfraStatus { label <- title, value <- count, icon <- icon_key, status <- state }
 * - assistant.insights[] => AssistantInsight { prompt <- prompt, insight <- summary }
 * - operations.runbook_steps[] => WorkflowStep { label <- display_name, action <- action_key }
 */
export const loadDashboardViewModel = async (): Promise<DashboardViewModel> => {
  return adaptMockDashboardSeeds();
};
