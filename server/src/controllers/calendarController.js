const db = require('../config/db');

// GET /api/calendar?month=7&year=2026
const getCalendar = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year)  || new Date().getFullYear();

    const startDate = `${y}-${String(m).padStart(2,'0')}-01`;
    const endDate   = new Date(y, m, 0).toISOString().split('T')[0]; // last day of month

    const { rows } = await db.query(
      `SELECT wo.*, w.title AS workout_title, w.id AS workout_id,
              wc.name AS category_name, wc.color AS category_color
       FROM workout_occurrences wo
       JOIN workouts w ON w.id = wo.workout_id
       LEFT JOIN workout_categories wc ON wc.id = w.category_id
       WHERE w.user_id=$1
         AND wo.scheduled_date BETWEEN $2 AND $3
       ORDER BY wo.scheduled_date, wo.scheduled_time`,
      [req.user.id, startDate, endDate]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/calendar/today
const getToday = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await db.query(
      `SELECT wo.*, w.title AS workout_title, w.id AS workout_id,
              wc.name AS category_name, wc.color AS category_color,
              COUNT(wv.id)::int AS video_count
       FROM workout_occurrences wo
       JOIN workouts w ON w.id = wo.workout_id
       LEFT JOIN workout_categories wc ON wc.id = w.category_id
       LEFT JOIN workout_videos wv ON wv.workout_id = w.id
       WHERE w.user_id=$1 AND wo.scheduled_date=$2
       GROUP BY wo.id, w.title, w.id, wc.name, wc.color
       ORDER BY wo.scheduled_time`,
      [req.user.id, today]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PUT /api/occurrences/:id/status
const updateOccurrenceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, completion_percentage } = req.body;

    const updates = { status, updated_at: new Date() };
    if (status === 'in_progress' && !req.body.started_at) updates.started_at = new Date();
    if (status === 'completed') updates.completed_at = new Date();

    const { rows } = await db.query(
      `UPDATE workout_occurrences SET
         status = $1,
         completion_percentage = COALESCE($2, completion_percentage),
         started_at = CASE WHEN $1='in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
         completed_at = CASE WHEN $1='completed' THEN NOW() ELSE completed_at END
       WHERE id = $3
       RETURNING *`,
      [status, completion_percentage, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Occurrence not found' });

    // If completed, update streak and analytics
    if (status === 'completed') {
      const occ = rows[0];
      const workoutRes = await db.query('SELECT user_id FROM workouts WHERE id=$1', [occ.workout_id]);
      if (workoutRes.rows.length) {
        const userId = workoutRes.rows[0].user_id;
        const { updateStreak } = require('../services/streakService');
        const { updateAnalytics } = require('../services/analyticsService');
        await updateStreak(userId);
        await updateAnalytics(userId, occ.workout_id, occ.id);
      }
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/occurrences/:id/video-progress
const updateVideoProgress = async (req, res, next) => {
  try {
    const { id: occurrenceId } = req.params;
    const { video_id, status, watch_seconds } = req.body;

    const { rows } = await db.query(
      `INSERT INTO video_progress (occurrence_id, video_id, status, watch_seconds)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (occurrence_id, video_id)
       DO UPDATE SET status=$3, watch_seconds=$4, completed_at=CASE WHEN $3='completed' THEN NOW() ELSE video_progress.completed_at END
       RETURNING *`,
      [occurrenceId, video_id, status, watch_seconds || 0]
    );

    // Recalculate completion percentage
    const stats = await db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status='completed')::int AS completed
       FROM video_progress WHERE occurrence_id=$1`,
      [occurrenceId]
    );
    const { total, completed } = stats.rows[0];
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    await db.query(
      'UPDATE workout_occurrences SET completion_percentage=$1 WHERE id=$2',
      [pct, occurrenceId]
    );

    res.json({ progress: rows[0], completion_percentage: pct });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCalendar, getToday, updateOccurrenceStatus, updateVideoProgress };
