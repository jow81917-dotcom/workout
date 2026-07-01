-- ============================================================
-- WorkoutFlow Database Migration — 001_init.sql
-- Run this in your Neon SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- UTILITY: auto-update updated_at on any row change
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TABLE 1: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100)  NOT NULL,
  email                 VARCHAR(255)  NOT NULL UNIQUE,
  password_hash         TEXT          NOT NULL,
  avatar_url            TEXT,
  timezone              VARCHAR(100)  NOT NULL DEFAULT 'UTC',
  notification_enabled  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- ============================================================
-- TABLE 2: user_push_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON user_push_subscriptions(user_id);


-- ============================================================
-- TABLE 3: workout_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_categories_user_id ON workout_categories(user_id);

-- Seed default categories per user via a function (called after user insert)
-- Categories are created per-user at registration time in the backend.


-- ============================================================
-- TABLE 4: workouts
-- ============================================================
-- exercise_type: 'repeat' | 'limited'
-- repeat_type:   'daily' | 'weekly' | 'monthly' | 'custom'
CREATE TABLE IF NOT EXISTS workouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id         UUID         REFERENCES workout_categories(id) ON DELETE SET NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT,
  exercise_type       VARCHAR(20)  NOT NULL DEFAULT 'repeat'
                        CHECK (exercise_type IN ('repeat', 'limited')),
  repeat_enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
  repeat_type         VARCHAR(20)
                        CHECK (repeat_type IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  target_sessions     INTEGER      DEFAULT NULL,   -- for 'limited' type
  completed_sessions  INTEGER      NOT NULL DEFAULT 0,
  strict_completion   BOOLEAN      NOT NULL DEFAULT FALSE,
  active              BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_workouts_updated_at ON workouts;
CREATE TRIGGER set_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_workouts_user_id    ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_category   ON workouts(category_id);
CREATE INDEX IF NOT EXISTS idx_workouts_active     ON workouts(user_id, active);


-- ============================================================
-- TABLE 5: workout_videos
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_videos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id          UUID         NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  title               VARCHAR(200) NOT NULL,
  video_url           TEXT         NOT NULL,
  position            INTEGER      NOT NULL DEFAULT 0,
  note                TEXT,
  estimated_duration  INTEGER      DEFAULT NULL,  -- seconds
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_videos_workout_id ON workout_videos(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_videos_position   ON workout_videos(workout_id, position);


-- ============================================================
-- TABLE 6: schedules
-- ============================================================
-- repeat_interval: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'
-- days_of_week: JSON array e.g. [1,3,5] (Mon=1 … Sun=7)
CREATE TABLE IF NOT EXISTS schedules (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id                  UUID         NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  start_date                  DATE         NOT NULL,
  end_date                    DATE,
  scheduled_time              TIME         NOT NULL,
  timezone                    VARCHAR(100) NOT NULL DEFAULT 'UTC',
  repeat_interval             VARCHAR(20)  NOT NULL DEFAULT 'weekly'
                                CHECK (repeat_interval IN ('once','daily','weekly','monthly','custom')),
  days_of_week                JSONB        DEFAULT '[]',  -- [1,3,5]
  notification_before_minutes INTEGER      NOT NULL DEFAULT 15,
  next_execution              TIMESTAMPTZ,
  active                      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_schedules_updated_at ON schedules;
CREATE TRIGGER set_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_schedules_workout_id      ON schedules(workout_id);
CREATE INDEX IF NOT EXISTS idx_schedules_next_execution  ON schedules(next_execution) WHERE active = TRUE;


-- ============================================================
-- TABLE 7: workout_occurrences
-- ============================================================
-- status: 'upcoming' | 'in_progress' | 'completed' | 'missed' | 'skipped'
CREATE TABLE IF NOT EXISTS workout_occurrences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id            UUID        NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  schedule_id           UUID        REFERENCES schedules(id) ON DELETE SET NULL,
  scheduled_date        DATE        NOT NULL,
  scheduled_time        TIME        NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'upcoming'
                          CHECK (status IN ('upcoming','in_progress','completed','missed','skipped')),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  completion_percentage INTEGER     NOT NULL DEFAULT 0
                          CHECK (completion_percentage BETWEEN 0 AND 100),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_occurrences_updated_at ON workout_occurrences;
CREATE TRIGGER set_occurrences_updated_at
  BEFORE UPDATE ON workout_occurrences
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_occurrences_workout_id      ON workout_occurrences(workout_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_scheduled_date  ON workout_occurrences(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_occurrences_status          ON workout_occurrences(status);
-- Prevent duplicate occurrences for same workout on same day/time
CREATE UNIQUE INDEX IF NOT EXISTS idx_occurrences_unique_slot
  ON workout_occurrences(workout_id, scheduled_date, scheduled_time);


-- ============================================================
-- TABLE 8: video_progress
-- ============================================================
-- status: 'pending' | 'playing' | 'completed' | 'skipped'
CREATE TABLE IF NOT EXISTS video_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID        NOT NULL REFERENCES workout_occurrences(id) ON DELETE CASCADE,
  video_id      UUID        NOT NULL REFERENCES workout_videos(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','playing','completed','skipped')),
  completed_at  TIMESTAMPTZ,
  watch_seconds INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_video_progress_updated_at ON video_progress;
CREATE TRIGGER set_video_progress_updated_at
  BEFORE UPDATE ON video_progress
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_video_progress_occurrence ON video_progress(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video      ON video_progress(video_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_progress_unique
  ON video_progress(occurrence_id, video_id);


-- ============================================================
-- TABLE 9: completion_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS completion_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id      UUID        NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  occurrence_id   UUID        REFERENCES workout_occurrences(id) ON DELETE SET NULL,
  date_completed  DATE        NOT NULL,
  duration        INTEGER     NOT NULL DEFAULT 0,  -- seconds
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_completion_logs_user_id        ON completion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_completion_logs_date_completed ON completion_logs(user_id, date_completed);


-- ============================================================
-- TABLE 10: streaks
-- ============================================================
CREATE TABLE IF NOT EXISTS streaks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_streak   INTEGER     NOT NULL DEFAULT 0,
  best_streak      INTEGER     NOT NULL DEFAULT 0,
  last_completion  DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_streaks_updated_at ON streaks;
CREATE TRIGGER set_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON streaks(user_id);


-- ============================================================
-- TABLE 11: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id  UUID        REFERENCES workouts(id) ON DELETE SET NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  sent        BOOLEAN     NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMPTZ,
  opened_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent    ON notifications(sent, created_at);


-- ============================================================
-- TABLE 12: analytics_daily
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_daily (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  minutes     INTEGER     NOT NULL DEFAULT 0,
  completed   INTEGER     NOT NULL DEFAULT 0,
  skipped     INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_analytics_daily_updated_at ON analytics_daily;
CREATE TRIGGER set_analytics_daily_updated_at
  BEFORE UPDATE ON analytics_daily
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_daily_user_date ON analytics_daily(user_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_id          ON analytics_daily(user_id);


-- ============================================================
-- DONE ✅
-- All 12 tables + utility trigger created.
-- ============================================================
