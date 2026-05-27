import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cloud,
  Code2,
  Database,
  Gauge,
  Globe,
  Layers3,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  MessageSquareText,
  PlayCircle,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const trafficData = [
  { t: '08:00', traffic: 980, latency: 124, errorRate: 0.31 },
  { t: '10:00', traffic: 1260, latency: 112, errorRate: 0.24 },
  { t: '12:00', traffic: 1620, latency: 136, errorRate: 0.44 },
  { t: '14:00', traffic: 1810, latency: 145, errorRate: 0.52 },
  { t: '16:00', traffic: 1710, latency: 129, errorRate: 0.36 },
  { t: '18:00', traffic: 1490, latency: 121, errorRate: 0.29 },
];

const infra = [
  { region: 'US-East', uptime: '99.99%', status: 'Healthy' },
  { region: 'EU-West', uptime: '99.97%', status: 'Healthy' },
  { region: 'AP-South', uptime: '99.91%', status: 'Degraded' },
];

const collections = [
  { name: 'Auth Service', method: 'POST', endpoint: '/v1/sessions', status: 200 },
  { name: 'Billing API', method: 'GET', endpoint: '/v2/invoices', status: 206 },
  { name: 'Users API', method: 'PATCH', endpoint: '/v1/users/:id', status: 202 },
  { name: 'Webhooks', method: 'DELETE', endpoint: '/v1/hooks/:id', status: 500 },
];

const alerts = [
  { label: 'P1 Alerts', value: 2, icon: AlertTriangle },
  { label: 'SLA Breaches', value: 1, icon: ShieldCheck },
  { label: 'Failed Tests', value: 4, icon: XCircle },
  { label: 'Passing Tests', value: 47, icon: CheckCircle2 },
];

const pipeline = [
  { step: 'Lint & Static', state: 'done' },
  { step: 'Contract Tests', state: 'done' },
  { step: 'Canary Deploy', state: 'running' },
  { step: 'Global Rollout', state: 'queued' },
];

const teamUsage = [
  { team: 'Core', requests: 36, errors: 2.1 },
  { team: 'Growth', requests: 28, errors: 1.4 },
  { team: 'Data', requests: 18, errors: 0.8 },
  { team: 'Partner', requests: 12, errors: 2.9 },
];

const aiItems = [
  { prompt: 'Investigate AP-South latency spike', insight: 'Likely tied to cache miss burst + warmup lag.' },
  { prompt: 'Summarize failed tests', insight: '4 failures linked to schema drift in Billing API.' },
  { prompt: 'Optimize retry policy', insight: 'Reduce max retries from 5 → 3 for idempotent GETs.' },
];

const distribution = [
  { name: '2xx', value: 82, color: '#22c55e' },
  { name: '4xx', value: 11, color: '#f59e0b' },
  { name: '5xx', value: 7, color: '#ef4444' },
];

