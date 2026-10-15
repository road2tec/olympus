import api, { unwrap } from './api';

/** Returns profile or null when PROFILE_NOT_FOUND */
export async function getProfile() {
  try {
    return unwrap(await api.get('/athlete/profile'));
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}
export const createProfile = async (body) => unwrap(await api.post('/athlete/profile', body));
export const updateProfile = async (body) => unwrap(await api.patch('/athlete/profile', body));

export const getCoachAthletes = async () => unwrap(await api.get('/coach/athletes'));

export const listUsers = async (params) => {
  const res = await api.get('/admin/users', { params });
  return { data: res.data.data, meta: res.data.meta };
};
export const setUserStatus = async (id, isActive) =>
  unwrap(await api.patch(`/admin/users/${id}/status`, { isActive }));
