class AppError extends Error {
  constructor(status, code, message, details, subcode) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.subcode = subcode;
  }
}

const ok = (res, data, meta, status = 200) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const parsePagination = (query, defaultLimit = 20) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const pageMeta = (page, limit, total) => ({ page, limit, total, totalPages: Math.ceil(total / limit) });

module.exports = { AppError, ok, asyncHandler, parsePagination, pageMeta };
