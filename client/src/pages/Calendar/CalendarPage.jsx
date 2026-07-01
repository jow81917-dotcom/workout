import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { calendarApi } from '../../api'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'

const STATUS_COLOR = { completed: '#10b981', upcoming: '#6366f1', missed: '#ef4444', in_progress: '#f59e0b', skipped: '#64748b' }

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState(null)

  const { data: occurrences = [] } = useQuery({
    queryKey: ['calendar', current.getMonth() + 1, current.getFullYear()],
    queryFn: () => calendarApi.month(current.getMonth() + 1, current.getFullYear()).then((r) => r.data),
  })

  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  const occsForDay = (day) =>
    occurrences.filter((o) => isSameDay(new Date(o.scheduled_date + 'T00:00:00'), day))

  const selectedOccs = selected ? occsForDay(selected) : []

  return (
    <div className="page-enter" style={{ padding: '1.25rem', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Calendar</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-ghost" style={{ padding: '0.4rem' }} onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', minWidth: 100, textAlign: 'center' }}>
            {format(current, 'MMMM yyyy')}
          </span>
          <button className="btn-ghost" style={{ padding: '0.4rem' }} onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--color-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            {s}
          </div>
        ))}
      </div>

      {/* Day Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.25rem', marginBottom: '0.4rem' }}>
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-muted)', fontWeight: 600, padding: '0.25rem' }}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '0.25rem' }}>
        {days.map((day) => {
          const dayOccs = occsForDay(day)
          const isCurrentMonth = isSameMonth(day, current)
          const today = isToday(day)
          const sel = selected && isSameDay(day, selected)

          return (
            <button key={day.toISOString()} onClick={() => setSelected(sel ? null : day)}
              style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '0.15rem', borderRadius: 10, border: '2px solid',
                borderColor: sel ? '#6366f1' : today ? 'rgba(99,102,241,0.4)' : 'transparent',
                background: sel ? 'rgba(99,102,241,0.15)' : today ? 'rgba(99,102,241,0.08)' : 'transparent',
                cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: '0.8rem', fontWeight: today ? 700 : 400, color: isCurrentMonth ? 'var(--color-text)' : 'var(--color-muted)' }}>
                {format(day, 'd')}
              </span>
              {/* Dots */}
              <div style={{ display: 'flex', gap: '0.15rem', height: 6 }}>
                {dayOccs.slice(0,3).map((o) => (
                  <div key={o.id} className="cal-dot" style={{ background: STATUS_COLOR[o.status] || '#6366f1' }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected Day Occurrences */}
      {selected && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>
            {format(selected, 'EEEE, MMMM d')}
          </h3>
          {selectedOccs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              No workouts on this day
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedOccs.map((occ) => (
                <Link key={occ.id} to={`/workouts/${occ.workout_id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: 4, height: 48, borderRadius: 2, background: STATUS_COLOR[occ.status] || '#6366f1', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{occ.workout_title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                        {occ.scheduled_time?.slice(0,5)} • {occ.category_name}
                      </div>
                    </div>
                    <span className={`badge badge-${occ.status === 'completed' ? 'success' : occ.status === 'missed' ? 'danger' : 'primary'}`}>
                      {occ.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
