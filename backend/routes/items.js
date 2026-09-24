const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');
const { authMiddleware } = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/roleMiddleware');

const readAccess = requireAnyRole(['admin', 'technician']);
const writeAccess = requireAnyRole(['admin']);

router.get('/', authMiddleware, readAccess, itemsController.list);
router.get('/:id', authMiddleware, readAccess, itemsController.getById);
router.post('/', authMiddleware, writeAccess, itemsController.create);
router.put('/:id', authMiddleware, writeAccess, itemsController.update);
router.delete('/:id', authMiddleware, writeAccess, itemsController.delete);

module.exports = router;
