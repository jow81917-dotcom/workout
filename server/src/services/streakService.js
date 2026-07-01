/**
 * Streak Service
 * Called whenever a workout occurrence is marked 'completed'
 */
const db = require('../config/db');

const updateStreak = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const streakRes = await db.query('SELECT * FROM streaks WHERE user_id=$1', [userId]);
    if (!streakRes.rows.length) {
      await db.query('INSERT INTO streaks (user_id, current_streak, best_streak, last_completion) VALUES ($1,1,1,$2)', [userId, today]);
      return;
    }
    const s = streakRes.rows[0];
    const last = s.last_completion ? new Date(s.last_completion).toISOString().split('T')[0] : null;

    // Already counted today
    if (last === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = last === yesterday ? s.current_streak + 1 : 1;
    const newBest   = Math.max(newStreak, s.best_streak);

    await db.query(
      'UPDATE streaks SET current_streak=$1, best_streak=$2, last_completion=$3 WHERE user_id=$4',
      [newStreak, newBest, today, userId]
    );
  } catch (err) {
    console.error('Streak update error:', err.message);
  }
};

module.exports = { updateStreak };
