const express = require('express');
const router = express.Router();
const jobOrderController = require('../controllers/jobOrderController');
const { authMiddleware } = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, (req, res, next) => { if (req.user?.role === 'inventory') return res.status(403).json({ error: 'Forbidden' }); return next(); }, jobOrderController.list);
router.get('/:id', authMiddleware, (req, res, next) => { if (req.user?.role === 'inventory') return res.status(403).json({ error: 'Forbidden' }); return next(); }, jobOrderController.getById);
router.post('/', authMiddleware, (req, res, next) => { if (req.user?.role === 'inventory') return res.status(403).json({ error: 'Forbidden' }); return next(); }, requireAnyRole(['admin','dispatcher']), jobOrderController.create);
router.put('/:id', authMiddleware, (req, res, next) => { if (req.user?.role === 'inventory') return res.status(403).json({ error: 'Forbidden' }); return next(); }, requireAnyRole(['admin','dispatcher']), jobOrderController.update);
router.delete('/:id', authMiddleware, (req, res, next) => { if (req.user?.role === 'inventory') return res.status(403).json({ error: 'Forbidden' }); return next(); }, requireAnyRole(['admin']), jobOrderController.delete);
router.post('/:id/processing', authMiddleware, (req, res, next) => { if (req.user?.role === 'inventory') return res.status(403).json({ error: 'Forbidden' }); return next(); }, requireAnyRole(['technician']), jobOrderController.markProcessing);
router.post('/:id/complete', authMiddleware, (req, res, next) => { if (req.user?.role === 'inventory') return res.status(403).json({ error: 'Forbidden' }); return next(); }, requireAnyRole(['technician']), jobOrderController.markCompleted);

module.exports = router;
