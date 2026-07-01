import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Link2, Type, FileText, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { videoApi } from '../../api'

export default function AddVideoModal({ workoutId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', video_url: '', note: '', estimated_duration: '' })

  const { mutate, isPending } = useMutation({
    mutationFn: () => videoApi.add(workoutId, {
      ...form,
      estimated_duration: form.estimated_duration ? Number(form.estimated_duration) * 60 : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['workout', workoutId])
      toast.success('Video added!')
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add video'),
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Auto-fill title from URL domain
  const handleUrlChange = (url) => {
    set('video_url', url)
    if (!form.title && url.includes('tiktok')) set('title', 'TikTok Exercise')
    else if (!form.title && url.includes('youtube')) set('title', 'YouTube Exercise')
    else if (!form.title && url.includes('instagram')) set('title', 'Instagram Exercise')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Add Video</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.3rem' }}><X size={20} /></button>
        </div>

        {/* URL hint */}
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          💡 Supports TikTok, YouTube, Instagram, or any video URL
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Video URL *</label>
            <div style={{ position: 'relative' }}>
              <Link2 size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input id="av-url" type="url" className="input" placeholder="https://www.tiktok.com/..."
                style={{ paddingLeft: '2.25rem' }}
                value={form.video_url} onChange={(e) => handleUrlChange(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Title *</label>
            <div style={{ position: 'relative' }}>
              <Type size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input id="av-title" type="text" className="input" placeholder="e.g. Warmup Stretch"
                style={{ paddingLeft: '2.25rem' }}
                value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Duration (minutes)</label>
            <div style={{ position: 'relative' }}>
              <Clock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input id="av-duration" type="number" className="input" placeholder="e.g. 5"
                style={{ paddingLeft: '2.25rem' }}
                min={0} value={form.estimated_duration} onChange={(e) => set('estimated_duration', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <div style={{ position: 'relative' }}>
              <FileText size={15} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--color-muted)' }} />
              <textarea className="input" placeholder="Any extra instructions…" rows={2}
                style={{ paddingLeft: '2.25rem', resize: 'none' }}
                value={form.note} onChange={(e) => set('note', e.target.value)} />
            </div>
          </div>

          <button id="av-submit" type="submit" className="btn-primary" disabled={isPending} style={{ padding: '0.875rem' }}>
            {isPending ? 'Adding…' : 'Add Video'}
          </button>
        </form>
      </div>
    </div>
  )
}
