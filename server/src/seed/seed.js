'use strict';
/**
 * OLYMPUS demo seed (development only). Repeatable: every write is an upsert.
 *
 *   node src/seed/seed.js
 *
 * Creates 3 demo accounts, Arjun Rao's athlete profile (coach Meera Iyer assigned) and
 * 42 days of fictional entries ending yesterday (UTC), then recomputes the digital twin
 * and generates the last 3 full Mon-Sun weekly reports (services are required lazily;
 * if they are absent a warning is printed and the rest of the seed still completes).
 *
 * Phases (day 0 = oldest, day 41 = yesterday):
 *   days  0-20  stable baseline             (load ~360, recovery ~87)
 *   days 21-27  load up, recovery stable    (load ~490, recovery ~87)
 *   days 28-34  load higher, recovery easing (load ~525, recovery ~84)
 *   days 35-41  load high, recovery declining (load ~720, recovery ~64)
 * Latest 7-day window vs previous 7-day window: load ~ +37 %, recovery ~ -24 %, which is far
 * beyond the Needs Attention thresholds (+10 % / -5 %).
 */
const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (_) { /* dotenv optional */ }

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { User, AthleteProfile, DailyEntry } = require('../models');

const DAYS = 42;
const DAY_MS = 86400000;
const SEED_VERSION_SALT = 20260101;

const DEMO_USERS = [
  { key: 'athlete', name: 'Arjun Rao', email: 'athlete@olympus.demo', password: 'Athlete@123', role: 'athlete', phone: '+91 90000 00001' },
  { key: 'coach', name: 'Meera Iyer', email: 'coach@olympus.demo', password: 'Coach@12345', role: 'coach', phone: '+91 90000 00002' },
  { key: 'admin', name: 'Olympus Admin', email: 'admin@olympus.demo', password: 'Admin@12345', role: 'admin', phone: '+91 90000 00003' },
];

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ymd = (d) => d.toISOString().slice(0, 10);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;

function phaseFor(i) {
  if (i < 21) return { name: 'stable', dur: 60, int: 6, sleep: 8.0, feel: 4, perf: 74 };
  if (i < 28) return { name: 'load-up', dur: 70, int: 7, sleep: 8.0, feel: 4, perf: 76 };
  if (i < 35) return { name: 'load-high', dur: 75, int: 7, sleep: 7.5, feel: 4, perf: 76 };
  return { name: 'load-up-recovery-down', dur: 90, int: 8, sleep: 6.3, feel: 3, perf: 68 };
}

const TYPE_CYCLE = ['speed', 'strength', 'endurance', 'skill', 'speed', 'match', 'recovery'];
const DIET = [
  'Rice, dal, chicken, fruit; hydrated well.',
  'Oats and banana pre-session; paneer wrap after.',
  'Light breakfast, balanced lunch, early dinner.',
  'Protein shake after training; vegetables at dinner.',
  '',
];

/** Build the entry fields for day index i (0..41) at the given UTC date. */
function buildEntry(i, date) {
  const rand = mulberry32(SEED_VERSION_SALT + i * 7919);
  const p = phaseFor(i);
  const jitter = (range) => (rand() * 2 - 1) * range;
  const recoveryDay = TYPE_CYCLE[i % TYPE_CYCLE.length] === 'recovery';
  const type = TYPE_CYCLE[i % TYPE_CYCLE.length];

  let duration = Math.round(p.dur + jitter(5));
  let intensity = Math.round(p.int + jitter(0.4)); // +-0 mostly, occasionally +-1 not applied -> stays in phase band
  if (recoveryDay) { // lighter session label, but keep numbers inside phase band so windows stay clean
    duration = Math.round(p.dur * 0.9 + jitter(3));
  }
  const sleep = round1(clamp(p.sleep + jitter(0.3), 0, 24));
  const feelRaw = p.feel + (rand() < 0.15 ? (rand() < 0.5 ? -1 : 1) * (p.name === 'stable' ? 1 : 0) : 0);
  return {
    date,
    trainingType: type,
    durationMinutes: clamp(duration, 1, 600),
    intensity: clamp(intensity, 1, 10),
    performanceScore: Math.round(clamp(p.perf + jitter(2.5), 0, 100)),
    feelingScore: clamp(feelRaw, 1, 5),
    sleepHours: sleep,
    dietNotes: DIET[Math.floor(rand() * DIET.length)],
    mealCount: 3 + (rand() < 0.4 ? 1 : 0),
  };
}

/** Rest days: in the first 4 weeks every 7th day is skipped (absent). Last 2 weeks are complete. */
const isRestDay = (i) => i < 28 && i % 7 === 6;

function mondayOf(dateUTC) {
  const dow = (dateUTC.getUTCDay() + 6) % 7; // Mon=0
  return new Date(dateUTC.getTime() - dow * DAY_MS);
}

async function upsertUser(def) {
  const email = def.email.toLowerCase();
  let user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    const passwordHash = await User.hashPassword(def.password);
    user = await User.create({ name: def.name, email, phone: def.phone, role: def.role, isActive: true, passwordHash });
    return { user, created: true };
  }
  user.name = def.name;
  user.phone = def.phone;
  user.role = def.role;
  user.isActive = true;
  if (!(await user.comparePassword(def.password))) user.passwordHash = await User.hashPassword(def.password);
  await user.save();
  return { user, created: false };
}

