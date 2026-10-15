const { AppError } = require('../utils/http');

module.exports = (req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found'));
