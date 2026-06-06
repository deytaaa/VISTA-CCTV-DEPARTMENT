const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleMiddleware');

// Admin-only User Management
router.get('/', authMiddleware, isAdmin, usersController.listUsers);
router.post('/', authMiddleware, isAdmin, usersController.createUser);

// Used by Create JO page to populate the “Assign To” technician dropdown.
// Must be defined before any /:id dynamic route.
router.get('/technicians', authMiddleware, isAdmin, usersController.listTechnicians);

router.put('/:id', authMiddleware, isAdmin, usersController.updateUser);
router.post('/:id/reset-password', authMiddleware, isAdmin, usersController.resetPassword);
router.delete('/:id', authMiddleware, isAdmin, usersController.deleteUser);


module.exports = router;

