import { Activity, BarChart3, BookOpenText, Bug, ChevronLeft, ChevronRight, Command, LayoutDashboard, KanbanSquare, Plus, Users, ShieldCheck, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const primary = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/bugs', label: 'Issue journal', icon: BookOpenText },
  { to: '/board', label: 'Flow board', icon: KanbanSquare },
  { to: '/analytics', label: 'Telemetry', icon: BarChart3 },
  { to: '/team', label: 'Collaborators', icon: Activity },
];

export default function Sidebar({ collapsed, setCollapsed, onNewBug }) {
  const { user } = useAuth();
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Bug size={18} strokeWidth={2.4} /></div>{!collapsed && <div className="brand-word">fixlog<span>.</span><small>DEBUGGING WORKBENCH</small></div>}<button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button></div>
      <div className="workspace-switch"><div className="workspace-avatar">F</div>{!collapsed && <><div className="workspace-text"><strong>Engineering console</strong><span>Private workbench</span></div><ChevronRight size={14} className="ml-auto opacity-50" /></>}</div>
      <button className={`new-bug-sidebar ${collapsed ? 'justify-center' : ''}`} onClick={onNewBug}><Plus size={16} />{!collapsed && <><span>New bug log</span><kbd>N</kbd></>}</button>
      {!collapsed && <div className="sidebar-section-label">WORKBENCH</div>}
      <nav className="sidebar-nav">
        {primary.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}
        {user?.role === 'Admin' && <div className="sidebar-admin-group">{!collapsed && <div className="sidebar-section-label">CONTROL PLANE</div>}<NavLink to="/admin" title={collapsed ? 'Admin control' : undefined} className={({ isActive }) => `sidebar-link admin-sidebar-link ${isActive ? 'active' : ''}`}><ShieldCheck size={17} /><span>Admin console</span></NavLink></div>}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-bottom">
        <NavLink to="/profile" title={collapsed ? 'My profile' : undefined} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><UserRound size={17} /><span>My profile</span></NavLink>
        <button className="sidebar-link" title={collapsed ? 'Command menu' : undefined} onClick={() => window.dispatchEvent(new CustomEvent('fixlog:command'))}><Command size={17} /><span>Command menu</span><kbd>⌘K</kbd></button>
        <div className="sidebar-footer"><div className="footer-orb"><Users size={15} /></div>{!collapsed && <div><strong>TRACE · FIX · LEARN</strong><span>Engineering knowledge base</span></div>}</div>
      </div>
    </aside>
  );
}
