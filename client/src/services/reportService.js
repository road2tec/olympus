import api from './api';

/** POST /reports/generate -> { report, created } (201 = new, 200 = regenerated) */
export const generateReport = async (weekStart) => {
  const res = await api.post('/reports/generate', weekStart ? { weekStart } : {});
  return { report: res.data.data, created: res.status === 201 };
};

/** GET /reports -> { data: Report[], meta } */
export const listReports = async (params) => {
  const res = await api.get('/reports', { params });
  return { data: res.data.data, meta: res.data.meta };
};

export const getReport = async (id) => (await api.get(`/reports/${id}`)).data.data;

/** Fetches the PDF as a blob (Authorization header applied by the axios instance) and triggers a browser download. */
export const downloadReportPdf = async (id, fallbackName = 'olympus-report.pdf') => {
  const res = await api.get(`/reports/${id}/pdf`, { responseType: 'blob', timeout: 60000 });
  const disposition = res.headers?.['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match ? match[1] : fallbackName;
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 2000);
  return filename;
};
