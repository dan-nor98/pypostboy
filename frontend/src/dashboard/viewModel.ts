export interface TrafficPoint {
  timestamp: string;
  rpm: number;
  latencyMs: number;
}

export interface InfraStatus {
  label: string;
  value: number;
  icon: 'alert' | 'shield' | 'error' | 'check';
  status: 'healthy' | 'warning' | 'error' | 'info';
}

export interface CollectionItem {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'error';
}

export interface AlertItem {
  title: string;
  severity: 'P1' | 'P2' | 'P3';
  status: 'healthy' | 'warning' | 'error' | 'info';
}

export interface WorkflowStep {
  label: string;
  action: string;
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
  responseDistribution: ErrorBreakdownSlice[];
  infraSummary: InfraStatus[];
  assistantInsights: AssistantInsight[];
  runbookSteps: WorkflowStep[];
}
