const db = require('../config/db');

const updateAnalytics = async (userId, workoutId, occurrenceId) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get duration from video progress
    const durRes = await db.query(
      'SELECT COALESCE(SUM(watch_seconds),0)::int AS total_seconds FROM video_progress WHERE occurrence_id=$1',
      [occurrenceId]
    );
    const minutes = Math.round(durRes.rows[0].total_seconds / 60);

    await db.query(
      `INSERT INTO analytics_daily (user_id, date, completed, minutes)
       VALUES ($1, $2, 1, $3)
       ON CONFLICT (user_id, date)
       DO UPDATE SET completed = analytics_daily.completed + 1,
                     minutes   = analytics_daily.minutes   + $3`,
      [userId, today, minutes]
    );

    // Increment completed_sessions on workout
    await db.query(
      'UPDATE workouts SET completed_sessions = completed_sessions + 1 WHERE id=$1',
      [workoutId]
    );

    // Log completion
    await db.query(
      'INSERT INTO completion_logs (user_id, workout_id, occurrence_id, date_completed, duration) VALUES ($1,$2,$3,$4,$5)',
      [userId, workoutId, occurrenceId, today, durRes.rows[0].total_seconds]
    );
  } catch (err) {
    console.error('Analytics update error:', err.message);
  }
};

module.exports = { updateAnalytics };
