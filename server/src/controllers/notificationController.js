const webpush = require('web-push');
const db = require('../config/db');

const initWebPush = () => {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@workoutflow.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
};

// POST /api/notifications/subscribe
const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    const { p256dh, auth } = keys;

    await db.query(
      `INSERT INTO user_push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh=$3, auth=$4`,
      [req.user.id, endpoint, p256dh, auth]
    );

    // Enable notifications on user
    await db.query('UPDATE users SET notification_enabled=true WHERE id=$1', [req.user.id]);

    res.json({ message: 'Subscribed to push notifications' });
  } catch (err) {
    next(err);
  }
};

// POST /api/notifications/test
const sendTest = async (req, res, next) => {
  try {
    initWebPush();
    const { rows } = await db.query(
      'SELECT * FROM user_push_subscriptions WHERE user_id=$1',
      [req.user.id]
    );
    if (!rows.length) return res.status(400).json({ error: 'No push subscription found. Please enable notifications first.' });

    const payload = JSON.stringify({
      title: '🏋️ WorkoutFlow Test',
      body: 'Push notifications are working!',
      url: '/',
    });

    for (const sub of rows) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (e) {
        if (e.statusCode === 410) {
          await db.query('DELETE FROM user_push_subscriptions WHERE endpoint=$1', [sub.endpoint]);
        }
      }
    }
    res.json({ message: 'Test notification sent' });
  } catch (err) {
    next(err);
  }
};

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT n.*, w.title AS workout_title
       FROM notifications n
       LEFT JOIN workouts w ON w.id = n.workout_id
       WHERE n.user_id=$1
       ORDER BY n.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/:id/open
const markOpened = async (req, res, next) => {
  try {
    await db.query(
      'UPDATE notifications SET opened_at=NOW() WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as opened' });
  } catch (err) {
    next(err);
  }
};

module.exports = { subscribe, sendTest, getNotifications, markOpened, initWebPush };
