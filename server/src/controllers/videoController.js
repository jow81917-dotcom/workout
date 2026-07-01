const db = require('../config/db');

// POST /api/workouts/:workoutId/videos
const addVideo = async (req, res, next) => {
  try {
    const { workoutId } = req.params;
    const { title, video_url, note, estimated_duration } = req.body;

    // Get next position
    const posRes = await db.query(
      'SELECT COALESCE(MAX(position),0)+1 AS next_pos FROM workout_videos WHERE workout_id=$1',
      [workoutId]
    );
    const position = posRes.rows[0].next_pos;

    const { rows } = await db.query(
      `INSERT INTO workout_videos (workout_id, title, video_url, position, note, estimated_duration)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [workoutId, title, video_url, position, note, estimated_duration]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/videos/:id
const updateVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, video_url, note, estimated_duration } = req.body;

    const { rows } = await db.query(
      `UPDATE workout_videos SET
         title = COALESCE($1, title),
         video_url = COALESCE($2, video_url),
         note = COALESCE($3, note),
         estimated_duration = COALESCE($4, estimated_duration)
       WHERE id = $5 RETURNING *`,
      [title, video_url, note, estimated_duration, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Video not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/videos/:id
const deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM workout_videos WHERE id=$1', [id]);
    res.json({ message: 'Video removed', id });
  } catch (err) {
    next(err);
  }
};

// PUT /api/videos/reorder
const reorderVideos = async (req, res, next) => {
  try {
    // { videos: [{id, position}] }
    const { videos } = req.body;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const v of videos) {
        await client.query('UPDATE workout_videos SET position=$1 WHERE id=$2', [v.position, v.id]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    res.json({ message: 'Videos reordered' });
  } catch (err) {
    next(err);
  }
};

module.exports = { addVideo, updateVideo, deleteVideo, reorderVideos };
