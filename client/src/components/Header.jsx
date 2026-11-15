import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Command, LogOut, Moon, Plus, Search, Settings, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { workspaceApi } from '../api/services.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { initials } from '../utils/format.js';

export default function Header({ onNewBug, onOpenCommand }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    let active = true;
    const refreshRequests = async () => {
      if (!user?._id) { setPendingRequests(0); return; }
      try {
        const { data } = await workspaceApi.requests();
        if (active) setPendingRequests(data.data.incoming?.length || 0);
      } catch {
        if (active) setPendingRequests(0);
      }
    };
    refreshRequests();
    window.addEventListener('fixlog:requests-changed', refreshRequests);
    return () => { active = false; window.removeEventListener('fixlog:requests-changed', refreshRequests); };
  }, [user?._id]);
  return (
    <header className="topbar">
      <button className="global-search" onClick={onOpenCommand}><Search size={16} /><span>Search anything…</span><kbd><Command size={11} /> K</kbd></button>
      <div className="topbar-actions"><div className="system-status"><i /><span>engineering mode</span></div><button className="mobile-new-button" onClick={onNewBug}><Plus size={16} /></button><button className="button-primary header-new-button" onClick={onNewBug}><Plus size={15} /> New bug</button><button className="icon-button topbar-icon" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button><button className="icon-button topbar-icon notification-button" title={pendingRequests ? `${pendingRequests} team request${pendingRequests === 1 ? '' : 's'}` : 'Team requests'} aria-label="Open team requests" onClick={() => navigate('/team?tab=requests')}><Bell size={17} />{pendingRequests > 0 && <span className="notification-count">{pendingRequests > 9 ? '9+' : pendingRequests}</span>}</button>
        <div className="profile-wrap"><button className="profile-trigger" onClick={() => setProfileOpen((value) => !value)}><div className="avatar avatar-small">{user?.avatar ? <img src={user.avatar} alt="" /> : initials(user?.name)}</div><span>{user?.name?.split(' ')[0] || 'Account'}</span><ChevronDown size={14} /></button>{profileOpen && <><button className="profile-dismiss" aria-label="Close profile menu" onClick={() => setProfileOpen(false)} /><div className="profile-menu"><div className="profile-menu-head"><strong>{user?.name}</strong><span>{user?.email}</span><em>{user?.role}</em></div><button onClick={() => { setProfileOpen(false); navigate('/profile'); }}><Settings size={15} /> Profile settings</button><button onClick={async () => { setProfileOpen(false); await logout(); }}><LogOut size={15} /> Sign out</button></div></>}</div>
      </div>
    </header>
  );
}
