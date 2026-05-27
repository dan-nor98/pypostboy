import type {
  AlertItem,
  AssistantInsight,
  CollectionItem,
  DashboardViewModel,
  ErrorBreakdownSlice,
  InfraStatus,
  TeamUsageSlice,
  TrafficPoint,
  WorkflowStep,
} from './viewModel';

const traffic: TrafficPoint[] = [
  { timestamp: '08:00', rpm: 1200, latencyMs: 111, errorRate: 0.21 },
  { timestamp: '10:00', rpm: 1480, latencyMs: 117, errorRate: 0.26 },
  { timestamp: '12:00', rpm: 1810, latencyMs: 129, errorRate: 0.34 },
  { timestamp: '14:00', rpm: 1985, latencyMs: 141, errorRate: 0.52 },
  { timestamp: '16:00', rpm: 1910, latencyMs: 132, errorRate: 0.39 },
  { timestamp: '18:00', rpm: 1715, latencyMs: 124, errorRate: 0.29 },
];

const infraSummary: InfraStatus[] = [
  { label: 'Uptime', value: '99.982%', icon: 'check', status: 'healthy' },
  { label: 'Gateway status', value: 'Stable', icon: 'shield', status: 'healthy' },
  { label: 'Regions', value: '6 / 6', icon: 'check', status: 'healthy' },
  { label: 'Security events', value: '2', icon: 'alert', status: 'warning' },
];

const collections: CollectionItem[] = [
  { name: 'Identity & Auth', method: 'POST', statusText: 'Passing contract tests', endpoints: 24 },
  { name: 'Billing API', method: 'GET', statusText: 'Latency within SLO', endpoints: 31 },
  { name: 'Webhook Delivery', method: 'PUT', statusText: 'Retries elevated in eu-west-1', endpoints: 18 },
  { name: 'Audit Stream', method: 'DELETE', statusText: 'Retention cleanup delayed', endpoints: 9 },
];

const alerts: AlertItem[] = [
  { title: 'SLA Warning · Billing API', summary: 'p95 exceeded 140ms for 7 minutes in prod-us.', severity: 'P2', status: 'warning' },
  { title: 'Automated Test Failure', summary: 'Webhook signature validation mismatch in regression suite.', severity: 'P2', status: 'error' },
  { title: 'Region Recovery Complete', summary: 'ap-south-1 node pool fully restored.', severity: 'P3', status: 'healthy' },
];

const workflow: WorkflowStep[] = [
  { label: 'Trigger' },
  { label: 'Validate' },
  { label: 'Transform' },
  { label: 'Deploy' },
];

const teamUsage: TeamUsageSlice[] = [
  { team: 'Payments', sharePercent: 34 },
  { team: 'Risk', sharePercent: 21 },
  { team: 'Identity', sharePercent: 18 },
  { team: 'Core', sharePercent: 27 },
];

const errorBreakdown: ErrorBreakdownSlice[] = [
  { name: '5xx Gateway', percent: 39, status: 'error' },
  { name: '4xx Client', percent: 44, status: 'warning' },
  { name: 'Timeouts', percent: 17, status: 'healthy' },
];

const assistantInsights: AssistantInsight[] = [
  { prompt: 'Generate auth tests', insight: 'Proposed 12 OAuth edge-case tests for token refresh, nonce replay, and scope narrowing.' },
  { prompt: 'Explain 500 errors', insight: 'Most 500s correlate with inventory sync timeout in eu-west-1 during deploy window.' },
  { prompt: 'Optimize slow endpoints', insight: 'Move account-summary aggregation to read replica; estimated p95 reduction: 18ms.' },
];

export const loadDashboardViewModel = async (): Promise<DashboardViewModel> => ({
  traffic,
  kpis: { rpm: 1715, latencyMs: 124, errorRate: 0.29 },
  uptimeRatio: 0.99982,
  automationCoverage: 93,
  infraSummary,
  collections,
  alerts,
  workflow,
  teamUsage,
  errorBreakdown,
  assistantInsights,
});
