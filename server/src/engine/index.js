'use strict';
/** Re-exports the whole Olympus engine (pure functions, no DB / Express). */
const constants = require('./constants');

module.exports = {
  constants,
  ...constants,
  ...require('./metrics'),
  ...require('./ema'),
  ...require('./trends'),
  ...require('./attention'),
  ...require('./insights'),
  ...require('./compute'),
  ...require('./weekly'),
};
