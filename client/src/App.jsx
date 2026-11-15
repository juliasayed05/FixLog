import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Journal from './pages/Journal.jsx';
import Analytics from './pages/Analytics.jsx';
import Team from './pages/Team.jsx';
import BugDetail from './pages/BugDetail.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Admin from './pages/Admin.jsx';
import Profile from './pages/Profile.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading"><div className="brand-mark"><span>F</span></div><p>Loading your workspace…</p></div>;
  return user ? children : <Navigate to="/auth" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading"><div className="brand-mark"><span>F</span></div><p>Loading permissions…</p></div>;
  return user?.role === 'Admin' ? children : <Navigate to="/" replace />;
}

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading"><div className="brand-mark"><span>F</span></div><p>Loading FixLog…</p></div>;
  return user ? <Navigate to="/" replace /> : <AuthPage />;
}

export default function App() {
  return <Routes><Route path="/auth" element={<PublicRoute />} /><Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}><Route index element={<Dashboard />} /><Route path="bugs" element={<Journal initialView="table" />} /><Route path="board" element={<Journal initialView="board" />} /><Route path="bugs/:id" element={<BugDetail />} /><Route path="analytics" element={<Analytics />} /><Route path="team" element={<Team />} /><Route path="profile" element={<Profile />} /><Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
