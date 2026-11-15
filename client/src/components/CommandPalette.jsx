import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, BarChart3, BookOpenText, Bug, Command, LayoutDashboard, Plus, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bugApi } from '../api/services.js';
import { timeAgo } from '../utils/format.js';
import Modal from './Modal.jsx';

const actions = [
  { label: 'Go to overview', hint: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Open bug journal', hint: 'All issues and filters', icon: BookOpenText, path: '/bugs' },
  { label: 'Open analytics', hint: 'Performance and trends', icon: BarChart3, path: '/analytics' },
  { label: 'Open team feed', hint: 'Recent activity', icon: Activity, path: '/team' },
  { label: 'Open team directory', hint: 'Workspace members', icon: Users, path: '/team?tab=members' },
];

export default function CommandPalette({ open, onClose, onNewBug }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [bugs, setBugs] = useState([]);
  const inputRef = useRef(null);
  useEffect(() => { if (open) { setQuery(''); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);
  useEffect(() => {
    if (!open || query.trim().length < 2) { setBugs([]); return undefined; }
    let alive = true;
    const timer = setTimeout(() => bugApi.list({ search: query.trim(), limit: 5 }).then(({ data }) => { if (alive) setBugs(data.data.items); }).catch(() => { if (alive) setBugs([]); }), 180);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, open]);
  const filtered = useMemo(() => actions.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const go = (path) => { navigate(path); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Command palette" subtitle="Jump to a place or find an engineering issue." width="max-w-xl">
      <div className="command-modal-content"><div className="command-input-wrap"><Search size={18} /><input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages, bugs, technologies…" /><kbd>ESC</kbd></div>
        <div className="command-results">{!query && <div className="command-group-label">QUICK NAVIGATION</div>}{filtered.map((item) => <button className="command-result" key={item.path} onClick={() => go(item.path)}><span className="command-result-icon"><item.icon size={16} /></span><span><strong>{item.label}</strong><small>{item.hint}</small></span><ArrowRight size={14} className="command-arrow" /></button>)}
          {query.trim().length >= 2 && <><div className="command-group-label">BUG LOGS</div>{bugs.map((bug) => <button className="command-result" key={bug._id} onClick={() => go(`/bugs/${bug._id}`)}><span className="command-result-icon bug-icon"><Bug size={16} /></span><span><strong>{bug.title}</strong><small>{bug.status} · {bug.severity} · updated {timeAgo(bug.updatedAt)}</small></span><ArrowRight size={14} className="command-arrow" /></button>)}{!bugs.length && <p className="command-empty">No matching bug logs found.</p>}</>}
          <button className="command-create" onClick={() => { onClose(); onNewBug(); }}><Plus size={15} /> Create a new bug log</button>
        </div><div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to select</span><span><kbd>⌘K</kbd> to toggle</span></div>
      </div>
    </Modal>
  );
}
