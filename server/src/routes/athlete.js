const router = require('express').Router();
const c = require('../controllers/athleteController');
const { auth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createProfileSchema, updateProfileSchema } = require('../validators');

router.use(auth, requireRole('athlete'));
router.get('/profile', c.getProfile);
router.post('/profile', validate(createProfileSchema), c.createProfile);
router.patch('/profile', validate(updateProfileSchema), c.updateProfile);

module.exports = router;
