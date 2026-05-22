const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');

router.get('/', itemsController.list);
router.get('/:id', itemsController.getById);
router.post('/', itemsController.create);
router.put('/:id', itemsController.update);
router.delete('/:id', itemsController.delete);

module.exports = router;
