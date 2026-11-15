import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import BugModal from '../components/BugModal.jsx';
import CommandPalette from '../components/CommandPalette.jsx';
import { bugApi } from '../api/services.js';
import { errorMessage } from '../utils/format.js';
import toast from 'react-hot-toast';

const titles = {
  '/profile': ['Developer profile', 'Your engineering identity, technical footprint, and account controls.'],
  '/': ['Engineering overview', 'A live readout of the issues your team is investigating and resolving.'],
  '/bugs': ['Issue journal', 'Search, triage, and preserve the context behind every failure.'],
  '/board': ['Flow board', 'Move investigations from first signal to verified resolution.'],
  '/analytics': ['System telemetry', 'Spot recurring failure patterns, stack hotspots, and resolution trends.'],
  '/team': ['Collaborator network', 'Build a trusted debugging circle through accepted connections.'],
  '/admin': ['Control plane', 'Govern accounts, permissions, issue records, and system activity.'],
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [newBugOpen, setNewBugOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onCommand = () => setCommandOpen((value) => !value);
    const onProfile = () => navigate('/profile');
    const onKey = (event) => {
      const target = event.target;
      const editing = target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen((value) => !value); return; }
      if (!editing && event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); setNewBugOpen(true); }
      if (!editing && event.key === '/') { event.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener('fixlog:command', onCommand);
    window.addEventListener('fixlog:profile', onProfile);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('fixlog:command', onCommand);
      window.removeEventListener('fixlog:profile', onProfile);
      window.removeEventListener('keydown', onKey);
    };
  }, [navigate]);

  const page = titles[location.pathname] || (location.pathname.startsWith('/bugs/') ? ['Bug detail', 'Investigation notes, root cause, and the resolution.'] : ['Workspace', 'Your engineering knowledge base.']);
  async function createBug(payload) {
    try {
      await bugApi.create(payload);
      toast.success('Bug log created');
      window.dispatchEvent(new Event('fixlog:data-changed'));
      navigate('/bugs');
    } catch (error) { toast.error(errorMessage(error)); throw error; }
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-is-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} onNewBug={() => setNewBugOpen(true)} />
      <div className="app-main">
        <Header onNewBug={() => setNewBugOpen(true)} onOpenCommand={() => setCommandOpen(true)} />
        <main className="page-main">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> FIXLOG / ENGINEERING CONSOLE</div><h1>{page[0]}</h1><p>{page[1]}</p></div>
            {!['/bugs', '/board', '/profile', '/team'].includes(location.pathname) && <button onClick={() => setNewBugOpen(true)} className="button-primary heading-new"><span>+</span> New bug log</button>}
          </div>
          <Outlet context={{ openNewBug: () => setNewBugOpen(true) }} />
        </main>
        <footer className="app-footer"><span>FixLog <b>·</b> Trace the failure. Preserve the fix.</span><span>ISSUE INTELLIGENCE · TEAM KNOWLEDGE</span></footer>
      </div>
      <BugModal open={newBugOpen} onClose={() => setNewBugOpen(false)} onSave={createBug} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNewBug={() => setNewBugOpen(true)} />
    </div>
  );
}
