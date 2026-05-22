const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');

router.get('/', logsController.list);
router.get('/:id', logsController.getById);

module.exports = router;
