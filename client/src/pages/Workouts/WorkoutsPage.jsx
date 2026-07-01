import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Dumbbell, Video, Calendar, ChevronRight, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { workoutApi } from '../../api'

const REPEAT_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', once: 'Once', custom: 'Custom' }

export default function WorkoutsPage() {
  const qc = useQueryClient()
  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => workoutApi.list().then((r) => r.data),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id) => workoutApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(['workouts']); toast.success('Workout deleted') },
  })

  return (
    <div className="page-enter" style={{ padding: '1.25rem', maxWidth: 480, margin: '0 auto', paddingTop: '3.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>My Workouts</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', marginTop: 2 }}>
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/workouts/new" className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
          <Plus size={16} /> New
        </Link>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
        </div>
      ) : workouts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🏋️‍♂️</div>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No workouts yet</h3>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Create your first workout and add your favourite videos to it.
          </p>
          <Link to="/workouts/new" className="btn-primary">Create Workout</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} onDelete={() => del(w.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function WorkoutCard({ workout: w, onDelete }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Color accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: w.category_color || '#6366f1', borderRadius: '14px 0 0 14px' }} />
      <div style={{ paddingLeft: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Link to={`/workouts/${w.id}`} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</h3>
          </Link>
          <button onClick={onDelete} className="btn-ghost" style={{ padding: '0.25rem', color: 'var(--color-danger)', flexShrink: 0 }}>
            <Trash2 size={15} />
          </button>
        </div>

        {w.description && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {w.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {w.category_name && (
            <span className="badge badge-primary" style={{ borderRadius: 6, fontSize: '0.7rem' }}>
              {w.category_name}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            <Video size={13} /> {w.video_count} video{w.video_count !== 1 ? 's' : ''}
          </span>
          {w.repeat_interval && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              <Calendar size={13} /> {REPEAT_LABELS[w.repeat_interval] || w.repeat_interval}
            </span>
          )}
          {w.exercise_type === 'limited' && w.target_sessions && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              {w.completed_sessions}/{w.target_sessions} sessions
            </span>
          )}
        </div>

        {w.exercise_type === 'limited' && w.target_sessions > 0 && (
          <div className="progress-bar" style={{ marginTop: '0.75rem' }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, (w.completed_sessions / w.target_sessions) * 100)}%` }} />
          </div>
        )}

        <Link to={`/workouts/${w.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary-h)', fontSize: '0.78rem', fontWeight: 600, marginTop: '0.75rem', textDecoration: 'none' }}>
          Open <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  )
}
