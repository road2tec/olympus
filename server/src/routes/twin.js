const router = require('express').Router();
const c = require('../controllers/twinController');
const { auth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { twinHistoryQuery } = require('../validators');

router.use(auth, requireRole('athlete'));
router.get('/current', c.current);
router.get('/history', validate(twinHistoryQuery, 'query'), c.history);

module.exports = router;
