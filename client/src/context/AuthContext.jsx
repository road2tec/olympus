import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { getToken, setToken } from '../services/api';

const AuthContext = createContext(null);

export const homeForRole = (role) =>
  role === 'admin' ? '/admin' : role === 'coach' ? '/coach' : '/app/dashboard';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    let alive = true;
    if (!getToken()) return undefined;
    authService
      .me()
      .then((d) => { if (alive) { setUser(d.user); setProfile(d.profile || null); } })
      .catch(() => { setToken(null); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await authService.login(email, password);
    setUser(d.user);
    setProfile(null);
    return d.user;
  }, []);

  const register = useCallback(async (payload) => {
    const d = await authService.register(payload);
    setUser(d.user);
    setProfile(null);
    return d.user;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, setProfile, loading, login, register, logout, isAuthenticated: !!user }),
    [user, profile, loading, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
