import api, { unwrap } from './api';

export const getLatestInsight = async () => unwrap(await api.get('/insights/latest'));
export async function listInsights(params) {
  const res = await api.get('/insights', { params });
  return { data: res.data.data, meta: res.data.meta };
}
