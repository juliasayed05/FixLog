import { useEffect, useState } from 'react';
import { Activity, BarChart3, Clock3, Target, TrendingUp } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { bugApi } from '../api/services.js';
import ChartCard from '../components/ChartCard.jsx';
import KpiCard from '../components/KpiCard.jsx';
import { errorMessage } from '../utils/format.js';
import toast from 'react-hot-toast';

const severityColors = ['#ff7886', '#f39b65', '#f3bd68', '#9bdc82'];
const tooltip = { contentStyle: { background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }, labelStyle: { color: 'var(--muted)' } };

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = () => bugApi.stats().then(({ data }) => { if (alive) setStats(data.data); }).catch((error) => toast.error(errorMessage(error))).finally(() => { if (alive) setLoading(false); });
    load(); window.addEventListener('fixlog:data-changed', load);
    return () => { alive = false; window.removeEventListener('fixlog:data-changed', load); };
  }, []);
  const overview = stats?.overview || {};
  const volume = (stats?.volume || []).map((item) => ({ ...item, label: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }));
  const statusData = stats?.statusBreakdown || [];
  const severityData = stats?.severityBreakdown || [];
  const tagData = stats?.topTags || [];
  return <div className="page-content animate-fade-in">
    <div className="analytics-intro"><div><div className="analytics-title-icon"><BarChart3 size={17} /></div><h2>Workspace performance</h2><p>Live metrics across the engineering journal. Data updates whenever an issue changes.</p></div><div className="analytics-period"><span className="period-dot" /> Rolling 30 days</div></div>
    <div className="kpi-grid analytics-kpis"><KpiCard label="Total bug logs" value={overview.total ?? '—'} detail="Across the workspace" icon={Activity} tone="indigo" /><KpiCard label="Resolution rate" value={`${overview.resolutionRate ?? 0}%`} detail={`${overview.resolved ?? 0} resolved to date`} icon={Target} tone="green" /><KpiCard label="Debugging hours" value={`${overview.totalDebuggingHours ?? 0}h`} detail={`${overview.averageDebuggingMinutes ?? 0} min average per log`} icon={Clock3} tone="blue" /><KpiCard label="Resolved · 30 days" value={overview.resolvedLast30Days ?? 0} detail={`vs ${overview.resolvedPrevious30Days ?? 0} resolved in the prior 30 days`} icon={TrendingUp} tone="purple" /></div>
    <div className="analytics-grid"><ChartCard title="Bug volume" subtitle="Created and resolved by day"><ResponsiveContainer width="100%" height={270}><AreaChart data={volume} margin={{ left: -18, right: 8, top: 10, bottom: 0 }}><defs><linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#62d9e8" stopOpacity={.28} /><stop offset="100%" stopColor="#62d9e8" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} minTickGap={25} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} /><Tooltip {...tooltip} /><Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingBottom: 12 }} /><Area dataKey="created" name="Created" type="monotone" stroke="#62d9e8" strokeWidth={2.5} fill="url(#createdFill)" /><Area dataKey="resolved" name="Resolved" type="monotone" stroke="#9bdc82" strokeWidth={2} fill="transparent" /></AreaChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Severity distribution" subtitle="How issues are prioritized"><div className="severity-chart-layout"><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={severityData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={4} stroke="none">{severityData.map((entry, index) => <Cell key={entry.name} fill={severityColors[['Critical', 'High', 'Medium', 'Low'].indexOf(entry.name)] || severityColors[index % 4]} />)}</Pie><Tooltip {...tooltip} /></PieChart></ResponsiveContainer><div className="severity-legend">{['Critical', 'High', 'Medium', 'Low'].map((label, index) => <div key={label}><i style={{ background: severityColors[index] }} /><span>{label}</span><strong>{severityData.find((item) => item.name === label)?.value || 0}</strong></div>)}</div></div></ChartCard>
      <ChartCard title="Top technologies" subtitle="Most frequently tagged stacks"><ResponsiveContainer width="100%" height={255}><BarChart data={tagData} layout="vertical" margin={{ left: 4, right: 18, top: 5, bottom: 5 }}><CartesianGrid stroke="var(--grid)" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} width={92} /><Tooltip {...tooltip} /><Bar dataKey="value" name="Issue tags" fill="#62d9e8" radius={[0, 6, 6, 0]} barSize={18} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Status breakdown" subtitle="Current workflow distribution"><div className="status-breakdown">{['Open', 'In Progress', 'Resolved', 'Archived'].map((name) => { const count = statusData.find((item) => item.name === name)?.value || 0; const total = overview.total || 0; return <div className="status-breakdown-row" key={name}><div><span className={`column-dot column-${name.toLowerCase().replace(' ', '-')}`} /><span>{name}</span><strong>{count}</strong></div><div className="breakdown-track"><i style={{ width: `${total ? count / total * 100 : 0}%` }} /></div><small>{total ? Math.round(count / total * 100) : 0}%</small></div>; })}</div></ChartCard>
    </div>
    {loading && <p className="loading-note">Refreshing workspace metrics…</p>}
  </div>;
}
