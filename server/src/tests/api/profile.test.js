import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const h = require('./helpers');

const BASE = '/api/v1';

describe('athlete profile API', () => {
  let token;
  beforeAll(async () => {
    await h.setupDb();
    ({ token } = await h.registerAthlete({ email: 'prof@example.com' }));
  });
  afterAll(h.teardownDb);

  it('returns 404 PROFILE_NOT_FOUND before creation', async () => {
    const res = await h.api().get(`${BASE}/athlete/profile`).set(h.authz(token));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.subcode).toBe('PROFILE_NOT_FOUND');
  });

  it('requires auth', async () => {
    expect((await h.api().get(`${BASE}/athlete/profile`)).status).toBe(401);
  });

  it('validates on create', async () => {
    const res = await h.api().post(`${BASE}/athlete/profile`).set(h.authz(token)).send({ sport: '' });
    expect(res.status).toBe(400);
  });

  it('creates, reads, updates; second create conflicts; coachId is not writable', async () => {
    const created = await h
      .api()
      .post(`${BASE}/athlete/profile`)
      .set(h.authz(token))
      .send({ sport: 'Sprinting', category: '100m', goal: 'Sub 11s', dateOfBirth: '2000-05-17' });
    expect(created.status).toBe(201);
    expect(created.body.data.sport).toBe('Sprinting');
    expect(created.body.data.coach).toBeNull();
    expect(created.body.data.dateOfBirth).toBe('2000-05-17');

    const again = await h.api().post(`${BASE}/athlete/profile`).set(h.authz(token)).send({ sport: 'X', category: 'Y' });
    expect(again.status).toBe(409);

    const get = await h.api().get(`${BASE}/athlete/profile`).set(h.authz(token));
    expect(get.status).toBe(200);
    expect(get.body.data.category).toBe('100m');

    const patch = await h.api().patch(`${BASE}/athlete/profile`).set(h.authz(token)).send({ goal: 'Nationals', personalBest: '11.2s' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.goal).toBe('Nationals');
    expect(patch.body.data.sport).toBe('Sprinting');

    const mass = await h.api().patch(`${BASE}/athlete/profile`).set(h.authz(token)).send({ coachId: '507f1f77bcf86cd799439011' });
    expect(mass.status).toBe(400);
    const mass2 = await h.api().patch(`${BASE}/athlete/profile`).set(h.authz(token)).send({ userId: '507f1f77bcf86cd799439011' });
    expect(mass2.status).toBe(400);
    const empty = await h.api().patch(`${BASE}/athlete/profile`).set(h.authz(token)).send({});
    expect(empty.status).toBe(400);
  });

  it('profiles are per-user', async () => {
    const other = await h.registerAthlete({ email: 'prof2@example.com' });
    const res = await h.api().get(`${BASE}/athlete/profile`).set(h.authz(other.token));
    expect(res.status).toBe(404);
  });
});
