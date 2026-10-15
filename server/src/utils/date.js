const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateString = (s) => {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const todayUTC = () => new Date().toISOString().slice(0, 10);
const toDateOnly = (s) => new Date(`${s}T00:00:00.000Z`);
const fromDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

module.exports = { isValidDateString, todayUTC, toDateOnly, fromDate };
