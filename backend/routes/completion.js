const express = require('express');
const router = express.Router();
const completionController = require('../controllers/completionController');

router.get('/', completionController.list);
router.get('/:id', completionController.getById);
router.post('/', completionController.create);
router.put('/:id', completionController.update);

module.exports = router;
