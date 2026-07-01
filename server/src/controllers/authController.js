const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/db');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, timezone = 'UTC' } = req.body;

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);

    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, timezone)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, timezone, created_at`,
      [name.trim(), email.toLowerCase(), password_hash, timezone]
    );
    const user = rows[0];

    // Initialise streak row
    await db.query('INSERT INTO streaks (user_id) VALUES ($1)', [user.id]);

    // Seed default categories
    const defaultCategories = [
      { name: 'Strength', color: '#ef4444' },
      { name: 'Cardio',   color: '#f97316' },
      { name: 'Yoga',     color: '#8b5cf6' },
      { name: 'Mobility', color: '#06b6d4' },
      { name: 'Custom',   color: '#6366f1' },
    ];
    for (const cat of defaultCategories) {
      await db.query(
        'INSERT INTO workout_categories (user_id, name, color) VALUES ($1, $2, $3)',
        [user.id, cat.name, cat.color]
      );
    }

    const token = generateToken(user.id);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    // Update last active via updated_at trigger
    await db.query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/profile
const getProfile = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.timezone, u.notification_enabled,
              u.created_at, u.updated_at,
              s.current_streak, s.best_streak, s.last_completion
       FROM users u
       LEFT JOIN streaks s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar_url, timezone, notification_enabled } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         avatar_url = COALESCE($2, avatar_url),
         timezone = COALESCE($3, timezone),
         notification_enabled = COALESCE($4, notification_enabled)
       WHERE id = $5
       RETURNING id, name, email, avatar_url, timezone, notification_enabled, updated_at`,
      [name, avatar_url, timezone, notification_enabled, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const password_hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getProfile, updateProfile, changePassword };
