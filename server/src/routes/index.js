const router = require('express').Router();
const mongoose = require('mongoose');
const { ok } = require('../utils/http');

router.get('/health', (req, res) =>
  ok(res, {
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  })
);

router.use('/auth', require('./auth'));
router.use('/athlete', require('./athlete'));
router.use('/daily-entries', require('./dailyEntries'));
router.use('/twin', require('./twin'));
router.use('/insights', require('./insights'));
router.use('/admin', require('./admin'));
router.use('/coach', require('./coach'));

router.use('/reports', require('./reports'));

module.exports = router;
