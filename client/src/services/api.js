import axios from 'axios';

export const TOKEN_KEY = 'olympus_token';

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (err.response?.status === 401 && !isAuthCall) {
      setToken(null);
      if (!['/login', '/register', '/'].includes(window.location.pathname)) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

/** Normalised error: { status, code, message, details } */
export function parseError(err) {
  const e = err?.response?.data?.error;
  if (e) return { status: err.response.status, code: e.code, message: e.message, details: e.details || [] };
  if (err?.code === 'ERR_NETWORK' || !err?.response) {
    return { status: 0, code: 'NETWORK', message: 'Cannot reach the server. Check your connection and try again.', details: [] };
  }
  return { status: err.response.status, code: 'INTERNAL', message: 'Something went wrong. Please try again.', details: [] };
}

/** Unwrap { success, data, meta } */
export const unwrap = (res) => res.data.data;
export const unwrapWithMeta = (res) => ({ data: res.data.data, meta: res.data.meta });

export default api;
