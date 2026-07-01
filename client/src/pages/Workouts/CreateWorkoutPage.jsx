import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Dumbbell, RefreshCw, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import { workoutApi } from '../../api'

export default function CreateWorkoutPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: '', description: '', category_id: '',
    exercise_type: 'repeat', repeat_type: 'weekly', target_sessions: '',
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => workoutApi.categories().then((r) => r.data),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () => workoutApi.create({
      ...form,
      category_id: form.category_id || null,
      target_sessions: form.target_sessions ? Number(form.target_sessions) : null,
    }),
    onSuccess: ({ data }) => {
      qc.invalidateQueries(['workouts'])
      toast.success('Workout created!')
      navigate(`/workouts/${data.id}`)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create workout'),
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="page-enter" style={{ padding: '1.25rem', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '0.4rem' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>New Workout</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>Set up your exercise plan</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Title */}
        <div>
          <label className="label">Workout Title *</label>
          <input id="cw-title" type="text" className="input" placeholder="e.g. Upper Body Blast"
            value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea className="input" placeholder="Brief description (optional)" rows={2}
            value={form.description} onChange={(e) => set('description', e.target.value)}
            style={{ resize: 'vertical', minHeight: 72 }} />
        </div>

        {/* Category */}
        <div>
          <label className="label">Category</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => set('category_id', '')}
              className={form.category_id === '' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}>None</button>
            {categories.map((cat) => (
              <button key={cat.id} type="button"
                onClick={() => set('category_id', cat.id)}
                style={{
                  padding: '0.4rem 0.875rem', fontSize: '0.8rem', borderRadius: 8,
                  background: form.category_id === cat.id ? cat.color : 'transparent',
                  border: `2px solid ${cat.color}`,
                  color: form.category_id === cat.id ? 'white' : cat.color,
                  cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                }}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise Type */}
        <div>
          <label className="label">Exercise Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <TypeCard id="type-repeat" icon={<RefreshCw size={20} />} title="Repeat" subtitle="Runs on schedule indefinitely"
              active={form.exercise_type === 'repeat'} onClick={() => set('exercise_type', 'repeat')} />
            <TypeCard id="type-limited" icon={<Target size={20} />} title="Limited" subtitle="Fixed number of sessions"
              active={form.exercise_type === 'limited'} onClick={() => set('exercise_type', 'limited')} />
          </div>
        </div>

        {/* Repeat Type (if repeat) */}
        {form.exercise_type === 'repeat' && (
          <div>
            <label className="label">Repeat Frequency</label>
            <select id="cw-repeat-type" className="input" value={form.repeat_type} onChange={(e) => set('repeat_type', e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom days</option>
            </select>
          </div>
        )}

        {/* Target Sessions (if limited) */}
        {form.exercise_type === 'limited' && (
          <div>
            <label className="label">Target Sessions</label>
            <input id="cw-target" type="number" className="input" placeholder="e.g. 10"
              min={1} value={form.target_sessions} onChange={(e) => set('target_sessions', e.target.value)} />
          </div>
        )}

        <button id="cw-submit" type="submit" className="btn-primary" disabled={isPending}
          style={{ padding: '0.9rem', fontSize: '1rem', marginTop: '0.5rem' }}>
          {isPending ? 'Creating…' : 'Create Workout'}
        </button>
      </form>
    </div>
  )
}

function TypeCard({ id, icon, title, subtitle, active, onClick }) {
  return (
    <button id={id} type="button" onClick={onClick} style={{
      padding: '1rem', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
      background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
      border: active ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.08)',
      transition: 'all 0.2s',
    }}>
      <div style={{ color: active ? '#818cf8' : 'var(--color-muted)', marginBottom: '0.4rem' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: active ? '#f1f5f9' : 'var(--color-muted)' }}>{title}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>{subtitle}</div>
    </button>
  )
}
