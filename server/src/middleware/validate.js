const { AppError } = require('../utils/http');

const formatIssues = (error) =>
  error.issues.map((i) => ({
    field: i.path.join('.') || (i.keys ? i.keys.join(',') : ''),
    message: i.message,
  }));

// validate(schema, 'body'|'query'|'params'). Parsed query goes to req.validatedQuery (Express 5 req.query is read-only).
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] === undefined ? {} : req[source]);
  if (!result.success) {
    return next(new AppError(400, 'VALIDATION_ERROR', 'Validation failed', formatIssues(result.error)));
  }
  if (source === 'query') req.validatedQuery = result.data;
  else req[source] = result.data;
  next();
};

module.exports = { validate, formatIssues };
