// app/favorites/page.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bookmark, BookmarkX, ArrowLeft, Loader2,
  MapPin, Calendar, ChevronRight, Send, Zap
} from 'lucide-react'
import { useApp } from '@/lib/context/AppContext'
import { getSavedJobs, unsaveJob, getApplyKit } from '@/lib/api'
import ApplyPanel from '@/components/ApplyPanel'

// ── Grade badge colors ─────────────────────────────────────
const GRADE_COLORS = {
  A: { bg: 'rgba(22,163,74,0.15)',   text: '#4ADE80',  border: 'rgba(22,163,74,0.3)'   },
  B: { bg: 'rgba(59,130,246,0.15)',  text: '#93C5FD',  border: 'rgba(59,130,246,0.3)'  },
  C: { bg: 'rgba(249,115,22,0.15)',  text: '#FDB97D',  border: 'rgba(249,115,22,0.3)'  },
  D: { bg: 'rgba(107,114,128,0.15)', text: '#D1D5DB',  border: 'rgba(107,114,128,0.3)' },
}

function FavoriteJobCard({ job, onRemove, onApply, onViewDetails }) {
  const [removing, setRemoving] = useState(false)

  const grade  = job.grade || 'C'
  const gc     = GRADE_COLORS[grade] || GRADE_COLORS.C
  const skills = job.matched_skills || []
  const missing= job.missing_skills || []

  const handleRemove = async (e) => {
    e.stopPropagation()
    setRemoving(true)
    await onRemove(job.title, job.company)
    // Component unmounts after removal, no need to reset
  }

  return (
    <div
      className="rounded-xl border transition-all duration-200 overflow-hidden"
      style={{
        backgroundColor: '#1E293B',
        borderColor    : '#334155',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#7C3AED'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
    >
      {/* Top strip — grade + match */}
      <div className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid #334155', backgroundColor: 'rgba(15,23,42,0.5)' }}>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: gc.bg, color: gc.text, border: `1px solid ${gc.border}` }}
          >
            Grade {grade}
          </span>
          <span className="text-sm font-semibold" style={{ color: gc.text }}>
            {job.match_score || 0}% match
          </span>
        </div>

        {/* Remove from favorites */}
        <button
          onClick={handleRemove}
          disabled={removing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all duration-150"
          style={{ color: '#64748B', backgroundColor: 'transparent' }}
          onMouseEnter={e => {
            e.currentTarget.style.color           = '#FCA5A5'
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color           = '#64748B'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title="Remove from favorites"
        >
          {removing
            ? <Loader2 size={12} className="animate-spin" />
            : <BookmarkX size={13} />
          }
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>

      {/* Main card body */}
      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-bold mb-1 leading-tight" style={{ color: '#F8FAFC' }}>
            {job.title}
          </h3>
          <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>
            {job.company}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            {job.location && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#64748B' }}>
                <MapPin size={11} />
                {job.location}
              </span>
            )}
            {job.experience_level && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#0F172A', color: '#94A3B8', border: '1px solid #334155' }}>
                {job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)} level
              </span>
            )}
            {job.saved_at && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#475569' }}>
                <Calendar size={11} />
                Saved {new Date(job.saved_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short'
                })}
              </span>
            )}
          </div>
        </div>

        {/* Match reason */}
        {job.match_reason && (
          <p className="text-xs mb-4 leading-relaxed" style={{ color: '#64748B' }}>
            {job.match_reason}
          </p>
        )}

        {/* Matched skills */}
        {skills.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium mb-1.5" style={{ color: '#475569' }}>
              Matched skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 6).map(skill => (
                <span key={skill}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(22,163,74,0.12)',
                    color          : '#4ADE80',
                    border         : '1px solid rgba(22,163,74,0.2)',
                  }}>
                  ✓ {skill}
                </span>
              ))}
              {skills.length > 6 && (
                <span className="px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: '#0F172A', color: '#64748B' }}>
                  +{skills.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Missing skills */}
        {missing.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium mb-1.5" style={{ color: '#475569' }}>
              Skills to learn
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missing.slice(0, 4).map(skill => (
                <span key={skill}
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    color          : '#FCA5A5',
                    border         : '1px solid rgba(239,68,68,0.15)',
                  }}>
                  ✗ {skill}
                </span>
              ))}
              {missing.length > 4 && (
                <span className="px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: '#0F172A', color: '#64748B' }}>
                  +{missing.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid #334155' }}>
          {/* View Details */}
          <button
            onClick={() => onViewDetails(job)}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              backgroundColor: 'transparent',
              border         : '1px solid #334155',
              color          : '#94A3B8',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#334155'
              e.currentTarget.style.color           = '#F8FAFC'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color           = '#94A3B8'
            }}
          >
            View Details
            <ChevronRight size={14} />
          </button>

          {/* Apply Now */}
          <button
            onClick={() => onApply(job)}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150"
            style={{ backgroundColor: '#7C3AED' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#6D28D9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7C3AED'}
          >
            <Send size={13} />
            Apply Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FavoritesPage() {
  const router = useRouter()
  const { user_id } = useApp()

  const [jobs,        setJobs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [applyData,   setApplyData]   = useState(null)
  const [applyLoading,setApplyLoading]= useState(null)  // job key being loaded

  // ── Auth guard ─────────────────────────────────────────
  useEffect(() => {
    if (!user_id) { router.push('/auth'); return }
    fetchFavorites()
  }, [user_id])

  const fetchFavorites = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getSavedJobs(user_id)
      setJobs(data.jobs || [])
    } catch (err) {
      setError('Failed to load favorites. Please try again.')
      console.error('[Favorites] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Remove from favorites ──────────────────────────────
  const handleRemove = async (title, company) => {
    try {
      await unsaveJob(user_id, title, company)
      setJobs(prev => prev.filter(j => !(j.title === title && j.company === company)))
    } catch (err) {
      console.error('[Favorites] Remove error:', err)
    }
  }

  // ── View Details → navigate to job detail page ─────────
  const handleViewDetails = (job) => {
    const titleSlug   = encodeURIComponent(job.title)
    const companySlug = encodeURIComponent(job.company)
    // Navigate to your existing job detail page
    // Adjust this path to match your actual /jobs/[id] structure
    router.push(`/jobs/detail?title=${titleSlug}&company=${companySlug}&from=favorites`)
  }

  // ── Apply Now → open Apply Panel ──────────────────────
  const handleApply = async (job) => {
    const key = `${job.title}__${job.company}`
    setApplyLoading(key)
    try {
      const data = await getApplyKit(user_id, job.title, job.company)
      setApplyData(data)
    } catch (err) {
      console.error('[Favorites] Apply kit error:', err)
    } finally {
      setApplyLoading(null)
    }
  }

  // ── Skeleton cards while loading ──────────────────────
  const SkeletonCard = () => (
    <div className="rounded-xl border animate-pulse overflow-hidden"
      style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid #334155', backgroundColor: 'rgba(15,23,42,0.5)' }}>
        <div className="h-5 w-24 rounded-full" style={{ backgroundColor: '#334155' }} />
      </div>
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded" style={{ backgroundColor: '#334155' }} />
        <div className="h-4 w-1/2 rounded" style={{ backgroundColor: '#334155' }} />
        <div className="flex gap-2 pt-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-6 w-16 rounded-full" style={{ backgroundColor: '#334155' }} />
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: '#334155' }} />
          <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: '#334155' }} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>

      {/* ── Header bar ──────────────────────────────────── */}
      <header className="border-b" style={{ borderColor: '#334155', backgroundColor: '#1E293B' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: '#94A3B8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <span style={{ color: '#334155' }}>|</span>

            <div className="flex items-center gap-2">
              <Zap size={18} style={{ color: '#7C3AED' }} />
              <span className="font-bold" style={{ color: '#F8FAFC' }}>AI Job Agent</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/jobs')}
            className="text-sm transition-colors"
            style={{ color: '#7C3AED' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            View all matches →
          </button>
        </div>
      </header>

      {/* ── Page content ────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Page title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}>
              <Bookmark size={20} style={{ color: '#A78BFA' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#F8FAFC' }}>
              Saved Jobs
            </h1>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>
            Your personally saved job listings — all private to your account
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border flex gap-3"
            style={{ backgroundColor: '#1a0a0a', borderColor: '#DC2626' }}>
            <p className="text-sm" style={{ color: '#FCA5A5' }}>{error}</p>
            <button onClick={fetchFavorites} className="ml-auto text-sm underline"
              style={{ color: '#FCA5A5' }}>
              Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}>
              <Bookmark size={28} style={{ color: '#7C3AED' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#F8FAFC' }}>
              No saved jobs yet
            </h2>
            <p className="mb-6 max-w-xs mx-auto" style={{ color: '#94A3B8', fontSize: '14px' }}>
              Browse your job matches and click the bookmark icon to save jobs here.
            </p>
            <button
              onClick={() => router.push('/jobs')}
              className="px-6 py-2.5 rounded-lg font-semibold text-white transition-all duration-200"
              style={{ backgroundColor: '#7C3AED' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#6D28D9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7C3AED'}
            >
              View Job Matches →
            </button>
          </div>
        )}

        {/* Jobs grid */}
        {!loading && jobs.length > 0 && (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-4 mb-6 text-sm" style={{ color: '#64748B' }}>
              <span>
                <strong style={{ color: '#F8FAFC' }}>{jobs.length}</strong> saved job{jobs.length !== 1 ? 's' : ''}
              </span>
              <span>·</span>
              <span>
                <strong style={{ color: '#4ADE80' }}>
                  {jobs.filter(j => j.grade === 'A').length}
                </strong> Grade A
              </span>
              <span>·</span>
              <span>
                <strong style={{ color: '#93C5FD' }}>
                  {jobs.filter(j => j.grade === 'B').length}
                </strong> Grade B
              </span>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {jobs.map(job => {
                const jobKey = `${job.title}__${job.company}`
                return (
                  <div key={jobKey} className="relative">
                    {/* Apply loading overlay */}
                    {applyLoading === jobKey && (
                      <div className="absolute inset-0 z-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(15,23,42,0.85)' }}>
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 size={24} className="animate-spin" style={{ color: '#7C3AED' }} />
                          <p className="text-xs" style={{ color: '#94A3B8' }}>
                            Preparing apply kit...
                          </p>
                        </div>
                      </div>
                    )}

                    <FavoriteJobCard
                      job={job}
                      onRemove={handleRemove}
                      onApply={handleApply}
                      onViewDetails={handleViewDetails}
                    />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Apply Panel */}
      {applyData && (
        <ApplyPanel
          applyData={applyData}
          onClose={() => setApplyData(null)}
        />
      )}
    </div>
  )
}