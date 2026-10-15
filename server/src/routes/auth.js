const router = require('express').Router();
const c = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { registerSchema, loginSchema } = require('../validators');

router.use(authLimiter);
router.post('/register', validate(registerSchema), c.register);
router.post('/login', validate(loginSchema), c.login);
router.get('/me', auth, c.me);

module.exports = router;
