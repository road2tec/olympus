const { fromDate } = require('./date');

const plain = (d) => d;
const idOf = (o) => String(o._id ?? o.id);

const entryToJSON = (e) => {
  const o = plain(e);
  return {
    id: idOf(o),
    athleteId: String(o.athleteId),
    date: fromDate(o.date),
    trainingType: o.trainingType,
    durationMinutes: o.durationMinutes,
    intensity: o.intensity,
    performanceScore: o.performanceScore,
    feelingScore: o.feelingScore,
    sleepHours: o.sleepHours,
    dietNotes: o.dietNotes ?? '',
    mealCount: o.mealCount,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const userToJSON = (u) => ({
  id: idOf(u),
  name: u.name,
  email: u.email,
  phone: u.phone || null,
  role: u.role,
  isActive: u.isActive,
  createdAt: u.createdAt,
});

const profileToJSON = (p, coach) => {
  const o = plain(p);
  const populated = o.coachId && o.coachId.name ? o.coachId : null;
  const c = coach || populated;
  return {
    id: idOf(o),
    userId: String(o.userId),
    sport: o.sport,
    category: o.category,
    personalBest: o.personalBest ?? '',
    goal: o.goal ?? '',
    dateOfBirth: o.dateOfBirth ? fromDate(o.dateOfBirth) : null,
    coach: c ? { id: idOf(c), name: c.name } : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

const twinToJSON = (t) => {
  if (!t) return null;
  const o = plain(t);
  return {
    performance: o.performance,
    trainingLoad: o.trainingLoad,
    recovery: o.recovery,
    fatigue: o.fatigue,
    adaptation: o.adaptation,
    lastEntryDate: o.lastEntryDate ? fromDate(o.lastEntryDate) : o.date ? fromDate(o.date) : null,
    version: o.version,
    updatedAt: o.updatedAt,
  };
};

const insightToJSON = (i) => {
  if (!i) return null;
  const o = plain(i);
  return {
    id: idOf(o),
    entryId: o.entryId ? String(o.entryId) : null,
    date: fromDate(o.date),
    type: o.type,
    severity: o.severity,
    title: o.title,
    message: o.message,
    contributingFactors: o.contributingFactors || [],
    rule: o.rule,
    createdAt: o.createdAt,
  };
};

module.exports = { entryToJSON, userToJSON, profileToJSON, twinToJSON, insightToJSON };
