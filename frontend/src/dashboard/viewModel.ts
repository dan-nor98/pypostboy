export interface TrafficPoint {
  timestamp: string;
  rpm: number;
  latencyMs: number;
  errorRate: number;
}

export interface InfraStatus {
  label: string;
  value: string;
  icon: 'alert' | 'shield' | 'error' | 'check';
  status: 'healthy' | 'warning' | 'error' | 'info';
}

export interface CollectionItem {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  statusText: string;
  endpoints: number;
}

export interface AlertItem {
  title: string;
  summary: string;
  severity: 'P1' | 'P2' | 'P3';
  status: 'healthy' | 'warning' | 'error' | 'info';
}

export interface WorkflowStep {
  label: string;
}

export interface TeamUsageSlice {
  team: string;
  sharePercent: number;
}

export interface ErrorBreakdownSlice {
  name: string;
  percent: number;
  status: 'healthy' | 'warning' | 'error';
}

export interface AssistantInsight {
  prompt: string;
  insight: string;
}

export interface DashboardViewModel {
  traffic: TrafficPoint[];
  kpis: {
    rpm: number;
    latencyMs: number;
    errorRate: number;
  };
  uptimeRatio: number;
  automationCoverage: number;
  infraSummary: InfraStatus[];
  collections: CollectionItem[];
  alerts: AlertItem[];
  workflow: WorkflowStep[];
  teamUsage: TeamUsageSlice[];
  errorBreakdown: ErrorBreakdownSlice[];
  assistantInsights: AssistantInsight[];
}
