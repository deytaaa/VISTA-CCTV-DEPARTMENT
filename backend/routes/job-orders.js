const express = require('express');
const router = express.Router();
const jobOrderController = require('../controllers/jobOrderController');
const { authMiddleware } = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, jobOrderController.list);
router.get('/:id', authMiddleware, jobOrderController.getById);
router.post('/', authMiddleware, requireAnyRole(['admin','dispatcher']), jobOrderController.create);
router.put('/:id', authMiddleware, requireAnyRole(['admin','dispatcher']), jobOrderController.update);
router.delete('/:id', authMiddleware, requireAnyRole(['admin']), jobOrderController.delete);
router.post('/:id/processing', authMiddleware, requireAnyRole(['technician']), jobOrderController.markProcessing);
router.post('/:id/complete', authMiddleware, requireAnyRole(['technician']), jobOrderController.markCompleted);

module.exports = router;
