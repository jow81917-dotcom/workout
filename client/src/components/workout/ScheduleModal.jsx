import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Clock, Calendar, Bell, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { scheduleApi } from '../../api'

const DAYS = [
  { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }, { label: 'Sun', value: 7 },
]

export default function ScheduleModal({ workoutId, existing, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!existing

  const [form, setForm] = useState({
    start_date: existing?.start_date?.slice(0,10) || new Date().toISOString().split('T')[0],
    end_date: existing?.end_date?.slice(0,10) || '',
    scheduled_time: existing?.scheduled_time?.slice(0,5) || '07:00',
    timezone: existing?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    repeat_interval: existing?.repeat_interval || 'weekly',
    days_of_week: existing?.days_of_week || [],
    notification_before_minutes: existing?.notification_before_minutes ?? 15,
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const toggleDay = (d) => set('days_of_week', form.days_of_week.includes(d)
    ? form.days_of_week.filter((x) => x !== d)
    : [...form.days_of_week, d]
  )

  const { mutate, isPending } = useMutation({
    mutationFn: () => isEdit
      ? scheduleApi.update(existing.id, form)
      : scheduleApi.create(workoutId, form),
    onSuccess: () => {
      qc.invalidateQueries(['workout', workoutId])
      toast.success(isEdit ? 'Schedule updated!' : 'Schedule created!')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save schedule'),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{isEdit ? 'Edit' : 'Set'} Schedule</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.3rem' }}><X size={20} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Time */}
          <div>
            <label className="label"><Clock size={13} style={{ display: 'inline', marginRight: 4 }} />Time</label>
            <input id="sc-time" type="time" className="input" value={form.scheduled_time}
              onChange={(e) => set('scheduled_time', e.target.value)} required />
          </div>

          {/* Repeat */}
          <div>
            <label className="label"><RefreshCw size={13} style={{ display: 'inline', marginRight: 4 }} />Repeat</label>
            <select id="sc-repeat" className="input" value={form.repeat_interval} onChange={(e) => set('repeat_interval', e.target.value)}>
              <option value="once">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Day picker (weekly) */}
          {form.repeat_interval === 'weekly' && (
            <div>
              <label className="label">Days of Week</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {DAYS.map((d) => (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                    style={{
                      width: 44, height: 44, borderRadius: 10, fontWeight: 700, fontSize: '0.8rem',
                      cursor: 'pointer', border: '2px solid',
                      borderColor: form.days_of_week.includes(d.value) ? '#6366f1' : 'rgba(255,255,255,0.1)',
                      background: form.days_of_week.includes(d.value) ? 'rgba(99,102,241,0.2)' : 'transparent',
                      color: form.days_of_week.includes(d.value) ? '#818cf8' : 'var(--color-muted)',
                      transition: 'all 0.15s',
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label"><Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />Start Date</label>
              <input id="sc-start" type="date" className="input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
            </div>
            <div>
              <label className="label">End Date</label>
              <input id="sc-end" type="date" className="input" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>

          {/* Notification Offset */}
          <div>
            <label className="label"><Bell size={13} style={{ display: 'inline', marginRight: 4 }} />Notify Me</label>
            <select id="sc-notify" className="input" value={form.notification_before_minutes}
              onChange={(e) => set('notification_before_minutes', Number(e.target.value))}>
              <option value={0}>At workout time</option>
              <option value={5}>5 minutes before</option>
              <option value={10}>10 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
            </select>
          </div>

          <button id="sc-submit" type="submit" className="btn-primary" disabled={isPending} style={{ padding: '0.875rem' }}>
            {isPending ? 'Saving…' : isEdit ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </form>
      </div>
    </div>
  )
}
