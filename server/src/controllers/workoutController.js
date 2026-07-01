const db = require('../config/db');

// GET /api/workouts
const getWorkouts = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT w.*, wc.name AS category_name, wc.color AS category_color,
              COUNT(wv.id)::int AS video_count,
              s.scheduled_time, s.repeat_interval, s.days_of_week, s.active AS schedule_active
       FROM workouts w
       LEFT JOIN workout_categories wc ON wc.id = w.category_id
       LEFT JOIN workout_videos wv ON wv.workout_id = w.id
       LEFT JOIN schedules s ON s.workout_id = w.id AND s.active = true
       WHERE w.user_id = $1 AND w.active = true
       GROUP BY w.id, wc.name, wc.color, s.scheduled_time, s.repeat_interval, s.days_of_week, s.active
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/workouts/:id
const getWorkout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT w.*, wc.name AS category_name, wc.color AS category_color
       FROM workouts w
       LEFT JOIN workout_categories wc ON wc.id = w.category_id
       WHERE w.id = $1 AND w.user_id = $2`,
      [id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Workout not found' });

    const workout = rows[0];

    const videos = await db.query(
      'SELECT * FROM workout_videos WHERE workout_id = $1 ORDER BY position ASC',
      [id]
    );
    const schedules = await db.query(
      'SELECT * FROM schedules WHERE workout_id = $1',
      [id]
    );

    res.json({ ...workout, videos: videos.rows, schedules: schedules.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/workouts
const createWorkout = async (req, res, next) => {
  try {
    const {
      title, description, category_id, exercise_type = 'repeat',
      repeat_type, target_sessions, strict_completion = false,
    } = req.body;

    const { rows } = await db.query(
      `INSERT INTO workouts
         (user_id, category_id, title, description, exercise_type, repeat_type, target_sessions, strict_completion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [req.user.id, category_id || null, title, description, exercise_type, repeat_type, target_sessions, strict_completion]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/workouts/:id
const updateWorkout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title, description, category_id, exercise_type,
      repeat_type, target_sessions, strict_completion, active,
    } = req.body;

    const { rows } = await db.query(
      `UPDATE workouts SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         category_id = COALESCE($3, category_id),
         exercise_type = COALESCE($4, exercise_type),
         repeat_type = COALESCE($5, repeat_type),
         target_sessions = COALESCE($6, target_sessions),
         strict_completion = COALESCE($7, strict_completion),
         active = COALESCE($8, active)
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [title, description, category_id, exercise_type, repeat_type, target_sessions, strict_completion, active, id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Workout not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/workouts/:id
const deleteWorkout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      'UPDATE workouts SET active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Workout not found' });
    res.json({ message: 'Workout deleted', id: rows[0].id });
  } catch (err) {
    next(err);
  }
};

// GET /api/workouts/categories
const getCategories = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM workout_categories WHERE user_id = $1 ORDER BY name ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/workouts/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, color = '#6366f1' } = req.body;
    const { rows } = await db.query(
      'INSERT INTO workout_categories (user_id, name, color) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, name, color]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { getWorkouts, getWorkout, createWorkout, updateWorkout, deleteWorkout, getCategories, createCategory };
