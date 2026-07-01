import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, CheckCircle2, SkipForward, ChevronLeft, ChevronRight,
  ExternalLink, AlertCircle, Trophy, Flame,
} from 'lucide-react'
import { workoutApi, calendarApi } from '../../api'

/* ─────────────────────────────────────────────────────────────
   URL → embeddable URL
   Rules:
   • TikTok long URL  → embed/v2/{id}?autoplay=1&loop=1
   • TikTok short URL → cannot resolve server-side; show fallback
   • YouTube / Shorts → embed with autoplay=1&loop=1&playlist=id
   • Everything else  → null → fallback
───────────────────────────────────────────────────────────── */
function buildEmbedUrl(rawUrl) {
  if (!rawUrl) return null
  try {
    // TikTok long: https://www.tiktok.com/@user/video/1234567890
    const ttLong = rawUrl.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/)
    if (ttLong) {
      return `https://www.tiktok.com/embed/v2/${ttLong[1]}?autoplay=1&loop=1`
    }

    // TikTok short (vm.tiktok.com / vt.tiktok.com) — can't embed without resolving
    if (rawUrl.match(/vm\.tiktok\.com|vt\.tiktok\.com/)) return null

    // YouTube standard: watch?v=ID
    const ytStd = rawUrl.match(/youtube\.com\/watch\?v=([^&?/]+)/)
    if (ytStd) {
      return `https://www.youtube.com/embed/${ytStd[1]}?autoplay=1&loop=1&playlist=${ytStd[1]}&rel=0&playsinline=1`
    }

    // YouTube short: youtu.be/ID
    const ytShort = rawUrl.match(/youtu\.be\/([^?/]+)/)
    if (ytShort) {
      return `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1&loop=1&playlist=${ytShort[1]}&rel=0&playsinline=1`
    }

    // YouTube Shorts: /shorts/ID
    const ytShortsPath = rawUrl.match(/youtube\.com\/shorts\/([^?/]+)/)
    if (ytShortsPath) {
      return `https://www.youtube.com/embed/${ytShortsPath[1]}?autoplay=1&loop=1&playlist=${ytShortsPath[1]}&rel=0&playsinline=1`
    }

    // Instagram — blocks iframe entirely
    if (rawUrl.includes('instagram.com')) return null

    return null
  } catch {
    return null
  }
}

function getPlatform(url) {
  if (!url) return 'video'
  if (url.includes('tiktok')) return 'tiktok'
  if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('instagram')) return 'instagram'
  return 'other'
}

/* ─────────────────────────────────────────────────────────────
   localStorage helpers — persist session progress across
   refresh / back navigation
───────────────────────────────────────────────────────────── */
function saveProgress(workoutId, occId, index, statusMap) {
  try {
    const key = `wf_session_${workoutId}_${occId || 'noocc'}`
    localStorage.setItem(key, JSON.stringify({ index, statusMap, ts: Date.now() }))
  } catch { /* ignore */ }
}

function loadProgress(workoutId, occId) {
  try {
    const key = `wf_session_${workoutId}_${occId || 'noocc'}`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Discard if older than 24 h
    if (Date.now() - data.ts > 86400000) { localStorage.removeItem(key); return null }
    return data
  } catch {
    return null
  }
}

function clearProgress(workoutId, occId) {
  try {
    localStorage.removeItem(`wf_session_${workoutId}_${occId || 'noocc'}`)
  } catch { /* ignore */ }
}

