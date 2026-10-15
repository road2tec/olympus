import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const h = require('./helpers');

const BASE = '/api/v1';

describe('auth & authorization API', () => {
  beforeAll(h.setupDb);
  afterAll(h.teardownDb);

  it('health is public', async () => {
    const res = await h.api().get(`${BASE}/health`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.db).toBe('connected');
  });

  it('registers a valid athlete and returns safe user + token', async () => {
    const { res } = await h.registerAthlete({ email: 'valid@example.com', phone: '+91 98765 43210' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('athlete');
    expect(res.body.data.user.email).toBe('valid@example.com');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Passw0rdTest/);
    const stored = await User.findOne({ email: 'valid@example.com' }).select('+passwordHash');
    expect(stored.passwordHash).not.toBe('Passw0rdTest');
  });

  it('rejects duplicate email with 409 (case-insensitive)', async () => {
    await h.registerAthlete({ email: 'dup@example.com' });
    const { res } = await h.registerAthlete({ email: 'DUP@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects invalid registration input with VALIDATION_ERROR', async () => {
    for (const bad of [
      { password: 'short1' },
      { password: 'onlyletters' },
      { password: '12345678' },
      { email: 'not-an-email' },
      { name: 'A' },
    ]) {
      const { res } = await h.registerAthlete(bad);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
    }
  });

  it('register cannot create an admin (role rejected, nothing created)', async () => {
    const { res } = await h.registerAthlete({ email: 'evil@example.com', role: 'admin' });
    expect(res.status).toBe(400);
    expect(await User.findOne({ email: 'evil@example.com' })).toBeNull();
    const { res: res2 } = await h.registerAthlete({ email: 'evil2@example.com', isActive: false });
    expect(res2.status).toBe(400);
  });

  it('logs in with valid credentials', async () => {
    await h.registerAthlete({ email: 'login@example.com' });
    const res = await h.api().post(`${BASE}/auth/login`).send({ email: 'Login@Example.com', password: 'Passw0rdTest' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.expiresIn).toBeGreaterThan(0);
    expect(res.body.data.user.email).toBe('login@example.com');
  });

  it('rejects wrong password and unknown email with the same 401', async () => {
    await h.registerAthlete({ email: 'badpw@example.com' });
    const a = await h.api().post(`${BASE}/auth/login`).send({ email: 'badpw@example.com', password: 'WrongPass1' });
    const b = await h.api().post(`${BASE}/auth/login`).send({ email: 'nobody@example.com', password: 'WrongPass1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it('GET /auth/me returns user and null profile', async () => {
    const { token } = await h.registerAthlete({ email: 'me@example.com' });
    const res = await h.api().get(`${BASE}/auth/me`).set(h.authz(token));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@example.com');
    expect(res.body.data.profile).toBeNull();
  });

  it('rejects missing, malformed, tampered and expired JWTs', async () => {
    const { user } = await h.registerAthlete({ email: 'jwt@example.com' });
    expect((await h.api().get(`${BASE}/auth/me`)).status).toBe(401);
    expect((await h.api().get(`${BASE}/auth/me`).set(h.authz('garbage'))).status).toBe(401);
    const wrongSecret = jwt.sign({ sub: user.id, role: 'athlete' }, 'another-secret-another-secret-12345');
    expect((await h.api().get(`${BASE}/auth/me`).set(h.authz(wrongSecret))).status).toBe(401);
    const expired = h.signToken(user, { expiresIn: -10 });
    const res = await h.api().get(`${BASE}/auth/me`).set(h.authz(expired));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a token whose user no longer exists', async () => {
    const ghost = h.signToken({ _id: '507f1f77bcf86cd799439011', role: 'athlete' });
    expect((await h.api().get(`${BASE}/auth/me`).set(h.authz(ghost))).status).toBe(401);
  });

  it('athlete cannot access admin routes; admin can', async () => {
    const { token } = await h.registerAthlete({ email: 'ath-admin@example.com' });
    const denied = await h.api().get(`${BASE}/admin/users`).set(h.authz(token));
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');

    await h.createUser({ role: 'admin', email: 'root@example.com' });
    const adminToken = await h.login('root@example.com');
    const res = await h.api().get(`${BASE}/admin/users?limit=5`).set(h.authz(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(5);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  it('admin cannot use athlete-only resources', async () => {
    await h.createUser({ role: 'admin', email: 'root2@example.com' });
    const adminToken = await h.login('root2@example.com');
    expect((await h.api().get(`${BASE}/daily-entries`).set(h.authz(adminToken))).status).toBe(403);
    expect((await h.api().get(`${BASE}/twin/current`).set(h.authz(adminToken))).status).toBe(403);
  });

  it('admin can deactivate a user but not themself; inactive account is blocked', async () => {
    const { token, user } = await h.registerAthlete({ email: 'tobeoff@example.com' });
    const admin = await h.createUser({ role: 'admin', email: 'root3@example.com' });
    const adminToken = await h.login('root3@example.com');

    const self = await h.api().patch(`${BASE}/admin/users/${admin.id}/status`).set(h.authz(adminToken)).send({ isActive: false });
    expect(self.status).toBe(400);

    const off = await h.api().patch(`${BASE}/admin/users/${user.id}/status`).set(h.authz(adminToken)).send({ isActive: false });
    expect(off.status).toBe(200);
    expect(off.body.data.isActive).toBe(false);

    const old = await h.api().get(`${BASE}/auth/me`).set(h.authz(token));
    expect(old.status).toBe(401);
    expect(old.body.error.message).toBe('Account inactive');

    const relog = await h.api().post(`${BASE}/auth/login`).send({ email: 'tobeoff@example.com', password: 'Passw0rdTest' });
    expect(relog.status).toBe(401);

    const bad = await h.api().patch(`${BASE}/admin/users/${user.id}/status`).set(h.authz(adminToken)).send({ isActive: 'no' });
    expect(bad.status).toBe(400);
  });

  it('unknown routes return a JSON 404', async () => {
    const res = await h.api().get(`${BASE}/nope`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sets security headers', async () => {
    const res = await h.api().get(`${BASE}/health`);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
