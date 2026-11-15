import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/services.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    authApi.me().then(({ data }) => { if (alive) setUser(data.data.user); }).catch(() => { if (alive) setUser(null); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const value = useMemo(() => ({
    user, loading,
    async login(payload) { const { data } = await authApi.login(payload); setUser(data.data.user); return data.data.user; },
    async register(payload) { const { data } = await authApi.register(payload); setUser(data.data.user); return data.data.user; },
    async logout() { try { await authApi.logout(); } finally { setUser(null); } },
    async refreshUser() { const { data } = await authApi.me(); setUser(data.data.user); return data.data.user; },
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
