const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getCalendar, getToday, updateOccurrenceStatus, updateVideoProgress } = require('../controllers/calendarController');

router.use(authenticate);
router.get('/',                              getCalendar);
router.get('/today',                         getToday);
router.put('/occurrences/:id/status',        updateOccurrenceStatus);
router.put('/occurrences/:id/video-progress',updateVideoProgress);

module.exports = router;
