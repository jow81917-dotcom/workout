import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, Dumbbell, User, Mail, Lock, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../api'
import useAuthStore from '../../store/authStore'
import bgImg from '../../assets/back2.png'

const TIMEZONES = [
  'UTC','America/New_York','America/Los_Angeles','America/Chicago',
  'Europe/London','Europe/Paris','Europe/Berlin','Asia/Dubai',
  'Asia/Kolkata','Asia/Tokyo','Asia/Singapore','Australia/Sydney',
  'Africa/Cairo','Africa/Nairobi',
]

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', timezone: 'UTC' })
  const [show, setShow] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.token)
      toast.success(`Welcome to WorkoutFlow, ${data.user.name}! 🎉`)
      navigate('/')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Registration failed'),
  })

  const submit = (e) => { e.preventDefault(); mutate() }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background image */}
      <img
        src={bgImg}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, rgba(10,20,40,0.82) 0%, rgba(8,16,34,0.88) 100%)',
        zIndex: 1,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', boxShadow: '0 8px 32px rgba(168,85,247,0.4)',
          }}>
            <Dumbbell size={32} color="white" />
          </div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>WorkoutFlow</h1>
          <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>Start your fitness journey</p>
        </div>

        {/* Card */}
        <div className="glass" style={{ width: '100%', maxWidth: 420, padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>Create your account</h2>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            It's free and takes 30 seconds
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Name */}
            <div>
              <label className="label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input id="reg-name" type="text" className="input" placeholder="Alex Johnson"
                  style={{ paddingLeft: '2.25rem' }}
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input id="reg-email" type="email" className="input" placeholder="you@example.com"
                  style={{ paddingLeft: '2.25rem' }}
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input id="reg-password" type={show ? 'text' : 'password'} className="input" placeholder="Min. 6 characters"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.75rem' }}
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required minLength={6} />
                <button type="button" onClick={() => setShow(!show)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)',
                }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="label">Timezone</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
                <select id="reg-timezone" className="input" style={{ paddingLeft: '2.25rem', cursor: 'pointer' }}
                  value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>

            <button id="reg-submit" type="submit" className="btn-primary" disabled={isPending}
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.875rem' }}>
              {isPending ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary-h)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
