const db = require('../config/db');
const { computeNextExecution } = require('../services/schedulerService');

// POST /api/workouts/:workoutId/schedule
const createSchedule = async (req, res, next) => {
  try {
    const { workoutId } = req.params;
    const {
      start_date, end_date, scheduled_time, timezone = 'UTC',
      repeat_interval = 'weekly', days_of_week = [], notification_before_minutes = 15,
    } = req.body;

    const next_execution = computeNextExecution({ start_date, scheduled_time, timezone, repeat_interval, days_of_week });

    const { rows } = await db.query(
      `INSERT INTO schedules
         (workout_id, start_date, end_date, scheduled_time, timezone, repeat_interval,
          days_of_week, notification_before_minutes, next_execution)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [workoutId, start_date, end_date, scheduled_time, timezone,
       repeat_interval, JSON.stringify(days_of_week), notification_before_minutes, next_execution]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/schedules/:id
const updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      start_date, end_date, scheduled_time, timezone,
      repeat_interval, days_of_week, notification_before_minutes, active,
    } = req.body;

    const existing = await db.query('SELECT * FROM schedules WHERE id=$1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Schedule not found' });
    const s = existing.rows[0];

    const next_execution = computeNextExecution({
      start_date: start_date || s.start_date,
      scheduled_time: scheduled_time || s.scheduled_time,
      timezone: timezone || s.timezone,
      repeat_interval: repeat_interval || s.repeat_interval,
      days_of_week: days_of_week || s.days_of_week,
    });

    const { rows } = await db.query(
      `UPDATE schedules SET
         start_date = COALESCE($1, start_date),
         end_date = COALESCE($2, end_date),
         scheduled_time = COALESCE($3, scheduled_time),
         timezone = COALESCE($4, timezone),
         repeat_interval = COALESCE($5, repeat_interval),
         days_of_week = COALESCE($6, days_of_week),
         notification_before_minutes = COALESCE($7, notification_before_minutes),
         active = COALESCE($8, active),
         next_execution = $9
       WHERE id = $10 RETURNING *`,
      [start_date, end_date, scheduled_time, timezone, repeat_interval,
       days_of_week ? JSON.stringify(days_of_week) : null,
       notification_before_minutes, active, next_execution, id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/schedules/:id
const deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE schedules SET active=false WHERE id=$1', [id]);
    res.json({ message: 'Schedule deactivated', id });
  } catch (err) {
    next(err);
  }
};

module.exports = { createSchedule, updateSchedule, deleteSchedule };
