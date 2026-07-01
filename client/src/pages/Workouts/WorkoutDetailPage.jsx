import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Play, CheckCircle2, Clock, Calendar,
  Link2, Trash2, Settings, Edit2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { workoutApi, videoApi, scheduleApi, calendarApi } from '../../api'
import AddVideoModal from '../../components/workout/AddVideoModal'
import ScheduleModal from '../../components/workout/ScheduleModal'
import EditWorkoutModal from '../../components/workout/EditWorkoutModal'

export default function WorkoutDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showAddVideo, setShowAddVideo] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout', id],
    queryFn: () => workoutApi.get(id).then((r) => r.data),
  })

  const { mutate: deleteVideo } = useMutation({
    mutationFn: (vid) => videoApi.delete(vid),
    onSuccess: () => { qc.invalidateQueries(['workout', id]); toast.success('Video removed') },
  })

  const { mutate: startSession, isPending: startingSession } = useMutation({
    mutationFn: async () => {
      // Find today's occurrence for this workout
      const today = new Date().toISOString().split('T')[0]
      const calRes = await calendarApi.month(
        new Date().getMonth() + 1,
        new Date().getFullYear()
      )
      const todayOcc = calRes.data?.find(
        o => o.workout_id === Number(id) && o.scheduled_date === today
      )
      return todayOcc || null
    },
    onSuccess: (occ) => {
      if (occ) {
        navigate(`/session/${id}/occ/${occ.id}`)
      } else {
        // No scheduled occurrence today — start without occurrence tracking
        navigate(`/session/${id}`)
      }
    },
    onError: () => navigate(`/session/${id}`),
  })

  if (isLoading) return <LoadingSkeleton />
  if (!workout) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
      Workout not found
    </div>
  )

  const videos = workout.videos || []
  const schedule = workout.schedules?.[0]
  const accentColor = workout.category_color || '#4a90d9'

  return (
    <div style={{
      maxWidth: 430, margin: '0 auto', paddingBottom: '5rem',
      minHeight: '100dvh',
    }}>
      {/* ── Hero Header ── */}
      <div style={{
        background: `linear-gradient(160deg, ${accentColor}22 0%, transparent 60%)`,
        borderBottom: `1px solid ${accentColor}33`,
        padding: '3rem 1.25rem 1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <button onClick={() => navigate(-1)} style={iconBtnStyle}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {workout.category_name && (
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: accentColor,
              }}>
                {workout.category_name}
              </span>
            )}
            <h1 style={{
              fontSize: '1.4rem', fontWeight: 800, color: '#fff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {workout.title}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            <button onClick={() => setShowEdit(true)} style={iconBtnStyle} title="Edit">
              <Edit2 size={16} color="rgba(255,255,255,0.7)" />
            </button>
            <button onClick={() => setShowSchedule(true)} style={iconBtnStyle} title="Schedule">
              <Settings size={16} color="rgba(255,255,255,0.7)" />
            </button>
          </div>
        </div>

        {workout.description && (
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
            {workout.description}
          </p>
        )}

        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <Stat icon={<Play size={13} />} value={`${videos.length}`} label="videos" />
          {schedule && <Stat icon={<Calendar size={13} />} value={schedule.scheduled_time?.slice(0,5)} label={schedule.repeat_interval} />}
          {workout.exercise_type === 'limited' && (
            <Stat icon={<CheckCircle2 size={13} />} value={`${workout.completed_sessions}/${workout.target_sessions}`} label="sessions" />
          )}
        </div>
      </div>

      <div style={{ padding: '1.1rem 1.25rem' }}>
        {/* Schedule card */}
        {schedule && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '0.875rem 1rem', marginBottom: '1rem',
          }}>
            <Calendar size={17} color="#6fb3f7" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>
                {schedule.scheduled_time?.slice(0,5)} · {schedule.repeat_interval}
                {schedule.days_of_week?.length > 0 &&
                  ` (${schedule.days_of_week.map(d => ['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]).join(', ')})`}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Next: {schedule.next_execution ? new Date(schedule.next_execution).toLocaleString() : 'Not scheduled'}
              </div>
            </div>
          </div>
        )}

        {/* Start Session button */}
        {videos.length > 0 && (
          <button
            onClick={() => startSession()}
            disabled={startingSession}
            style={{
              width: '100%', padding: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              background: 'linear-gradient(135deg, rgba(74,144,217,0.3), rgba(34,197,94,0.2))',
              border: '1px solid rgba(74,144,217,0.4)',
              borderRadius: 16, color: '#fff', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer', marginBottom: '1.25rem', transition: 'all 0.2s',
            }}
          >
            <Play size={20} />
            {startingSession ? 'Loading…' : 'Start Session'}
          </button>
        )}

        {/* Video list header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
            Videos ({videos.length})
          </h2>
          <button
            onClick={() => setShowAddVideo(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.875rem', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Empty state */}
        {videos.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2.5rem 1rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{ fontSize: '2.5rem' }}>🎬</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>No videos yet</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>
              Paste a TikTok, YouTube, or any video URL
            </p>
            <button
              onClick={() => setShowAddVideo(true)}
              style={{
                padding: '0.6rem 1.25rem', borderRadius: 12,
                background: 'rgba(74,144,217,0.2)', border: '1px solid rgba(74,144,217,0.35)',
                color: '#6fb3f7', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <Plus size={15} /> Add First Video
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {videos.map((v, idx) => (
              <VideoItem key={v.id} video={v} idx={idx} onDelete={() => deleteVideo(v.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddVideo && <AddVideoModal workoutId={id} onClose={() => setShowAddVideo(false)} />}
      {showSchedule && <ScheduleModal workoutId={id} existing={schedule} onClose={() => setShowSchedule(false)} />}
      {showEdit && <EditWorkoutModal workout={workout} onClose={() => setShowEdit(false)} />}
    </div>
  )
}

function VideoItem({ video: v, idx, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.875rem 1rem',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14, transition: 'all 0.2s',
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', flexShrink: 0,
      }}>
        {idx + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {v.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
          <Link2 size={11} color="rgba(255,255,255,0.3)" />
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
            {v.video_url}
          </span>
        </div>
        {v.note && (
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem', fontStyle: 'italic' }}>
            {v.note}
          </div>
        )}
      </div>
      <button onClick={onDelete} style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}>
        <Trash2 size={14} color="#ef4444" />
      </button>
    </div>
  )
}

function Stat({ icon, value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
      {icon}
      <span style={{ fontWeight: 700, color: '#fff' }}>{value}</span>
      <span>{label}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '1.25rem', maxWidth: 430, margin: '0 auto' }}>
      <div className="skeleton" style={{ height: 130, borderRadius: 16, marginBottom: '1rem' }} />
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14, marginBottom: '0.5rem' }} />)}
    </div>
  )
}

const iconBtnStyle = {
  width: 38, height: 38, borderRadius: '50%',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
}
