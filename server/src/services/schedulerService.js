/**
 * Scheduler Service
 * - Computes next_execution for a schedule
 * - Generates workout_occurrences for due schedules
 * - Sends push notifications
 */
const db = require('../config/db');
const webpush = require('web-push');

// ---------------------------------------------------------------------------
// Compute next execution timestamp from schedule params
// ---------------------------------------------------------------------------
const computeNextExecution = ({ start_date, scheduled_time, timezone, repeat_interval, days_of_week }) => {
  const now = new Date();
  const [h, m, s = 0] = scheduled_time.toString().split(':').map(Number);

  const candidate = new Date(`${start_date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'00')}`);

  if (candidate > now) return candidate;

  // Move forward based on repeat
  if (repeat_interval === 'once') return candidate;

  if (repeat_interval === 'daily') {
    while (candidate <= now) candidate.setDate(candidate.getDate() + 1);
    return candidate;
  }

  if (repeat_interval === 'weekly') {
    const days = Array.isArray(days_of_week) ? days_of_week : [];
    if (!days.length) {
      while (candidate <= now) candidate.setDate(candidate.getDate() + 7);
      return candidate;
    }
    // Find next matching weekday (Mon=1 Sun=7)
    for (let i = 1; i <= 14; i++) {
      const test = new Date(now);
      test.setDate(now.getDate() + i);
      test.setHours(h, m, s, 0);
      const dayNum = test.getDay() === 0 ? 7 : test.getDay();
      if (days.includes(dayNum)) return test;
    }
  }

  if (repeat_interval === 'monthly') {
    while (candidate <= now) candidate.setMonth(candidate.getMonth() + 1);
    return candidate;
  }

  return candidate;
};

// ---------------------------------------------------------------------------
// Main cron tick — called every minute
// ---------------------------------------------------------------------------
const runSchedulerTick = async () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 60 * 1000); // next 60 seconds

  try {
    // 1. Find schedules whose next_execution is within the next minute
    const { rows: dueSchedules } = await db.query(
      `SELECT s.*, w.user_id, w.title AS workout_title, w.id AS workout_id,
              COUNT(wv.id)::int AS video_count
       FROM schedules s
       JOIN workouts w ON w.id = s.workout_id
       LEFT JOIN workout_videos wv ON wv.workout_id = w.id
       WHERE s.active = true
         AND s.next_execution <= $1
         AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
       GROUP BY s.id, w.user_id, w.title, w.id`,
      [windowEnd]
    );

    for (const schedule of dueSchedules) {
      await processSchedule(schedule, now);
    }

    // 2. Mark missed occurrences (past due + still 'upcoming')
    await db.query(
      `UPDATE workout_occurrences SET status='missed'
       WHERE status='upcoming'
         AND (scheduled_date < CURRENT_DATE
              OR (scheduled_date = CURRENT_DATE AND scheduled_time < (NOW() - INTERVAL '30 minutes')::time))`,
      []
    );
  } catch (err) {
    console.error('Scheduler tick error:', err.message);
  }
};

const processSchedule = async (schedule, now) => {
  const todayDate = now.toISOString().split('T')[0];
  const schedTime = schedule.scheduled_time;

  try {
    // Create occurrence (ignore conflict if already exists)
    await db.query(
      `INSERT INTO workout_occurrences (workout_id, schedule_id, scheduled_date, scheduled_time, status)
       VALUES ($1,$2,$3,$4,'upcoming')
       ON CONFLICT (workout_id, scheduled_date, scheduled_time) DO NOTHING`,
      [schedule.workout_id, schedule.id, todayDate, schedTime]
    );

    // Send push notification
    await sendPushForSchedule(schedule);

    // Log notification record
    await db.query(
      `INSERT INTO notifications (user_id, workout_id, title, body, sent, sent_at)
       VALUES ($1,$2,$3,$4,true,NOW())`,
      [
        schedule.user_id,
        schedule.workout_id,
        '🏋️ Workout Ready',
        `${schedule.workout_title} — ${schedule.video_count} video${schedule.video_count !== 1 ? 's' : ''} waiting`,
      ]
    );

    // Advance next_execution
    const next = computeNextExecution({
      start_date: new Date(now.getTime() + 60000).toISOString().split('T')[0],
      scheduled_time: schedTime,
      timezone: schedule.timezone,
      repeat_interval: schedule.repeat_interval,
      days_of_week: schedule.days_of_week || [],
    });

    await db.query(
      'UPDATE schedules SET next_execution=$1 WHERE id=$2',
      [next, schedule.id]
    );
  } catch (err) {
    console.error(`Error processing schedule ${schedule.id}:`, err.message);
  }
};

const sendPushForSchedule = async (schedule) => {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@workoutflow.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { rows: subs } = await db.query(
    'SELECT * FROM user_push_subscriptions WHERE user_id=$1',
    [schedule.user_id]
  );

  const payload = JSON.stringify({
    title: '🏋️ Workout Ready',
    body: `${schedule.workout_title} — ${schedule.video_count} video${schedule.video_count !== 1 ? 's' : ''} waiting`,
    url: `/workouts/${schedule.workout_id}`,
    workoutId: schedule.workout_id,
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (e) {
      if (e.statusCode === 410) {
        await db.query('DELETE FROM user_push_subscriptions WHERE endpoint=$1', [sub.endpoint]);
      }
    }
  }
};

module.exports = { computeNextExecution, runSchedulerTick };