function lazyRequire(modPath) {
  try {
    return require(modPath);
  } catch (err) {
    if (err && err.code === 'MODULE_NOT_FOUND' && String(err.message).includes(path.basename(modPath))) return null;
    throw err;
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed: NODE_ENV=production. The seed creates demo accounts with known passwords.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/olympus';
  await connectDB(uri);
  console.log(`[seed] connected to ${mongoose.connection.name}`);

  // 1. Users
  const users = {};
  for (const def of DEMO_USERS) {
    const { user, created } = await upsertUser(def);
    users[def.key] = user;
    console.log(`[seed] user ${def.email} ${created ? 'created' : 'updated'}`);
  }

  // 2. Profile
  await AthleteProfile.findOneAndUpdate(
    { userId: users.athlete._id },
    {
      $set: {
        sport: 'Athletics (Sprints)',
        category: '100m / 200m',
        personalBest: '100m: 10.62 s, 200m: 21.48 s',
        goal: 'Run a sub-10.60 s 100m at the state championships',
        dateOfBirth: new Date(Date.UTC(2002, 4, 14)),
        coachId: users.coach._id,
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
  );
  console.log('[seed] athlete profile upserted (coach Meera Iyer assigned)');

  // 3. Entries: 42 days ending yesterday (UTC)
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterday = new Date(todayUTC.getTime() - DAY_MS);
  const firstDay = new Date(yesterday.getTime() - (DAYS - 1) * DAY_MS);

  // Demo athlete entries outside the window are stale from earlier runs; remove for a coherent story.
  const stale = await DailyEntry.deleteMany({ athleteId: users.athlete._id, $or: [{ date: { $lt: firstDay } }, { date: { $gt: yesterday } }] });
  if (stale.deletedCount) console.log(`[seed] removed ${stale.deletedCount} out-of-window demo entries`);

  let written = 0;
  for (let i = 0; i < DAYS; i++) {
    if (isRestDay(i)) {
      await DailyEntry.deleteOne({ athleteId: users.athlete._id, date: new Date(firstDay.getTime() + i * DAY_MS) });
      continue;
    }
    const date = new Date(firstDay.getTime() + i * DAY_MS);
    const fields = buildEntry(i, date);
    await new DailyEntry({ athleteId: users.athlete._id, ...fields }).validate(); // enforce model rules
    await DailyEntry.findOneAndUpdate(
      { athleteId: users.athlete._id, date },
      { $set: fields, $setOnInsert: { athleteId: users.athlete._id } },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    written++;
  }
  console.log(`[seed] ${written} daily entries upserted (${ymd(firstDay)} .. ${ymd(yesterday)})`);

  // 4. Digital twin (service written by another module; lazy)
  let twinOk = false;
  try {
    const twinService = lazyRequire('../services/twinService');
    if (!twinService || typeof twinService.recomputeTwin !== 'function') {
      console.warn('[seed] WARNING: services/twinService.js (recomputeTwin) not available - twin/insights NOT computed.');
    } else {
      const res = await twinService.recomputeTwin(users.athlete._id);
      twinOk = true;
      const status = res && res.attention && res.attention.status;
      console.log(`[seed] twin recomputed (attention status: ${status || 'n/a'})`);
    }
  } catch (err) {
    console.warn(`[seed] WARNING: recomputeTwin failed: ${err.message}`);
  }

  // 5. Weekly reports: last 3 full Mon-Sun weeks
  try {
    const reportService = lazyRequire('../services/reportService');
    if (!reportService || typeof reportService.generateWeeklyReport !== 'function') {
      console.warn('[seed] WARNING: services/reportService.js (generateWeeklyReport) not available - weekly reports NOT generated.');
    } else {
      // Most recent Monday whose Sunday <= yesterday.
      let monday = mondayOf(yesterday);
      if (monday.getTime() + 6 * DAY_MS > yesterday.getTime()) monday = new Date(monday.getTime() - 7 * DAY_MS);
      let made = 0;
      for (let w = 0; w < 3; w++) {
        const weekStart = ymd(new Date(monday.getTime() - w * 7 * DAY_MS));
        try {
          await reportService.generateWeeklyReport(users.athlete._id, weekStart);
          made++;
        } catch (err) {
          console.warn(`[seed] WARNING: report for week ${weekStart} failed: ${err.message}`);
        }
      }
      console.log(`[seed] ${made}/3 weekly reports generated${twinOk ? '' : ' (twin was not computed)'}`);
    }
  } catch (err) {
    console.warn(`[seed] WARNING: report generation failed: ${err.message}`);
  }

  // 6. Credentials (dev only)
  console.log('\n=== OLYMPUS demo credentials (development only) ===');
  for (const d of DEMO_USERS) console.log(`  ${d.role.padEnd(8)} ${d.email}  /  ${d.password}`);
  console.log('===================================================\n');
}

main()
  .then(() => disconnectDB())
  .catch(async (err) => {
    console.error('[seed] FAILED:', err);
    try { await disconnectDB(); } catch (_) { /* ignore */ }
    process.exit(1);
  });
