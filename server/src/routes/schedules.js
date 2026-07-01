const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { updateSchedule, deleteSchedule } = require('../controllers/scheduleController');

router.use(authenticate);
router.put('/:id',    updateSchedule);
router.delete('/:id', deleteSchedule);

module.exports = router;
