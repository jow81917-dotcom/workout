import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Type, AlignLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { workoutApi } from '../../api'

export default function EditWorkoutModal({ workout, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    title: workout.title || '',
    description: workout.description || '',
    category_id: workout.category_id || '',
    exercise_type: workout.exercise_type || 'repeat',
    repeat_type: workout.repeat_type || 'weekly',
    target_sessions: workout.target_sessions || '',
    strict_completion: workout.strict_completion || false,
    active: workout.active ?? true,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => workoutApi.categories().then((r) => r.data),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () => workoutApi.update(workout.id, {
      ...form,
      category_id: form.category_id || null,
      target_sessions: form.target_sessions ? Number(form.target_sessions) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['workout', workout.id])
      qc.invalidateQueries(['workouts'])
      toast.success('Workout updated!')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update workout'),
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Edit Workout</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.3rem' }}><X size={20} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="label">Workout Title *</label>
            <div style={{ position: 'relative' }}>
              <Type size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input type="text" className="input" placeholder="e.g. Upper Body" style={{ paddingLeft: '2.25rem' }}
                value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <div style={{ position: 'relative' }}>
              <AlignLeft size={15} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--color-muted)' }} />
              <textarea className="input" placeholder="Brief description..." rows={2} style={{ paddingLeft: '2.25rem', resize: 'none' }}
                value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label">Category</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => set('category_id', '')}
                className={form.category_id === '' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>None</button>
              {categories.map((cat) => (
                <button key={cat.id} type="button"
                  onClick={() => set('category_id', cat.id)}
                  style={{
                    padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: 8,
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

          {/* Active status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="ew-active" checked={form.active} onChange={(e) => set('active', e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#6366f1' }} />
            <label htmlFor="ew-active" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>Active (uncheck to archive)</label>
          </div>

          <button type="submit" className="btn-primary" disabled={isPending} style={{ padding: '0.875rem' }}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
