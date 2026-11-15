import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Ban, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleAlert, Clock3, FileSearch, Filter, LockKeyhole, RefreshCw, Search, Shield,
  ShieldCheck, Trash2, UserRound, Users, Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi, bugApi } from '../api/services.js';
import { errorMessage, initials, shortDate, timeAgo } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'User management', icon: Users },
  { id: 'issues', label: 'Issue moderation', icon: FileSearch },
  { id: 'audit', label: 'Audit trail', icon: ShieldCheck },
];

function Metric({ label, value, note, icon: Icon, tone = 'sage' }) {
  return <article className="admin-metric panel">
    <div className={`admin-metric-icon tone-${tone}`}><Icon size={17} /></div>
    <span>{label}</span>
    <strong>{value ?? '—'}</strong>
    <small>{note}</small>
  </article>;
}

function Empty({ icon: Icon = FileSearch, title, message }) {
  return <div className="admin-empty"><div><Icon size={22} /></div><strong>{title}</strong><span>{message}</span></div>;
}

function UserAvatar({ user }) {
  return <div className="admin-avatar">{user.avatar ? <img src={user.avatar} alt="" /> : initials(user.name)}</div>;
}

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userState, setUserState] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [issues, setIssues] = useState([]);
  const [issueSearch, setIssueSearch] = useState('');
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOverview = useCallback(async () => {
    const { data } = await adminApi.overview();
    setOverview(data.data);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data } = await adminApi.users({ search: userSearch.trim(), role: userRole, state: userState, page: userPage, limit: 12 });
    setUsers(data.data.users);
    setUsersPagination(data.data.pagination);
  }, [userSearch, userRole, userState, userPage]);

  const loadIssues = useCallback(async () => {
    const { data } = await bugApi.list({ search: issueSearch.trim(), sort: 'updated', page: 1, limit: 100 });
    setIssues(data.data.items || []);
  }, [issueSearch]);

  const loadAudit = useCallback(async () => {
    const { data } = await adminApi.audit({ page: 1, limit: 50 });
    setAudit(data.data.events || []);
  }, []);

  const refreshAll = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      await Promise.all([loadOverview(), ...(tab === 'users' ? [loadUsers()] : []), ...(tab === 'issues' ? [loadIssues()] : []), ...(tab === 'audit' ? [loadAudit()] : [])]);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadOverview, loadUsers, loadIssues, loadAudit, tab]);

  useEffect(() => { refreshAll(); }, [refreshAll]);
  useEffect(() => {
    if (tab !== 'users') return undefined;
    const timer = window.setTimeout(() => loadUsers().catch((error) => toast.error(errorMessage(error))), 250);
    return () => window.clearTimeout(timer);
  }, [tab, loadUsers]);
  useEffect(() => {
    if (tab !== 'issues') return undefined;
    const timer = window.setTimeout(() => loadIssues().catch((error) => toast.error(errorMessage(error))), 250);
    return () => window.clearTimeout(timer);
  }, [tab, loadIssues]);

  async function runUserAction(action, user) {
    try {
      if (action === 'role') {
        const role = user._nextRole;
        if (!role) return;
        if (role === 'Admin' && !window.confirm(`Grant full administrator permissions to ${user.name}? They will be able to manage accounts and delete workspace records.`)) return;
        await adminApi.changeRole(user._id, role);
        toast.success(`${user.name}'s role updated`);
      } else if (action === 'suspend') {
        const reason = window.prompt(`Reason for suspending ${user.name}:`, 'Policy or access review');
        if (reason === null) return;
        await adminApi.suspend(user._id, reason);
        toast.success(`${user.name} suspended`);
      } else if (action === 'activate') {
        await adminApi.activate(user._id);
        toast.success(`${user.name}'s access restored`);
      } else if (action === 'delete') {
        const accepted = window.confirm(`Permanently delete ${user.name} (${user.email})? Their account and bug logs they own will be deleted. Audit history will be retained with their name.`);
        if (!accepted) return;
        await adminApi.removeUser(user._id);
        toast.success('Account deleted');
      }
      await Promise.all([loadUsers(), loadOverview()]);
    } catch (error) { toast.error(errorMessage(error)); }
  }

  async function updateIssueStatus(issue, status) {
    try {
      await bugApi.update(issue._id, { status });
      toast.success('Issue workflow updated');
      await Promise.all([loadIssues(), loadOverview()]);
    } catch (error) { toast.error(errorMessage(error)); }
  }

  async function deleteIssue(issue) {
    if (!window.confirm(`Delete “${issue.title}”? This cannot be undone.`)) return;
    try {
      await bugApi.remove(issue._id);
      toast.success('Issue deleted');
      await Promise.all([loadIssues(), loadOverview()]);
    } catch (error) { toast.error(errorMessage(error)); }
  }

  const userSummary = useMemo(() => overview?.users || {}, [overview]);
  const issueSummary = useMemo(() => overview?.issues || {}, [overview]);

  return <div className="page-content admin-page animate-fade-in">
    <section className="admin-banner">
      <div className="admin-banner-symbol"><Shield size={21} /></div>
      <div className="admin-banner-copy"><span>CONTROL CENTER</span><h2>Workspace administration</h2><p>Manage access, moderate engineering records, and review every important action.</p></div>
      <div className="admin-banner-right"><span className="admin-secure-label"><LockKeyhole size={13} /> Admin access</span><button className="button-secondary admin-refresh" onClick={() => refreshAll()} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh</button></div>
    </section>

    <div className="admin-tabs" role="tablist" aria-label="Admin sections">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15} />{label}{id === 'users' && <span>{userSummary.total ?? '—'}</span>}</button>)}
    </div>

    {tab === 'overview' && <div className="admin-section-stack">
      <div className="admin-metrics-grid">
        <Metric label="Total accounts" value={userSummary.total} note={`${userSummary.active || 0} active right now`} icon={Users} tone="sage" />
        <Metric label="Suspended accounts" value={userSummary.suspended} note="Access currently restricted" icon={Ban} tone="rose" />
        <Metric label="Active administrators" value={userSummary.admins} note={`${userSummary.leads || 0} team leads`} icon={ShieldCheck} tone="amber" />
        <Metric label="Total issue records" value={issueSummary.total} note={`${issueSummary.active || 0} active workflow items`} icon={Wrench} tone="blue" />
        <Metric label="Critical issues" value={issueSummary.critical} note="Not archived" icon={CircleAlert} tone="rose" />
        <Metric label="Debugging time" value={`${overview?.debuggingHours ?? 0}h`} note={`${overview?.auditEvents || 0} audit events recorded`} icon={Clock3} tone="stone" />
      </div>
      <div className="admin-overview-grid">
        <section className="panel admin-summary-panel"><div className="admin-panel-heading"><div><h3>Access distribution</h3><p>Current account state and assigned roles</p></div><Users size={17} /></div>
          <div className="admin-distribution"><div><span>Developers & leads</span><strong>{Math.max(0, (userSummary.active || 0) - (userSummary.admins || 0))}</strong></div><div className="admin-meter"><i style={{ width: `${userSummary.active ? Math.max(0, ((userSummary.active - (userSummary.admins || 0)) / userSummary.active) * 100) : 0}%` }} /></div><div><span>Administrators</span><strong>{userSummary.admins || 0}</strong></div><div className="admin-meter"><i className="meter-admin" style={{ width: `${userSummary.active ? ((userSummary.admins || 0) / userSummary.active) * 100 : 0}%` }} /></div><div><span>Suspended</span><strong>{userSummary.suspended || 0}</strong></div><div className="admin-meter"><i className="meter-suspended" style={{ width: `${userSummary.total ? ((userSummary.suspended || 0) / userSummary.total) * 100 : 0}%` }} /></div></div>
        </section>
        <section className="panel admin-summary-panel"><div className="admin-panel-heading"><div><h3>Admin capabilities</h3><p>Actions available to this role</p></div><ShieldCheck size={17} /></div><div className="admin-capability-list"><span><Check size={14} /> Search and inspect all accounts</span><span><Check size={14} /> Change Developer, Lead and Admin roles</span><span><Check size={14} /> Suspend and restore account access</span><span><Check size={14} /> Permanently delete accounts</span><span><Check size={14} /> Update or remove any bug record</span><span><Check size={14} /> Review the audit trail</span></div></section>
      </div>
      <section className="panel admin-recent-panel"><div className="admin-panel-heading"><div><h3>Latest workspace activity</h3><p>Recent changes across the workspace</p></div><button className="admin-inline-link" onClick={() => setTab('audit')}>Open audit trail <ChevronRight size={14} /></button></div>
        {overview?.recentActivity?.length ? <div className="admin-recent-list">{overview.recentActivity.map((event) => <div className="admin-recent-row" key={event._id}><div className="admin-recent-icon"><Activity size={14} /></div><div><strong>{event.summary}</strong><span>{event.actorId?.name || event.actorName || 'System'}{event.bugId?.title ? ` · ${event.bugId.title}` : ''}</span></div><time>{timeAgo(event.createdAt)}</time></div>)}</div> : <Empty icon={Activity} title="No activity recorded" message="Workspace changes will appear here." />}
      </section>
    </div>}

    {tab === 'users' && <section className="panel admin-table-panel">
      <div className="admin-panel-heading admin-table-heading"><div><h3>Accounts and permissions</h3><p>Search users, assign roles, suspend access, or remove accounts.</p></div><span className="admin-count-chip">{usersPagination.total || 0} accounts</span></div>
      <div className="admin-filters"><label className="admin-search"><Search size={15} /><input value={userSearch} onChange={(event) => { setUserSearch(event.target.value); setUserPage(1); }} placeholder="Search name or email…" /></label><label><Filter size={13} /><select value={userRole} onChange={(event) => { setUserRole(event.target.value); setUserPage(1); }}><option value="">All roles</option><option>Developer</option><option>Lead</option><option>Admin</option></select></label><label><Filter size={13} /><select value={userState} onChange={(event) => { setUserState(event.target.value); setUserPage(1); }}><option value="">All account states</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label></div>
      {loading && !users.length ? <div className="admin-loading">Loading accounts…</div> : users.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Member</th><th>Role</th><th>Issues</th><th>Account state</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user._id}><td><div className="admin-user-cell"><UserAvatar user={user} /><div><strong>{user.name}</strong><span>{user.email}</span></div></div></td><td><select className="admin-role-select" value={user.role} onChange={(event) => runUserAction('role', { ...user, _nextRole: event.target.value })} disabled={String(user._id) === String(currentUser?._id)}><option>Developer</option><option>Lead</option><option>Admin</option></select></td><td>{user.bugCount}</td><td><span className={`admin-state-pill ${user.isSuspended ? 'suspended' : 'active'}`}><i />{user.isSuspended ? 'Suspended' : 'Active'}</span>{user.isSuspended && user.suspendedReason && <small className="admin-suspend-reason" title={user.suspendedReason}>{user.suspendedReason}</small>}</td><td>{shortDate(user.createdAt)}</td><td><div className="admin-row-actions">{String(user._id) === String(currentUser?._id) ? <span className="admin-self-label">You</span> : <><>{user.isSuspended ? <button title="Restore account" onClick={() => runUserAction('activate', user)}><CheckCircle2 size={15} /></button> : <button className="warning-action" title="Suspend account" onClick={() => runUserAction('suspend', user)}><Ban size={15} /></button>}</><button className="danger-action" title="Delete account" onClick={() => runUserAction('delete', user)}><Trash2 size={15} /></button></>}</div></td></tr>)}</tbody></table></div> : <Empty icon={UserRound} title="No matching accounts" message="Try another name, email, role, or account state." />}
      <div className="admin-pagination"><span>Page {usersPagination.page || 1} of {Math.max(usersPagination.pages || 1, 1)}</span><div><button disabled={(usersPagination.page || 1) <= 1} onClick={() => setUserPage((page) => Math.max(1, page - 1))}><ChevronLeft size={15} /> Previous</button><button disabled={(usersPagination.page || 1) >= (usersPagination.pages || 1)} onClick={() => setUserPage((page) => page + 1)}>Next <ChevronRight size={15} /></button></div></div>
    </section>}

    {tab === 'issues' && <section className="panel admin-table-panel"><div className="admin-panel-heading admin-table-heading"><div><h3>Global issue moderation</h3><p>Review every bug report and update its workflow or remove it.</p></div><span className="admin-count-chip">{issues.length} shown</span></div><label className="admin-search admin-issue-search"><Search size={15} /><input value={issueSearch} onChange={(event) => setIssueSearch(event.target.value)} placeholder="Search titles, descriptions, root causes, fixes…" /></label>
      {issues.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Issue</th><th>Owner</th><th>Severity</th><th>Workflow</th><th>Updated</th><th>Moderation</th></tr></thead><tbody>{issues.map((issue) => <tr key={issue._id}><td><div className="admin-issue-cell"><Link to={`/bugs/${issue._id}`} className="admin-issue-link">{issue.title}</Link><span>{(issue.techTags || []).slice(0, 3).join(' · ') || 'No tags'}</span></div></td><td>{issue.userId?.name || 'Unknown'}</td><td><span className={`severity-badge severity-${String(issue.severity || 'medium').toLowerCase()}`}>{issue.severity}</span></td><td><select className="admin-role-select" value={issue.status} onChange={(event) => updateIssueStatus(issue, event.target.value)}><option>Open</option><option>In Progress</option><option>Resolved</option><option>Archived</option></select></td><td>{timeAgo(issue.updatedAt)}</td><td><div className="admin-row-actions"><button className="danger-action" title="Delete issue" onClick={() => deleteIssue(issue)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <Empty icon={FileSearch} title="No issue records found" message="Try a different search query or create a new bug log." />}
      <div className="admin-table-footnote"><AlertTriangle size={13} /> Deleting an issue is permanent. Status changes are recorded in the audit trail.</div>
    </section>}

    {tab === 'audit' && <section className="panel admin-table-panel"><div className="admin-panel-heading admin-table-heading"><div><h3>Administrative and engineering audit trail</h3><p>Recorded role changes, access controls, issue updates, and collaboration events.</p></div><span className="admin-count-chip">Latest {audit.length}</span></div>
      {audit.length ? <div className="admin-audit-list">{audit.map((event) => <article className="admin-audit-row" key={event._id}><div className={`admin-audit-mark ${event.action?.startsWith('admin_') ? 'admin-event' : ''}`}><Activity size={15} /></div><div className="admin-audit-main"><strong>{event.summary}</strong><span>{event.actorId?.name || event.actorName || 'Unknown actor'}{event.targetUserName ? ` · Account: ${event.targetUserName}` : ''}{event.bugId?.title ? ` · Issue: ${event.bugId.title}` : ''}</span></div><div className="admin-audit-meta"><em>{String(event.action || '').replaceAll('_', ' ')}</em><time>{shortDate(event.createdAt)} · {timeAgo(event.createdAt)}</time></div></article>)}</div> : <Empty icon={ShieldCheck} title="No audit events yet" message="Administrative and engineering events will be stored here." />}
    </section>}
  </div>;
}
