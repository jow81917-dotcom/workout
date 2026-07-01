import api from './axios'

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data)          => api.post('/api/auth/register', data),
  login:    (data)          => api.post('/api/auth/login', data),
  profile:  ()              => api.get('/api/auth/profile'),
  update:   (data)          => api.put('/api/auth/profile', data),
  changePassword: (data)    => api.put('/api/auth/change-password', data),
}

// ── Workouts ──────────────────────────────────────────────────────────────
export const workoutApi = {
  list:       ()            => api.get('/api/workouts'),
  get:        (id)          => api.get(`/api/workouts/${id}`),
  create:     (data)        => api.post('/api/workouts', data),
  update:     (id, data)    => api.put(`/api/workouts/${id}`, data),
  delete:     (id)          => api.delete(`/api/workouts/${id}`),
  categories: ()            => api.get('/api/workouts/categories'),
  createCategory: (data)    => api.post('/api/workouts/categories', data),
}

// ── Videos ────────────────────────────────────────────────────────────────
export const videoApi = {
  add:      (workoutId, data) => api.post(`/api/workouts/${workoutId}/videos`, data),
  update:   (id, data)        => api.put(`/api/videos/${id}`, data),
  delete:   (id)              => api.delete(`/api/videos/${id}`),
  reorder:  (videos)          => api.put('/api/videos/reorder', { videos }),
}

// ── Schedules ─────────────────────────────────────────────────────────────
export const scheduleApi = {
  create: (workoutId, data)   => api.post(`/api/workouts/${workoutId}/schedule`, data),
  update: (id, data)          => api.put(`/api/schedules/${id}`, data),
  delete: (id)                => api.delete(`/api/schedules/${id}`),
}

// ── Notifications ─────────────────────────────────────────────────────────
export const notificationApi = {
  subscribe: (sub)  => api.post('/api/notifications/subscribe', sub),
  test:      ()     => api.post('/api/notifications/test'),
  list:      ()     => api.get('/api/notifications'),
  markOpen:  (id)   => api.put(`/api/notifications/${id}/open`),
}

// ── Calendar ──────────────────────────────────────────────────────────────
export const calendarApi = {
  month:   (month, year)            => api.get(`/api/calendar?month=${month}&year=${year}`),
  today:   ()                       => api.get('/api/calendar/today'),
  updateStatus: (id, data)          => api.put(`/api/calendar/occurrences/${id}/status`, data),
  updateVideoProgress: (id, data)   => api.put(`/api/calendar/occurrences/${id}/video-progress`, data),
}

// ── Analytics ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: ()             => api.get('/api/analytics/dashboard'),
  progress:  (period)       => api.get(`/api/analytics/progress?period=${period}`),
  streak:    ()             => api.get('/api/analytics/streak'),
  heatmap:   (year)         => api.get(`/api/analytics/heatmap?year=${year}`),
}