/* ─────────────────────────────────────────────────────────────
   Main Session Page
   Routes:
     /session/:workoutId
     /session/:workoutId/occ/:occId
───────────────────────────────────────────────────────────── */
export default function WorkoutSessionPage() {
  const { workoutId, occId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Restore from localStorage on first mount
  const restoredRef = useRef(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [videoStatus, setVideoStatus]   = useState({}) // { [videoId]: 'completed'|'skipped' }
  const [sessionDone, setSessionDone]   = useState(false)
  const [embedError, setEmbedError]     = useState(false)

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => workoutApi.get(workoutId).then(r => r.data),
  })

  // Restore saved progress once workout data arrives
  useEffect(() => {
    if (!workout || restoredRef.current) return
    restoredRef.current = true
    const saved = loadProgress(workoutId, occId)
    if (saved) {
      setCurrentIndex(saved.index || 0)
      setVideoStatus(saved.statusMap || {})
    }
  }, [workout, workoutId, occId])

  // Persist whenever index or status changes
  useEffect(() => {
    if (!workout) return
    saveProgress(workoutId, occId, currentIndex, videoStatus)
  }, [currentIndex, videoStatus, workoutId, occId, workout])

  const { mutate: markVideoProgress } = useMutation({
    mutationFn: ({ videoId, status }) =>
      occId
        ? calendarApi.updateVideoProgress(occId, { video_id: videoId, status, watch_seconds: 0 })
        : Promise.resolve(),
    onSuccess: () => qc.invalidateQueries(['dashboard']),
  })

  const { mutate: markOccurrence } = useMutation({
    mutationFn: ({ status, pct }) =>
      occId
        ? calendarApi.updateStatus(occId, { status, completion_percentage: pct })
        : Promise.resolve(),
    onSuccess: () => {
      qc.invalidateQueries(['dashboard'])
      qc.invalidateQueries(['workout', workoutId])
    },
  })

  const videos = workout?.videos || []
  const currentVideo = videos[currentIndex]
  const total = videos.length

  const completedCount = Object.values(videoStatus).filter(s => s === 'completed').length
  const skippedCount   = Object.values(videoStatus).filter(s => s === 'skipped').length
  const progress = total > 0 ? Math.round(((completedCount + skippedCount) / total) * 100) : 0

  const handleMark = useCallback((status) => {
    if (!currentVideo) return
    const newStatus = { ...videoStatus, [currentVideo.id]: status }
    setVideoStatus(newStatus)
    setEmbedError(false)
    markVideoProgress({ videoId: currentVideo.id, status })

    if (currentIndex < total - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      const doneCount = Object.values(newStatus).filter(s => s === 'completed').length
      const pct = total > 0 ? Math.round((doneCount / total) * 100) : 100
      markOccurrence({ status: 'completed', pct })
      clearProgress(workoutId, occId)
      setSessionDone(true)
    }
  }, [currentVideo, currentIndex, total, videoStatus, markVideoProgress, markOccurrence, workoutId, occId])

  const handlePrev = () => {
    if (currentIndex > 0) { setCurrentIndex(i => i - 1); setEmbedError(false) }
  }
  const handleNext = () => {
    if (currentIndex < total - 1) { setCurrentIndex(i => i + 1); setEmbedError(false) }
  }
  const goToVideo = (i) => { setCurrentIndex(i); setEmbedError(false) }

  /* ── Render states ── */
  if (isLoading) return <SessionSkeleton />

  if (sessionDone) {
    return (
      <CompletionScreen
        workout={workout}
        completedCount={completedCount}
        skippedCount={skippedCount}
        total={total}
        onBack={() => navigate(-1)}
      />
    )
  }

  if (!currentVideo) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={iconBtnStyle}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginLeft: '0.5rem' }}>
            No videos
          </span>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
          <p>No videos in this workout.</p>
          <button className="btn-primary" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const embedUrl  = buildEmbedUrl(currentVideo.video_url)
  const platform  = getPlatform(currentVideo.video_url)
  const showFallback = !embedUrl || embedError

  return (
    <div style={pageStyle}>

      {/* ── Header ── */}
      <div style={headerStyle}>
        <button onClick={() => navigate(-1)} style={iconBtnStyle}>
          <ArrowLeft size={20} color="#fff" />
        </button>
        <div style={{ flex: 1, minWidth: 0, marginLeft: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
            {workout.title}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentVideo.title}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', flexShrink: 0, fontWeight: 600 }}>
          {currentIndex + 1} / {total}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ padding: '0 1.25rem 0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>Progress</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>{progress}%</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'linear-gradient(90deg, #4a90d9, #22c55e)',
            borderRadius: 999, transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
          <span style={{ fontSize: '0.68rem', color: '#22c55e' }}>✓ {completedCount} done</span>
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>⏭ {skippedCount} skipped</span>
        </div>
      </div>

      {/* ── Video player ── */}
      <div style={{ padding: '0 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {showFallback ? (
          <FallbackPlayer
            video={currentVideo}
            platform={platform}
            embedError={embedError}
          />
        ) : (
          /* Fullscreen-style container — fills available width, tall aspect ratio */
          <div style={{
            width: '100%',
            /* TikTok is portrait 9:16, YouTube is landscape 16:9 */
            aspectRatio: platform === 'tiktok' ? '9 / 16' : '16 / 9',
            /* Cap height so controls stay visible on screen */
            maxHeight: platform === 'tiktok' ? 'calc(100dvh - 280px)' : 'calc(100dvh - 380px)',
            minHeight: platform === 'tiktok' ? 260 : 180,
            background: '#000',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
          }}>
            <iframe
              key={`${embedUrl}-${currentIndex}`}   /* force remount on video change */
              src={embedUrl}
              title={currentVideo.title}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              onError={() => setEmbedError(true)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Notes */}
        {currentVideo.note && (
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '0.75rem 1rem',
            fontSize: '0.82rem',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.5,
          }}>
            📝 {currentVideo.note}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            style={{ ...actionBtnStyle, opacity: currentIndex === 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={18} /><span>Prev</span>
          </button>
          <button
            onClick={() => handleMark('completed')}
            style={{
              ...actionBtnStyle,
              background: 'rgba(34,197,94,0.2)',
              border: '1px solid rgba(34,197,94,0.35)',
              color: '#22c55e',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={18} /><span>Done</span>
          </button>
          <button
            onClick={() => handleMark('skipped')}
            style={{ ...actionBtnStyle }}
          >
            <SkipForward size={18} /><span>Skip</span>
          </button>
        </div>

        {/* Next shortcut */}
        {currentIndex < total - 1 && (
          <button
            onClick={handleNext}
            style={{
              ...actionBtnStyle,
              justifyContent: 'center',
              background: 'rgba(74,144,217,0.15)',
              border: '1px solid rgba(74,144,217,0.3)',
              color: '#6fb3f7',
            }}
          >
            Next Video <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* ── Queue ── */}
      <div style={{ padding: '1rem 1.25rem 0', marginTop: '0.5rem' }}>
        <p style={{
          fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
          marginBottom: '0.5rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Queue
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {videos.map((v, i) => {
            const st = videoStatus[v.id]
            const isActive = i === currentIndex
            return (
              <button
                key={v.id}
                onClick={() => goToVideo(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.875rem',
                  background: isActive ? 'rgba(74,144,217,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? 'rgba(74,144,217,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  width: '100%', transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: st === 'completed' ? '#22c55e' : st === 'skipped' ? 'rgba(255,255,255,0.15)' : isActive ? '#4a90d9' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                }}>
                  {st === 'completed' ? '✓' : st === 'skipped' ? '—' : i + 1}
                </span>
                <span style={{
                  fontSize: '0.82rem', fontWeight: isActive ? 600 : 400, flex: 1,
                  color: st === 'completed' ? 'rgba(255,255,255,0.45)' : isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textDecoration: st === 'skipped' ? 'line-through' : 'none',
                }}>
                  {v.title}
                </span>
                {st && (
                  <span style={{ fontSize: '0.68rem', color: st === 'completed' ? '#22c55e' : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                    {st}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ height: '1.5rem' }} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Fallback — shown when iframe embed is not possible
   Never opens TikTok app. Opens as external reference only.
───────────────────────────────────────────────────────────── */
function FallbackPlayer({ video, platform, embedError }) {
  const isTikTokShort = video.video_url?.match(/vm\.tiktok\.com|vt\.tiktok\.com/)
  const isInstagram   = platform === 'instagram'

  let title = 'Playback unavailable for this reference'
  let body  = 'This platform does not allow in-app embedding.'

  if (embedError) {
    title = 'Playback unavailable for this reference'
    body  = 'The video could not be loaded inside the app.'
  } else if (isTikTokShort) {
    title = 'TikTok short link detected'
    body  = 'Short TikTok links cannot be embedded directly. Open as a reference, then return here to continue.'
  } else if (isInstagram) {
    title = 'Instagram does not allow embedding'
    body  = 'Open as a reference, watch the exercise, then return here to mark it done.'
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      padding: '1.75rem 1.25rem',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '0.875rem', textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: embedError ? 'rgba(239,68,68,0.15)' : 'rgba(74,144,217,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertCircle size={24} color={embedError ? '#ef4444' : '#6fb3f7'} />
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '0.35rem' }}>
          {title}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          {body}
        </p>
      </div>
      {/* Opens in browser tab — never opens the TikTok native app */}
      <a
        href={video.video_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.65rem 1.25rem',
          background: 'rgba(74,144,217,0.15)',
          border: '1px solid rgba(74,144,217,0.35)',
          borderRadius: 12, color: '#6fb3f7', fontWeight: 600,
          fontSize: '0.85rem', textDecoration: 'none',
        }}
      >
        <ExternalLink size={15} />
        Open Reference
      </a>
      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
        Return here after watching to mark it done.
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Completion screen
───────────────────────────────────────────────────────────── */
function CompletionScreen({ workout, completedCount, skippedCount, total, onBack }) {
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 100
  return (
    <div style={{
      ...pageStyle,
      justifyContent: 'center', alignItems: 'center',
      textAlign: 'center', padding: '2rem 1.5rem',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(74,144,217,0.25))',
        border: '2px solid rgba(34,197,94,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.5rem',
      }}>
        <Trophy size={36} color="#22c55e" />
      </div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
        Workout Complete!
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        {workout?.title}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', width: '100%', marginBottom: '2rem' }}>
        {[
          { label: 'Completed', value: completedCount, color: '#22c55e' },
          { label: 'Skipped',   value: skippedCount,   color: 'rgba(255,255,255,0.4)' },
          { label: 'Score',     value: `${pct}%`,      color: '#6fb3f7' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '0.875rem 0.5rem',
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: '#f97316' }}>
        <Flame size={18} />
        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Streak updated!</span>
      </div>
      <button className="btn-primary" onClick={onBack} style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}>
        Back to Workouts
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────────────────────── */
function SessionSkeleton() {
  return (
    <div style={pageStyle}>
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="skeleton" style={{ height: 50, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 56, borderRadius: 12 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 48, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Shared styles — unchanged from original
───────────────────────────────────────────────────────────── */
const pageStyle = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(160deg, #0d1b2e 0%, #0a2240 50%, #0d1530 100%)',
  paddingBottom: '1rem',
  maxWidth: 430,
  margin: '0 auto',
}

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '3rem 1.25rem 0.75rem',
  gap: '0.25rem',
}

const iconBtnStyle = {
  width: 40, height: 40,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
}

const actionBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
  padding: '0.75rem 0.5rem',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.07)',
  color: '#fff',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
}
