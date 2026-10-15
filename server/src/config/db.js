'use strict';
const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

/** Connect to MongoDB (idempotent). Uses arg, then MONGODB_URI, then local default. */
async function connectDB(uri) {
  const target = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/olympus';
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(target, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
