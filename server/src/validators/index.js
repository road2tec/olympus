const { z } = require('zod');
const { isValidDateString, todayUTC } = require('../utils/date');

const dateString = z
  .string({ error: 'Date is required (YYYY-MM-DD)' })
  .refine(isValidDateString, { message: 'Date must be a valid YYYY-MM-DD calendar date' });

const pastOrToday = dateString.refine((d) => !isValidDateString(d) || d <= todayUTC(), {
  message: 'Date cannot be in the future',
});

const num = (label) => z.number({ error: `${label} must be a number` });
const int = (label) => num(label).int(`${label} must be a whole number`);

// ---------- auth ----------
const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(254)
  .email('Email is invalid');

const phone = z
  .string()
  .trim()
  .max(20, 'Phone must be at most 20 characters')
  .regex(/^[0-9+()\-\s]*$/, 'Phone contains invalid characters');

const registerSchema = z.strictObject({
  name: z.string({ error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(80),
  email,
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  phone: phone.optional(),
});

const loginSchema = z.strictObject({
  email,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(128),
});

// ---------- profile ----------
const profileFields = {
  sport: z.string({ error: 'Sport is required' }).trim().min(1, 'Sport is required').max(80),
  category: z.string({ error: 'Category is required' }).trim().min(1, 'Category is required').max(80),
  personalBest: z.string().trim().max(120).optional(),
  goal: z.string().trim().max(500).optional(),
  dateOfBirth: dateString
    .refine((d) => !isValidDateString(d) || d < todayUTC(), { message: 'Date of birth must be in the past' })
    .optional(),
};

const createProfileSchema = z.strictObject(profileFields);
const updateProfileSchema = z
  .strictObject({
    sport: profileFields.sport.optional(),
    category: profileFields.category.optional(),
    personalBest: profileFields.personalBest,
    goal: profileFields.goal,
    dateOfBirth: profileFields.dateOfBirth,
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

// ---------- daily entries ----------
const TRAINING_TYPES = ['strength', 'endurance', 'speed', 'skill', 'recovery', 'match', 'other'];

const entryFields = {
  date: pastOrToday,
  trainingType: z.enum(TRAINING_TYPES, { error: `Training type must be one of: ${TRAINING_TYPES.join(', ')}` }),
  durationMinutes: int('Duration').min(1, 'Duration must be at least 1 minute').max(600, 'Duration cannot exceed 600 minutes'),
  intensity: int('Intensity').min(1, 'Intensity must be between 1 and 10').max(10, 'Intensity must be between 1 and 10'),
  performanceScore: num('Performance score').min(0, 'Performance score must be between 0 and 100').max(100, 'Performance score must be between 0 and 100'),
  feelingScore: int('Feeling score').min(1, 'Feeling score must be between 1 and 5').max(5, 'Feeling score must be between 1 and 5'),
  sleepHours: num('Sleep hours').min(0, 'Sleep hours must be between 0 and 24').max(24, 'Sleep hours must be between 0 and 24'),
  dietNotes: z.string().trim().max(500, 'Diet notes must be at most 500 characters').optional(),
  mealCount: int('Meal count').min(0, 'Meal count must be between 0 and 10').max(10, 'Meal count must be between 0 and 10'),
};

const createEntrySchema = z.strictObject(entryFields);

const updateEntrySchema = z
  .strictObject({
    date: entryFields.date.optional(),
    trainingType: entryFields.trainingType.optional(),
    durationMinutes: entryFields.durationMinutes.optional(),
    intensity: entryFields.intensity.optional(),
    performanceScore: entryFields.performanceScore.optional(),
    feelingScore: entryFields.feelingScore.optional(),
    sleepHours: entryFields.sleepHours.optional(),
    dietNotes: entryFields.dietNotes,
    mealCount: entryFields.mealCount.optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

// ---------- queries ----------
const page = z.coerce.number().int().min(1).default(1);
const limitMax = (max, def) => z.coerce.number().int().min(1).max(max).default(def);

const listEntriesQuery = z.object({
  page,
  limit: limitMax(100, 20),
  from: dateString.optional(),
  to: dateString.optional(),
});

const twinHistoryQuery = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  limit: limitMax(365, 60),
});

const listInsightsQuery = z.object({
  page,
  limit: limitMax(100, 20),
  type: z.enum(['needs_attention', 'trend', 'monitoring', 'info', 'insufficient_data']).optional(),
});

const adminUsersQuery = z.object({
  page,
  limit: limitMax(100, 20),
  role: z.enum(['athlete', 'coach', 'admin']).optional(),
  q: z.string().trim().max(100).optional(),
});

const statusSchema = z.strictObject({ isActive: z.boolean({ error: 'isActive must be a boolean' }) });

module.exports = {
  registerSchema,
  loginSchema,
  createProfileSchema,
  updateProfileSchema,
  createEntrySchema,
  updateEntrySchema,
  listEntriesQuery,
  twinHistoryQuery,
  listInsightsQuery,
  adminUsersQuery,
  statusSchema,
  TRAINING_TYPES,
};
