const router = require('express').Router();
const c = require('../controllers/adminController');
const { auth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { adminUsersQuery, statusSchema } = require('../validators');

router.use(auth, requireRole('admin'));
router.get('/users', validate(adminUsersQuery, 'query'), c.listUsers);
router.patch('/users/:id/status', validate(statusSchema), c.setStatus);

module.exports = router;
