import api, { unwrap } from './api';

export const createEntry = async (body) => unwrap(await api.post('/daily-entries', body));
export const updateEntry = async (id, body) => unwrap(await api.patch(`/daily-entries/${id}`, body));
export const getEntry = async (id) => unwrap(await api.get(`/daily-entries/${id}`));
export async function listEntries(params) {
  const res = await api.get('/daily-entries', { params });
  return { data: res.data.data, meta: res.data.meta };
}
