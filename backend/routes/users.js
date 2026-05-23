const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authMiddleware } = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/roleMiddleware');

router.get('/technicians', authMiddleware, requireAnyRole(['admin', 'dispatcher']), usersController.listTechnicians);

module.exports = router;