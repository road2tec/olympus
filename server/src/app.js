const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  })
);
if (env.nodeEnv !== 'test') {
  // Request line only: no bodies or Authorization headers are ever logged.
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}
app.use(express.json({ limit: '50kb' }));

app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
