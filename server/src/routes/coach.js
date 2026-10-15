const router = require('express').Router();
const c = require('../controllers/coachController');
const { auth, requireRole } = require('../middleware/auth');

router.use(auth, requireRole('coach'));
router.get('/athletes', c.athletes);
router.get('/athletes/:athleteId/twin', c.athleteTwin);

module.exports = router;
