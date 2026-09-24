const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleMiddleware');

router.post('/login', authController.login);
// register creates a Supabase auth user AND assigns its role — admin only,
// otherwise anyone could POST themselves an admin account.
router.post('/register', authMiddleware, isAdmin, authController.register);
router.get('/me', authMiddleware, authController.me);
router.get('/session', authMiddleware, authController.session);

module.exports = router;
