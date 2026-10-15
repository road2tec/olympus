const { AppError } = require('../utils/http');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  let status = 500;
  let code = 'INTERNAL';
  let message = 'Internal server error';
  let details;
  let subcode;

  if (err instanceof AppError) {
    ({ status, code, message, details, subcode } = err);
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Malformed JSON body';
  } else if (err && err.type === 'entity.too.large') {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Request body too large';
  } else if (err && err.name === 'CastError') {
    status = 404; code = 'NOT_FOUND'; message = 'Resource not found';
  } else if (err && err.name === 'ValidationError' && err.errors) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err && err.code === 11000) {
    status = 409; code = 'CONFLICT'; message = 'Resource already exists';
  }

  if (status >= 500 && env.nodeEnv !== 'test') {
    console.error('[error]', err && err.name, err && err.message);
  }

  const error = { code, message };
  if (subcode) error.subcode = subcode;
  if (details) error.details = details;
  res.status(status).json({ success: false, error });
};
