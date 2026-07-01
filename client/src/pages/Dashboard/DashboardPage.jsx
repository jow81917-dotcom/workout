import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Home, Flame, Clock, Award, Dumbbell, ChevronRight, Sparkles } from 'lucide-react'
import { analyticsApi } from '../../api'
import useAuthStore from '../../store/authStore'
import NotificationPrompt from '../../components/notifications/NotificationPrompt'
import { format } from 'date-fns'
import heroImg from '../../assets/image.png'

const statusColor = { completed: '#22c55e', upcoming: '#4a90d9', missed: '#ef4444', in_progress: '#f59e0b' }

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  })

  const firstName = user?.name?.split(' ')[0] || 'Athlete'
  const totalSteps = 5000
  const goalSteps = 7000
  const stepsProgress = Math.min(100, (totalSteps / goalSteps) * 100)
  const streak = data?.streak?.current_streak ?? 0
  const streakPct = Math.min(100, (streak / 7) * 100)

  return (
    <div
      className="page-enter"
      style={{
        minHeight: '100dvh',
        position: 'relative',
        overflow: 'hidden',
        paddingBottom: 100,
      }}
    >
      {/* ── Hero Background ── */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '55%',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <img
          src={heroImg}
          alt="athlete"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />
        {/* Bottom fade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(13,27,46,0.35) 0%, rgba(13,27,46,0.0) 40%, rgba(13,27,46,1) 100%)',
          }}
        />
        {/* Side fade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(13,27,46,0.6) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 1.25rem' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingTop: '3.5rem',
          marginBottom: '1rem',
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.15, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
              Hi {firstName},<br />Welcome!
            </h1>
          </div>
          <button
            style={{
              width: 44, height: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              marginTop: '0.25rem',
            }}
            aria-label="Home"
          >
            <Home size={18} color="#fff" />
          </button>
        </div>

        {/* Spacer for hero image */}
        <div style={{ height: 'calc(55vw - 6rem)', maxHeight: 180 }} />

        {/* ── My Health section ── */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.875rem', color: '#fff' }}>
          My Health
        </h2>

        {/* Weekly Stats + Add Task row */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {/* Weekly Stats card */}
          <div
            className="card"
            style={{
              flex: 1,
              padding: '1rem',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem' }}>
              Weekly Stats
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { icon: <Dumbbell size={16} />, color: 'rgba(255,255,255,0.7)' },
                { icon: <Clock size={16} />, color: 'rgba(255,255,255,0.7)' },
                { icon: <Flame size={16} />, color: 'rgba(255,255,255,0.7)' },
                { icon: <Award size={16} />, color: 'rgba(255,255,255,0.7)' },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Task card */}
          <Link
            to="/workouts/new"
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                width: 90,
                padding: '1rem 0.75rem',
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '0.4rem', cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Plus size={18} color="#fff" />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>
                Add New<br />Task
              </span>
            </div>
          </Link>
        </div>

        {/* ── Active Task ── */}
        {isLoading ? (
          <div className="skeleton" style={{ height: 130, borderRadius: 16, marginBottom: '1.25rem' }} />
        ) : (
          <>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#fff' }}>
              Active Task
            </h2>
            {data?.today?.length > 0 ? (
              <ActiveTaskCard occ={data.today[0]} streakPct={streakPct} streak={streak} totalSteps={totalSteps} goalSteps={goalSteps} stepsProgress={stepsProgress} />
            ) : (
              <div
                className="card"
                style={{ marginBottom: '1.25rem', padding: '1.25rem', textAlign: 'center' }}
              >
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                  No active tasks today
                </p>
                <Link to="/workouts/new" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1.25rem' }}>
                  <Plus size={14} /> Create Workout
                </Link>
              </div>
            )}
          </>
        )}

        {/* ── Previous Tasks ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Previous Tasks</h2>
          <Link to="/workouts" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="skeleton" style={{ height: 72, borderRadius: 16 }} />
        ) : (
          <PreviousTasksCard data={data} />
        )}

        {/* ── Upcoming ── */}
        {!isLoading && data?.upcoming?.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '1.25rem 0 0.75rem', color: '#fff' }}>
              Upcoming
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.upcoming.slice(0, 3).map((occ) => (
                <Link key={occ.id} to={`/workouts/${occ.workout_id}`} style={{ textDecoration: 'none' }}>
                  <div
                    className="card"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem' }}
                  >
                    <div style={{ width: 3, height: 40, borderRadius: 2, background: occ.category_color || '#4a90d9', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {occ.workout_title}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                        {occ.scheduled_time?.slice(0, 5)} {occ.video_count > 0 ? `• ${occ.video_count} videos` : ''}
                      </div>
                    </div>
                    <span className={`badge badge-${occ.status === 'completed' ? 'success' : occ.status === 'missed' ? 'danger' : 'primary'}`} style={{ fontSize: '0.68rem' }}>
                      {occ.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Active Task Card ── */
function ActiveTaskCard({ occ, streakPct, streak, totalSteps, goalSteps, stepsProgress }) {
  const progress = 60 // placeholder — replace with real data if available

  return (
    <Link to={`/workouts/${occ.workout_id}`} style={{ textDecoration: 'none' }}>
      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          padding: '1.1rem',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Left side */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              {occ.workout_title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '1rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
              <Flame size={14} color="rgba(255,255,255,0.6)" />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.3 }}>
                3.8 km<br />Outdoor Walk
              </p>
            </div>
          </div>

          {/* Right side stats */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            {/* Streak */}
            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '0.6rem 0.75rem',
                textAlign: 'center',
                minWidth: 64,
              }}
            >
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>Streak</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>❮❮</span>
              </div>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '0.1rem' }}>{streak || 60}%</p>
            </div>

            {/* Progress circle */}
            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '0.6rem 0.75rem',
                textAlign: 'center',
                minWidth: 70,
              }}
            >
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem' }}>Progress</p>
              <CircleProgress value={progress} size={44} />
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>{progress}%</p>
            </div>
          </div>
        </div>

        {/* Steps Goal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '0.5rem',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '0.5rem 0.875rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
              Steps Goal
            </p>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
              {totalSteps}/{goalSteps}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── Circular Progress ── */
function CircleProgress({ value, size = 44, strokeWidth = 4 }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth={strokeWidth + 2}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#fff"
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

/* ── Previous Tasks Card ── */
function PreviousTasksCard({ data }) {
  const total = data?.stats?.total_completed ?? 0
  const target = Math.max(total + 8, 20)
  const pct = Math.min(100, Math.round((total / target) * 100))

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.1rem',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Mini donut */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <CircleProgress value={pct} size={52} strokeWidth={5} />
        <span
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', fontWeight: 700, color: '#fff',
          }}
        >
          {pct}%
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
          {total} tasks completed
        </p>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
          {total}/{target}
        </p>
      </div>
      <Sparkles size={20} color="rgba(255,255,255,0.35)" />
    </div>
  )
}
