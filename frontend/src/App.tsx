import { useEffect, useState } from 'react';
import { BarChart3, MoonStar, Sun } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Card } from './components/ui/card';

const data = [
  { name: 'Mon', requests: 48 },
  { name: 'Tue', requests: 65 },
  { name: 'Wed', requests: 58 },
  { name: 'Thu', requests: 89 },
  { name: 'Fri', requests: 96 },
  { name: 'Sat', requests: 55 },
  { name: 'Sun', requests: 42 },
];

export default function App() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">New React Route</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold">
            <BarChart3 className="h-7 w-7 text-accent" /> Dashboard
          </h1>
        </div>
        <button
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-neu"
          onClick={() => setDark((v) => !v)}
        >
          {dark ? <Sun className="inline h-4 w-4" /> : <MoonStar className="inline h-4 w-4" />} Toggle
        </button>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="mb-4 text-lg font-medium">Weekly Request Volume</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted))" />
                <Tooltip />
                <Area type="monotone" dataKey="requests" stroke="hsl(var(--accent))" fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-medium">Legacy App</h2>
          <p className="mt-2 text-sm text-muted">Legacy UI remains available at the existing root route.</p>
          <a href="/" className="mt-4 inline-block rounded-lg bg-accent px-3 py-2 text-sm font-medium text-black">
            Open legacy view
          </a>
        </Card>
      </div>
    </main>
  );
}
