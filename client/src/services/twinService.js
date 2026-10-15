import api, { unwrap } from './api';

export const getCurrentTwin = async () => unwrap(await api.get('/twin/current'));
export const getTwinHistory = async (params) => unwrap(await api.get('/twin/history', { params }));
