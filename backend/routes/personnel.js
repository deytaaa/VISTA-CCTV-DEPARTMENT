const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');

router.get('/', personnelController.list);
router.get('/:id', personnelController.getById);
router.post('/', personnelController.create);
router.put('/:id', personnelController.update);
router.delete('/:id', personnelController.delete);

module.exports = router;
