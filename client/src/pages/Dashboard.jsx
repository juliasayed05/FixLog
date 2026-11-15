import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Bug, Clock3, Flame, Plus, TrendingUp } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { bugApi } from '../api/services.js';
import KpiCard from '../components/KpiCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import { SeverityBadge, StatusBadge } from '../components/Badges.jsx';
import { formatDuration, shortDate, timeAgo, errorMessage } from '../utils/format.js';
import toast from 'react-hot-toast';

const chartTooltip = { contentStyle: { background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }, labelStyle: { color: 'var(--muted)' }, itemStyle: { color: 'var(--brand)' } };

export default function Dashboard() {
  const { openNewBug } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    try { const [s, b] = await Promise.all([bugApi.stats(), bugApi.list({ limit: 6, sort: 'updated' })]); setStats(s.data.data); setBugs(b.data.data.items); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); const refresh = () => load(); window.addEventListener('fixlog:data-changed', refresh); return () => window.removeEventListener('fixlog:data-changed', refresh); }, []);
  const trend = useMemo(() => {
    const points = stats?.volume || [];
    return points.slice(-14).map((item) => ({ ...item, label: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }));
  }, [stats]);
  const overview = stats?.overview || {};
  const percentChange = (current, previous) => previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  return (
    <div className="page-content animate-fade-in">
      <div className="welcome-strip"><div className="welcome-icon"><Activity size={18} /></div><div><strong>Capture the signal. Keep the fix.</strong><span>Turn one-off debugging sessions into searchable engineering intelligence.</span></div><button className="welcome-link" onClick={openNewBug}>Log an issue <ArrowRight size={14} /></button></div>
      <div className="kpi-grid">
        <KpiCard label="Total bug logs" value={overview.total ?? '—'} detail={`${overview.createdLast30Days ?? 0} created in 30 days`} change={percentChange(overview.createdLast30Days || 0, overview.createdPrevious30Days || 0)} icon={Bug} tone="cyan" />
        <KpiCard label="Active issues" value={overview.open ?? '—'} detail="Open and in progress" icon={Flame} tone="orange" />
        <KpiCard label="Resolution rate" value={overview.resolutionRate != null ? `${overview.resolutionRate}%` : '—'} detail={`${overview.resolvedLast30Days ?? 0} resolved in 30 days`} change={percentChange(overview.resolvedLast30Days || 0, overview.resolvedPrevious30Days || 0)} icon={TrendingUp} tone="green" />
        <KpiCard label="Debugging hours" value={overview.totalDebuggingHours != null ? `${overview.totalDebuggingHours}h` : '—'} detail={`Avg. ${overview.averageDebuggingMinutes ?? 0} min per log`} icon={Clock3} tone="blue" />
      </div>
      <div className="dashboard-grid">
        <ChartCard title="Issue activity" subtitle="New bug logs over the last 30 days" action={<span className="chart-legend"><i /> Created</span>}>
          {loading ? <div className="chart-skeleton" /> : trend.length ? <ResponsiveContainer width="100%" height={238}><AreaChart data={trend} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}><defs><linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#62d9e8" stopOpacity={0.25} /><stop offset="95%" stopColor="#62d9e8" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--grid)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} minTickGap={25} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} /><Tooltip {...chartTooltip} /><Area type="monotone" dataKey="created" stroke="#62d9e8" strokeWidth={2.5} fill="url(#volumeFill)" activeDot={{ r: 5, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer> : <div className="empty-chart">No issue activity yet. Create your first bug log to start the trend.</div>}
        </ChartCard>
        <section className="panel focus-panel"><div className="panel-header"><div><h3>System pulse</h3><p>Current issue-resolution health</p></div><span className="pulse-live"><i /> LIVE</span></div><div className="focus-score"><strong>{overview.resolutionRate ?? 0}<small>%</small></strong><span>resolution rate</span></div><div className="focus-progress"><span style={{ width: `${Math.min(100, overview.resolutionRate || 0)}%` }} /></div><div className="focus-stats"><div><span>Open issues</span><strong>{overview.open ?? 0}</strong></div><div><span>Resolved</span><strong>{overview.resolved ?? 0}</strong></div><div><span>Resolved this month</span><strong>{overview.resolvedLast30Days ?? 0}</strong></div></div><Link to="/analytics" className="text-link">Explore analytics <ArrowRight size={14} /></Link></section>
      </div>
      <section className="panel recent-panel"><div className="panel-header"><div><h3>Recent investigations</h3><p>Latest changes across your issue journal</p></div><Link className="text-link" to="/bugs">Open issue journal <ArrowRight size={14} /></Link></div>
        {loading ? <div className="list-skeleton" /> : bugs.length ? <div className="recent-list">{bugs.map((bug) => <Link key={bug._id} to={`/bugs/${bug._id}`} className="recent-row"><span className="recent-bug-icon"><Bug size={16} /></span><span className="recent-main"><strong>{bug.title}</strong><small>{(bug.techTags || []).slice(0, 3).join(' · ') || 'No tags'} <span>·</span> Updated {timeAgo(bug.updatedAt)}</small></span><SeverityBadge severity={bug.severity} /><StatusBadge status={bug.status} /><span className="recent-arrow"><ArrowRight size={15} /></span></Link>)}</div> : <div className="empty-state"><div className="empty-icon"><Bug size={22} /></div><h3>Your journal starts here</h3><p>Capture your first bug, the root cause, and how you fixed it.</p><button onClick={openNewBug} className="button-primary"><Plus size={15} /> Create first bug log</button></div>}
      </section>
    </div>
  );
}
