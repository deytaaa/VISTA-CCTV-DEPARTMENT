const express = require('express')
const router = express.Router()
const inventory = require('../controllers/inventoryController')
const { authMiddleware } = require('../middleware/auth')
const { requireAnyRole } = require('../middleware/roleMiddleware')

const inventoryReadAccess = requireAnyRole(['admin', 'inventory'])
const inventoryWriteAccess = requireAnyRole(['inventory'])

// Read-only access for admins/inventory (used by JO creation dropdown)
router.get('/', authMiddleware, inventoryReadAccess, inventory.list)
router.get('/items', authMiddleware, inventoryReadAccess, inventory.list)
router.get('/:id', authMiddleware, inventoryReadAccess, inventory.getById)

// Keep stock/inventory management restricted to inventory role only
router.post('/', authMiddleware, inventoryWriteAccess, inventory.create)
router.put('/:id', authMiddleware, inventoryWriteAccess, inventory.update)
router.delete('/:id', authMiddleware, inventoryWriteAccess, inventory.remove)
router.post('/:id/stock', authMiddleware, inventoryWriteAccess, inventory.addStock)

// Preview usage should remain restricted (can disclose availability/transactions)
router.post('/preview-usage', authMiddleware, requireAnyRole(['admin', 'inventory']), inventory.previewUsage)

module.exports = router


