const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');
const { authMiddleware } = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/roleMiddleware');

const readAccess = requireAnyRole(['admin', 'technician']);
const writeAccess = requireAnyRole(['admin']);

router.get('/', authMiddleware, readAccess, personnelController.list);
router.get('/:id', authMiddleware, readAccess, personnelController.getById);
router.post('/', authMiddleware, writeAccess, personnelController.create);
router.put('/:id', authMiddleware, writeAccess, personnelController.update);
router.delete('/:id', authMiddleware, writeAccess, personnelController.delete);

module.exports = router;
