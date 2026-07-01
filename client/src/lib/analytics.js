/**
 * analytics.js — PostHog wrapper for WorkoutFlow
 *
 * Usage:
 *   import { track, identify, resetIdentity } from '../lib/analytics'
 *
 *   identify(user)           // call after login / on app boot
 *   resetIdentity()          // call on logout
 *   track('event_name', {})  // call anywhere
 */

import posthog from 'posthog-js'

const KEY  = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialised = false

/* ── Init ──────────────────────────────────────────────────────────────── */
export function initAnalytics() {
  // Skip if no key is set (local dev without PostHog)
  if (!KEY || KEY === 'your_posthog_key_here') {
    if (import.meta.env.DEV) {
      console.info('[Analytics] PostHog key not set — analytics disabled.')
    }
    return
  }
  if (initialised) return

  posthog.init(KEY, {
    api_host: HOST,
    ui_host: 'https://us.posthog.com',

    // Autocapture — capture clicks, inputs, page views automatically
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,

    // Session recording
    session_recording: {
      maskAllInputs: true,             // never record passwords / tokens
      maskInputOptions: {
        password: true,
        email: false,                  // email is fine in session replay
      },
    },

    // Privacy — exclude sensitive DOM attributes
    sanitize_properties: (props) => {
      const blocked = ['password', 'token', 'authorization', 'credit_card']
      const out = { ...props }
      for (const k of blocked) { delete out[k] }
      return out
    },

    // Performance
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.debug()
    },

    // Don't send analytics in test mode
    disable_session_recording: false,

    // Respect user opt-out via DNT
    respect_dnt: true,
  })

  initialised = true
}

/* ── User identification ────────────────────────────────────────────────── */
export function identify(user) {
  if (!isReady()) return
  posthog.identify(user.id, {
    email:      user.email,
    name:       user.name,
    timezone:   user.timezone,
    created_at: user.created_at,
    plan:       'free',
  })
}

export function resetIdentity() {
  if (!isReady()) return
  posthog.reset()
}

/* ── Event tracking ─────────────────────────────────────────────────────── */
export function track(event, properties = {}) {
  if (!isReady()) {
    if (import.meta.env.DEV) {
      console.info(`[Analytics] track: ${event}`, properties)
    }
    return
  }
  posthog.capture(event, {
    ...properties,
    app: 'WorkoutFlow',
    platform: detectPlatform(),
    device: detectDevice(),
  })
}

/* ── Feature flags ──────────────────────────────────────────────────────── */
export function isFeatureEnabled(flag) {
  if (!isReady()) return false
  return posthog.isFeatureEnabled(flag)
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function isReady() {
  return initialised && typeof posthog !== 'undefined'
}

function detectPlatform() {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'web'
}

function detectDevice() {
  return window.innerWidth <= 430 ? 'mobile' : 'desktop'
}

/* ── Named event constants (prevents typos) ─────────────────────────────── */
export const Events = {
  // Auth
  USER_REGISTERED:    'user_registered',
  USER_LOGGED_IN:     'user_logged_in',
  USER_LOGGED_OUT:    'user_logged_out',

  // Workouts
  WORKOUT_CREATED:    'workout_created',
  WORKOUT_UPDATED:    'workout_updated',
  WORKOUT_DELETED:    'workout_deleted',
  WORKOUT_OPENED:     'workout_opened',
  WORKOUT_COMPLETED:  'workout_completed',

  // Videos
  VIDEO_ADDED:        'tiktok_video_added',
  VIDEO_REMOVED:      'tiktok_video_removed',
  VIDEO_OPENED:       'tiktok_video_opened',
  VIDEO_COMPLETED:    'tiktok_video_completed',
  VIDEO_SKIPPED:      'video_skipped',
  VIDEO_FALLBACK:     'video_fallback_shown',

  // Schedule
  SCHEDULE_CREATED:   'schedule_created',
  SCHEDULE_UPDATED:   'schedule_updated',
  SCHEDULE_TRIGGERED: 'schedule_triggered',

  // Notifications
  NOTIF_GRANTED:      'notification_permission_granted',
  NOTIF_DENIED:       'notification_permission_denied',
  NOTIF_SENT:         'notification_sent',
  NOTIF_OPENED:       'notification_opened',
  NOTIF_SKIPPED:      'notification_skipped',

  // Engagement
  DASHBOARD_OPENED:   'dashboard_opened',
  CALENDAR_OPENED:    'calendar_opened',
  ANALYTICS_OPENED:   'analytics_opened',
  SESSION_STARTED:    'session_started',
  SESSION_COMPLETED:  'session_completed',
  SESSION_ABANDONED:  'session_abandoned',

  // PWA
  PWA_INSTALLED:      'pwa_installed',

  // Errors
  API_ERROR:          'api_error',
  VIDEO_LOAD_ERROR:   'video_loading_failure',
  NOTIF_ERROR:        'notification_failure',
}
