const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;
if (nodeEnv !== 'test' && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

module.exports = Object.freeze({
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/olympus',
  jwtSecret: jwtSecret || 'test-secret-test-secret-test-secret-123',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  nodeEnv,
  timezone: process.env.APP_TIMEZONE || 'UTC',
  emaAlpha: parseFloat(process.env.EMA_ALPHA || '0.30'),
});
