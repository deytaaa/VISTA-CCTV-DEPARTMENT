const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');

router.get('/', approvalController.list);
router.get('/:id', approvalController.getById);
router.post('/', approvalController.create);
router.put('/:id', approvalController.update);

module.exports = router;
