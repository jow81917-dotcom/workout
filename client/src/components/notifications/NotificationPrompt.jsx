import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { notificationApi } from '../../api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function NotificationPrompt({ compact = false }) {
  const [dismissed, setDismissed] = useState(false)
  const qc = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') throw new Error('Permission denied')
      const reg = await navigator.serviceWorker.ready
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidKey || vapidKey === 'your_vapid_public_key_here') {
        throw new Error('Add VITE_VAPID_PUBLIC_KEY to client/.env')
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      return notificationApi.subscribe(sub.toJSON())
    },
    onSuccess: () => { toast.success('Notifications enabled! 🔔'); qc.invalidateQueries(['profile']) },
    onError: (err) => toast.error(err.message),
  })

  if (!('Notification' in window) || Notification.permission === 'granted' || dismissed) return null

  if (compact) {
    return (
      <button id="notif-compact-btn" className="btn-secondary" onClick={() => mutate()} disabled={isPending}
        style={{ padding: '0.5rem', position: 'relative' }} title="Enable notifications">
        <Bell size={18} />
        <span style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
      </button>
    )
  }

  return (
    <div className="card" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Bell size={20} color="#818cf8" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Enable Notifications</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
            Get reminded when your workout is ready
          </p>
          <button id="notif-enable-btn" className="btn-primary" onClick={() => mutate()} disabled={isPending}
            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}>
            {isPending ? 'Enabling…' : 'Enable Notifications'}
          </button>
        </div>
        <button onClick={() => setDismissed(true)} className="btn-ghost" style={{ padding: '0.2rem', flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