export default function EnterpriseApiDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="border-b border-border/70 bg-card/55 p-5 backdrop-blur-xl lg:border-b-0 lg:border-r" aria-label="Primary navigation">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-accent/20 p-2 text-accent shadow-lg shadow-accent/20"><Cloud className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted">Enterprise Console</p>
              <h2 className="font-semibold">API Pulse</h2>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              ['Overview', LayoutGrid],
              ['Collections', Code2],
              ['Monitoring', Activity],
              ['Workflow', Workflow],
              ['Teams', Users],
              ['Settings', Settings],
            ].map(([label, Icon], i) => (
              <button key={String(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${i === 0 ? 'bg-accent/20 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]' : 'text-muted hover:bg-card hover:text-foreground'}`}>
                <Icon className="h-4 w-4" />
                {label}
                {i === 0 && <ChevronRight className="ml-auto h-4 w-4 text-accent" />}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-[8px_8px_16px_rgba(0,0,0,0.14),-8px_-8px_16px_rgba(255,255,255,0.03)]">
            <p className="text-xs text-muted">Infra Health</p>
            <div className="mt-3 space-y-2">
              {infra.map((r) => (
                <div key={r.region} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted" />{r.region}</span>
                  <span className={`rounded-full px-2 py-1 text-xs ${r.status === 'Healthy' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-400'}`}>{r.uptime}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 px-5 py-4 backdrop-blur-xl md:px-8" aria-label="Dashboard header">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Live Operations</p>
                <h1 className="text-2xl font-semibold">Enterprise API Dashboard</h1>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-xl border border-border/70 bg-card/70 p-2 text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Search className="h-4 w-4" /></button>
                <button className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-black shadow-lg shadow-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Deploy Changes</button>
              </div>
            </div>
          </header>

          <main className="grid min-w-0 grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Main dashboard widgets">
            <section className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-lg shadow-xl md:col-span-2 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-medium">Traffic & Latency</h2><Gauge className="h-4 w-4 text-accent" /></div>
              <div className="h-56">
                <ResponsiveContainer>
                  <AreaChart data={trafficData}>
                    <defs><linearGradient id="traf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.55} /><stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <XAxis dataKey="t" stroke="hsl(var(--muted))" />
                    <YAxis stroke="hsl(var(--muted))" />
                    <Tooltip />
                    <Area dataKey="traffic" stroke="hsl(var(--accent))" fill="url(#traf)" />
                    <Line dataKey="latency" stroke="#60a5fa" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-500">p95 145ms</span>
                <span className="rounded-full bg-rose-500/15 px-2 py-1 text-rose-400">Errors 0.52%</span>
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-lg shadow-xl">
              <h2 className="mb-3 font-medium">Response Distribution</h2>
              <div className="h-48"><ResponsiveContainer><PieChart><Pie data={distribution} dataKey="value" innerRadius={48} outerRadius={72}>{distribution.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-lg shadow-xl xl:col-span-2">
              <h2 className="mb-3 font-medium">Collections</h2>
              <div className="space-y-2">
                {collections.map((c) => (
                  <div key={c.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm">
                    <div><p>{c.name}</p><p className="text-xs text-muted">{c.endpoint}</p></div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-sky-500/15 px-2 py-1 text-xs text-sky-400">{c.method}</span>
                      <span className={`rounded-full px-2 py-1 text-xs ${c.status >= 500 ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-500'}`}>{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-lg shadow-xl">
              <h2 className="mb-3 font-medium">Monitoring & SLA</h2>
              <div className="grid grid-cols-2 gap-2">
                {alerts.map((a) => (
                  <div key={a.label} className="rounded-xl bg-background/45 p-3">
                    <a.icon className="mb-1 h-4 w-4 text-accent" />
                    <p className="text-lg font-semibold">{a.value}</p>
                    <p className="text-xs text-muted">{a.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-lg shadow-xl">
              <h2 className="mb-3 font-medium">Workflow Pipeline</h2>
              <div className="space-y-3">
                {pipeline.map((p) => (
                  <div key={p.step}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span>{p.step}</span><span className="text-xs text-muted">{p.state}</span></div>
                    <div className="h-2 rounded-full bg-background/50"><div className={`h-2 rounded-full ${p.state === 'done' ? 'w-full bg-emerald-500' : p.state === 'running' ? 'w-2/3 bg-accent' : 'w-1/4 bg-slate-500'}`} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-lg shadow-xl">
              <h2 className="mb-3 font-medium">Team Usage & Errors</h2>
              <div className="h-48"><ResponsiveContainer><BarChart data={teamUsage}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="team" stroke="hsl(var(--muted))" /><YAxis stroke="hsl(var(--muted))" /><Tooltip /><Bar dataKey="requests" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </section>
          </main>
        </div>

        <aside className="hidden border-l border-border/70 bg-card/55 p-5 backdrop-blur-xl xl:block" aria-label="AI assistant panel">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium"><Bot className="h-4 w-4 text-accent" /> AI Assistant</h2>
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <section className="space-y-3">
            {aiItems.map((a) => (
              <article key={a.prompt} className="rounded-2xl border border-border/70 bg-background/40 p-3">
                <p className="mb-1 flex items-center gap-2 text-sm"><MessageSquareText className="h-4 w-4 text-muted" />{a.prompt}</p>
                <p className="text-xs text-muted">{a.insight}</p>
              </article>
            ))}
          </section>
          <section className="mt-5 rounded-2xl border border-border/70 bg-background/35 p-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><ListChecks className="h-4 w-4 text-accent" /> Quick Actions</h3>
            <div className="grid gap-2 text-sm text-muted">
              {[PlayCircle, Server, Database, LifeBuoy, Layers3, Clock3].map((Icon, i) => (
                <button key={i} className="flex items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Icon className="h-4 w-4" />Run assistant task</button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
