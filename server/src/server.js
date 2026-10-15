const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');

(async () => {
  try {
    await connectDB(env.mongoUri);
    console.log('MongoDB connected');
    const server = app.listen(env.port, () => console.log(`Olympus API listening on :${env.port} (${env.nodeEnv})`));
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
