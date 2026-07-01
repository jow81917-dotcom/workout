import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingUp, Flame, Clock, CheckCircle2 } from 'lucide-react'
import { analyticsApi } from '../../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { format, subDays } from 'date-fns'

const TooltipStyle = {
  contentStyle: { background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, fontSize: '0.8rem' },
  labelStyle: { color: '#94a3b8' },
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('weekly')

  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: () => analyticsApi.dashboard().then(r => r.data) })
  const { data: progress = [] } = useQuery({
    queryKey: ['progress', period],
    queryFn: () => analyticsApi.progress(period).then(r => r.data),
  })
  const { data: heatmap = [] } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => analyticsApi.heatmap(new Date().getFullYear()).then(r => r.data),
  })

  const streak = dashboard?.streak || {}
  const stats = dashboard?.stats || {}

  const chartData = progress.map(p => ({
    date: format(new Date(p.date), 'MMM d'),
    completed: p.completed,
    minutes: p.minutes,
    skipped: p.skipped,
  }))

  return (
    <div className="page-enter" style={{ padding: '1.25rem', maxWidth: 480, margin: '0 auto', paddingTop: '3.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Analytics</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', marginTop: 2 }}>Your fitness insights</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard icon={<span className="flame-icon">🔥</span>} value={streak.current_streak ?? 0} label="Current Streak" color="#f97316" />
        <StatCard icon={<Flame size={20} color="#ef4444" />} value={streak.best_streak ?? 0} label="Best Streak" color="#ef4444" />
        <StatCard icon={<CheckCircle2 size={20} color="#10b981" />} value={stats.total_completed ?? 0} label="Total Completed" color="#10b981" />
        <StatCard icon={<Clock size={20} color="#818cf8" />} value={`${stats.total_minutes ?? 0}m`} label="Total Minutes" color="#818cf8" />
      </div>

      {/* Period Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {['weekly','monthly'].map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={period === p ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', flex: 1 }}>
            {p === 'weekly' ? '7 Days' : '30 Days'}
          </button>
        ))}
      </div>

      {/* Completions Chart */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <BarChart2 size={16} color="#818cf8" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Workouts Completed</span>
        </div>
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)', fontSize: '0.875rem' }}>No data yet — complete a workout to see stats!</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...TooltipStyle} />
              <Bar dataKey="completed" fill="#6366f1" radius={[4,4,0,0]} name="Completed" />
              <Bar dataKey="skipped" fill="rgba(239,68,68,0.4)" radius={[4,4,0,0]} name="Skipped" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Minutes Chart */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingUp size={16} color="#10b981" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Minutes Trained</span>
        </div>
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)', fontSize: '0.875rem' }}>No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TooltipStyle} />
              <Line type="monotone" dataKey="minutes" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Minutes" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Streak Milestones */}
      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>🏆 Streak Milestones</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[7, 30, 100, 365].map((target) => {
            const current = streak.current_streak || 0
            const reached = current >= target
            const pct = Math.min(100, (current / target) * 100)
            return (
              <div key={target} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{target === 7 ? '🌱' : target === 30 ? '⭐' : target === 100 ? '🏅' : '🏆'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{target} Day Streak</span>
                    <span style={{ fontSize: '0.75rem', color: reached ? '#10b981' : 'var(--color-muted)' }}>
                      {reached ? '✓ Reached!' : `${current}/${target}`}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: reached ? 'linear-gradient(90deg, #10b981, #06b6d4)' : undefined }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className="card">
      <div style={{ marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
