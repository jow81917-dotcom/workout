const db = require('../config/db');

// GET /api/analytics/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Streak
    const streakRes = await db.query(
      'SELECT current_streak, best_streak, last_completion FROM streaks WHERE user_id=$1',
      [userId]
    );
    const streak = streakRes.rows[0] || { current_streak: 0, best_streak: 0 };

    // Total completed + total minutes (last 30 days)
    const statsRes = await db.query(
      `SELECT COALESCE(SUM(completed),0)::int AS total_completed,
              COALESCE(SUM(minutes),0)::int AS total_minutes
       FROM analytics_daily WHERE user_id=$1`,
      [userId]
    );
    const stats = statsRes.rows[0];

    // Weekly progress (last 7 days)
    const weekRes = await db.query(
      `SELECT date, completed, minutes, skipped
       FROM analytics_daily
       WHERE user_id=$1 AND date >= NOW() - INTERVAL '7 days'
       ORDER BY date ASC`,
      [userId]
    );

    // Today's workouts
    const todayRes = await db.query(
      `SELECT wo.*, w.title AS workout_title, wc.name AS category_name, wc.color AS category_color,
              COUNT(wv.id)::int AS video_count
       FROM workout_occurrences wo
       JOIN workouts w ON w.id = wo.workout_id
       LEFT JOIN workout_categories wc ON wc.id = w.category_id
       LEFT JOIN workout_videos wv ON wv.workout_id = w.id
       WHERE w.user_id=$1 AND wo.scheduled_date=$2
       GROUP BY wo.id, w.title, w.id, wc.name, wc.color
       ORDER BY wo.scheduled_time`,
      [userId, today]
    );

    // Upcoming (next 7 days, excluding today)
    const upcomingRes = await db.query(
      `SELECT wo.*, w.title AS workout_title, wc.name AS category_name, wc.color AS category_color
       FROM workout_occurrences wo
       JOIN workouts w ON w.id = wo.workout_id
       LEFT JOIN workout_categories wc ON wc.id = w.category_id
       WHERE w.user_id=$1 AND wo.scheduled_date > $2 AND wo.scheduled_date <= $2::date + 7
         AND wo.status = 'upcoming'
       ORDER BY wo.scheduled_date, wo.scheduled_time
       LIMIT 5`,
      [userId, today]
    );

    // Recent activity (last 10 completions)
    const recentRes = await db.query(
      `SELECT cl.*, w.title AS workout_title, wc.color AS category_color
       FROM completion_logs cl
       JOIN workouts w ON w.id = cl.workout_id
       LEFT JOIN workout_categories wc ON wc.id = w.category_id
       WHERE cl.user_id=$1
       ORDER BY cl.date_completed DESC LIMIT 10`,
      [userId]
    );

    res.json({
      streak,
      stats,
      weekly: weekRes.rows,
      today: todayRes.rows,
      upcoming: upcomingRes.rows,
      recent: recentRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/progress?period=weekly
const getProgress = async (req, res, next) => {
  try {
    const { period = 'monthly' } = req.query;
    const interval = period === 'weekly' ? '7 days' : '30 days';

    const { rows } = await db.query(
      `SELECT date, completed, minutes, skipped
       FROM analytics_daily
       WHERE user_id=$1 AND date >= NOW() - INTERVAL '${interval}'
       ORDER BY date ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/streak
const getStreak = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM streaks WHERE user_id=$1',
      [req.user.id]
    );
    res.json(rows[0] || { current_streak: 0, best_streak: 0 });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/heatmap?year=2026
const getHeatmap = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const { rows } = await db.query(
      `SELECT date, completed FROM analytics_daily
       WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2
       ORDER BY date`,
      [req.user.id, year]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, getProgress, getStreak, getHeatmap };
