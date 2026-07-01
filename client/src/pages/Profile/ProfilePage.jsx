import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, User, Bell, Lock, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi, notificationApi } from '../../api'
import useAuthStore from '../../store/authStore'

export default function ProfilePage() {
  const qc = useQueryClient()
  const { user, logout, updateUser } = useAuthStore()
  const [editName, setEditName] = useState(user?.name || '')
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' })

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.profile().then(r => r.data),
  })

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => authApi.update({ name: editName }),
    onSuccess: ({ data }) => { updateUser(data); toast.success('Profile updated!') },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  })

  const { mutate: changePassword, isPending: changingPw } = useMutation({
    mutationFn: () => authApi.changePassword(pwForm),
    onSuccess: () => { toast.success('Password changed!'); setPwForm({ currentPassword: '', newPassword: '' }) },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to change password'),
  })

  const { mutate: sendTest } = useMutation({
    mutationFn: () => notificationApi.test(),
    onSuccess: () => toast.success('Test notification sent!'),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed. Enable notifications first.'),
  })

  const handleLogout = () => { logout(); toast.success('Logged out'); }

  const p = profile || user

  return (
    <div className="page-enter" style={{ padding: '1.25rem', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Profile</h1>

      {/* Avatar + Name */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '1.25rem' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {p?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{p?.name}</div>
          <div style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>{p?.email}</div>
          <div style={{ color: 'var(--color-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
            🌍 {p?.timezone} • Joined {p?.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
          </div>
        </div>
      </div>

      {/* Streak Quick View */}
      {(p?.current_streak > 0 || p?.best_streak > 0) && (
        <div className="card" style={{ display: 'flex', gap: '2rem', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f97316' }}>🔥 {p.current_streak}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>Current</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8' }}>{p.best_streak}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>Best</div>
          </div>
        </div>
      )}

      {/* Edit Name */}
      <Section title="Edit Profile" icon={<User size={16} />}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input id="profile-name" className="input" placeholder="Your name" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ flex: 1 }} />
          <button className="btn-primary" onClick={saveProfile} disabled={savingProfile} style={{ padding: '0.75rem 1.25rem', whiteSpace: 'nowrap' }}>
            {savingProfile ? '…' : 'Save'}
          </button>
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Change Password" icon={<Lock size={16} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input id="pw-current" type="password" className="input" placeholder="Current password"
            value={pwForm.currentPassword} onChange={(e) => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
          <input id="pw-new" type="password" className="input" placeholder="New password (min 6 chars)"
            value={pwForm.newPassword} onChange={(e) => setPwForm(f => ({ ...f, newPassword: e.target.value }))} minLength={6} />
          <button className="btn-secondary" onClick={() => changePassword()} disabled={changingPw}>
            {changingPw ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={<Bell size={16} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <NotificationEnableButton />
          <button className="btn-ghost" onClick={sendTest} style={{ justifyContent: 'flex-start' }}>
            Send test notification
          </button>
        </div>
      </Section>

      {/* Logout */}
      <button id="logout-btn" onClick={handleLogout} className="btn-secondary"
        style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }}>
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', color: 'var(--color-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon}{title}
      </div>
      {children}
    </div>
  )
}

function NotificationEnableButton() {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Permission denied')
      const reg = await navigator.serviceWorker.ready
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidKey || vapidKey === 'your_vapid_public_key_here') {
        throw new Error('VAPID key not configured')
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      return notificationApi.subscribe(sub.toJSON())
    },
    onSuccess: () => { toast.success('Notifications enabled! 🔔'); qc.invalidateQueries(['profile']) },
    onError: (err) => toast.error(err.message || 'Failed to enable notifications'),
  })

  const supported = 'Notification' in window && 'serviceWorker' in navigator
  if (!supported) return <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Push notifications not supported in this browser.</p>

  return (
    <button id="enable-notif" className="btn-primary" onClick={() => mutate()} disabled={isPending} style={{ justifyContent: 'flex-start' }}>
      <Bell size={16} /> {isPending ? 'Enabling…' : 'Enable Push Notifications'}
    </button>
  )
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
