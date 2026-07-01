const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDashboard, getProgress, getStreak, getHeatmap } = require('../controllers/analyticsController');

router.use(authenticate);
router.get('/dashboard', getDashboard);
router.get('/progress',  getProgress);
router.get('/streak',    getStreak);
router.get('/heatmap',   getHeatmap);

module.exports = router;
