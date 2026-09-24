const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authMiddleware } = require('../middleware/auth');
const { requireAnyRole, isAdmin } = require('../middleware/roleMiddleware');

// Every approval route touches job order state — none of it may be anonymous.
router.get('/', authMiddleware, requireAnyRole(['admin', 'technician']), approvalController.list);
router.get('/:id', authMiddleware, requireAnyRole(['admin', 'technician']), approvalController.getById);

// approve/reject are admin-only; request_approval is technician-only.
// The per-action check lives in the controller, which knows the action.
router.post('/', authMiddleware, requireAnyRole(['admin', 'technician']), approvalController.create);
router.put('/:id', authMiddleware, isAdmin, approvalController.update);

module.exports = router;
