const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const authLimiter =
  env.nodeEnv === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) =>
          res.status(429).json({
            success: false,
            error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
          }),
      });

module.exports = { authLimiter };
