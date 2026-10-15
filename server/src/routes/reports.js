'use strict';
const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const ctrl = require('../controllers/reportController');

const router = express.Router();
router.use(auth, requireRole('athlete'));

router.post('/generate', asyncHandler(ctrl.generate));
router.get('/', asyncHandler(ctrl.list));
router.get('/:id/pdf', asyncHandler(ctrl.pdf));
router.get('/:id', asyncHandler(ctrl.getOne));

module.exports = router;
