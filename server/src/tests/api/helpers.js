const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { connectDB } = require('../../config/db');
const app = require('../../app');
const User = require('../../models/User');

const TEST_URI = 'mongodb://127.0.0.1:27017/olympus_test';

async function setupDb() {
  await connectDB(TEST_URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init().catch(() => {})));
}

async function teardownDb() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

const api = () => request(app);

async function registerAthlete(overrides = {}) {
  const body = {
    name: 'Test Athlete',
    email: `a${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`,
    password: 'Passw0rdTest',
    ...overrides,
  };
  const res = await api().post('/api/v1/auth/register').send(body);
  return { res, body, token: res.body.data && res.body.data.token, user: res.body.data && res.body.data.user };
}

async function createUser({ role = 'athlete', email, password = 'Passw0rdTest', isActive = true, name = 'Seeded User' }) {
  const passwordHash = await User.hashPassword(password);
  return User.create({ name, email, passwordHash, role, isActive });
}

async function login(email, password = 'Passw0rdTest') {
  const res = await api().post('/api/v1/auth/login').send({ email, password });
  return res.body.data && res.body.data.token;
}

const signToken = (user, opts = {}) =>
  jwt.sign({ sub: String(user._id || user.id), role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h', ...opts });

const authz = (token) => ({ Authorization: `Bearer ${token}` });

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const validEntry = (overrides = {}) => ({
  date: daysAgo(1),
  trainingType: 'strength',
  durationMinutes: 60,
  intensity: 7,
  performanceScore: 75,
  feelingScore: 4,
  sleepHours: 7.5,
  dietNotes: 'Balanced',
  mealCount: 3,
  ...overrides,
});

module.exports = { setupDb, teardownDb, api, registerAthlete, createUser, login, signToken, authz, daysAgo, validEntry };
