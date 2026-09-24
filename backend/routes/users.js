const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleMiddleware');
const { accountLimiter } = require('../middleware/rateLimit');

// Admin-only User Management
router.get('/', authMiddleware, isAdmin, usersController.listUsers);
router.post('/', authMiddleware, isAdmin, accountLimiter, usersController.createUser);

// Used by Create JO page to populate the “Assign To” technician dropdown.
// Must be defined before any /:id dynamic route.
router.get('/technicians', authMiddleware, isAdmin, usersController.listTechnicians);

router.put('/:id', authMiddleware, isAdmin, accountLimiter, usersController.updateUser);
router.post('/:id/reset-password', authMiddleware, isAdmin, accountLimiter, usersController.resetPassword);
router.delete('/:id', authMiddleware, isAdmin, accountLimiter, usersController.deleteUser);

// Reactivation is driven from the main users table (which lists inactive users
// too and filters them client-side), so no separate "inactive users" endpoint.
router.post('/:id/reactivate', authMiddleware, isAdmin, accountLimiter, usersController.reactivateUser);

module.exports = router;


