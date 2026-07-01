require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { errorHandler } = require('./middleware/errorHandler');

const authRoutes         = require('./routes/auth');
const workoutRoutes      = require('./routes/workouts');
const videoRoutes        = require('./routes/videos');
const scheduleRoutes     = require('./routes/schedules');
const notificationRoutes = require('./routes/notifications');
const calendarRoutes     = require('./routes/calendar');
const analyticsRoutes    = require('./routes/analytics');
const cronRoutes         = require('./routes/cron');

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ── Body Parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'WorkoutFlow API' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/workouts',      workoutRoutes);
app.use('/api/videos',        videoRoutes);
app.use('/api/schedules',     scheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar',      calendarRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/cron',          cronRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 WorkoutFlow API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
