const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleMiddleware');

// Activity logs are an admin audit trail — never anonymous.
router.get('/', authMiddleware, isAdmin, logsController.list);
router.get('/:id', authMiddleware, isAdmin, logsController.getById);

module.exports = router;
