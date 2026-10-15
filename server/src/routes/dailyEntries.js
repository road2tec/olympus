const router = require('express').Router();
const c = require('../controllers/dailyEntryController');
const { auth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createEntrySchema, updateEntrySchema, listEntriesQuery } = require('../validators');

router.use(auth, requireRole('athlete'));
router.post('/', validate(createEntrySchema), c.create);
router.get('/', validate(listEntriesQuery, 'query'), c.list);
router.get('/:id', c.getOne);
router.patch('/:id', validate(updateEntrySchema), c.update);

module.exports = router;
