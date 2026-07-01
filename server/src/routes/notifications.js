const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { subscribe, sendTest, getNotifications, markOpened } = require('../controllers/notificationController');

router.use(authenticate);
router.post('/subscribe', subscribe);
router.post('/test',      sendTest);
router.get('/',           getNotifications);
router.put('/:id/open',   markOpened);

module.exports = router;
