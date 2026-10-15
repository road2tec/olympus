const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
