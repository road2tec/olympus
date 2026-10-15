import { describe, it, expect } from 'vitest';
const svc = require('../../services/twinService');

describe('twinService per-athlete mutex', () => {
  it('serialises calls for the same athlete', async () => {
    const log = [];
    const task = (name, ms) => () =>
      new Promise((resolve) => {
        log.push(`start ${name}`);
        setTimeout(() => {
          log.push(`end ${name}`);
          resolve(name);
        }, ms);
      });
    const res = await Promise.all([
      svc._withAthleteLock('a1', task('A', 30)),
      svc._withAthleteLock('a1', task('B', 5)),
      svc._withAthleteLock('a1', task('C', 1)),
    ]);
    expect(res).toEqual(['A', 'B', 'C']);
    expect(log).toEqual(['start A', 'end A', 'start B', 'end B', 'start C', 'end C']);
  });
  it('does not block different athletes', async () => {
    const log = [];
    const task = (name, ms) => () => new Promise((r) => setTimeout(() => { log.push(name); r(); }, ms));
    await Promise.all([svc._withAthleteLock('x', task('slow', 30)), svc._withAthleteLock('y', task('fast', 1))]);
    expect(log).toEqual(['fast', 'slow']);
  });
  it('a failing run rejects its caller but does not poison the chain', async () => {
    const bad = svc._withAthleteLock('z', () => Promise.reject(new Error('boom')));
    const good = svc._withAthleteLock('z', () => Promise.resolve('ok'));
    await expect(bad).rejects.toThrow('boom');
    await expect(good).resolves.toBe('ok');
  });
  it('recomputeTwin rejects without an athleteId', async () => {
    await expect(svc.recomputeTwin()).rejects.toThrow();
  });
  it('exports the contract functions', () => {
    for (const f of ['recomputeTwin', 'getCurrentTwin', 'getTwinHistory']) expect(typeof svc[f]).toBe('function');
  });
});
