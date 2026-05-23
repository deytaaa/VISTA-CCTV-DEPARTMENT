const express = require('express');
const router = express.Router();
const completionController = require('../controllers/completionController');
const { authMiddleware } = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, completionController.list);
router.get('/:id', authMiddleware, completionController.getById);
router.post('/', authMiddleware, requireAnyRole(['admin', 'technician']), completionController.create);
router.put('/:id', authMiddleware, requireAnyRole(['admin', 'technician']), completionController.update);

module.exports = router;
