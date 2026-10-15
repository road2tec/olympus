const router = require('express').Router();
const c = require('../controllers/insightController');
const { auth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { listInsightsQuery } = require('../validators');

router.use(auth, requireRole('athlete'));
router.get('/latest', c.latest);
router.get('/', validate(listInsightsQuery, 'query'), c.list);

module.exports = router;
