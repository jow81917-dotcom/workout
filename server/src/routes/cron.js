const express = require('express');
const router = express.Router();
const { runSchedulerTick } = require('../services/schedulerService');

// POST /api/cron/tick
// Called by Vercel Cron every minute
router.post('/tick', async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await runSchedulerTick();
    res.json({ message: 'Tick completed', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Cron tick error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
