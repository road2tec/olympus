import api, { unwrap, setToken } from './api';

export async function login(email, password) {
  const data = unwrap(await api.post('/auth/login', { email, password }));
  setToken(data.token);
  return data;
}
export async function register(payload) {
  const data = unwrap(await api.post('/auth/register', payload));
  setToken(data.token);
  return data;
}
export async function me() {
  return unwrap(await api.get('/auth/me'));
}
export function logout() {
  setToken(null);
}
