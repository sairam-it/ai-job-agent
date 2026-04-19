"use client"

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronRight, 
  MapPin, 
  Briefcase, 
  Calendar, 
  ExternalLink, 
  Bookmark,
  BookmarkCheck,
  FileText,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { GradeBadge } from '@/components/GradeBadge'
import { MatchRing } from '@/components/MatchRing'
import { SkillChip } from '@/components/SkillChip'
import { SkeletonJobDetail } from '@/components/SkeletonCard'
import { useToast } from '@/components/ToastProvider'
import { getJobDetail, getApplyKit } from '@/lib/api'
import { useApp } from '@/lib/context/AppContext'
import ApplyPanel from '@/components/ApplyPanel'

export default function JobDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const { user_id: contextUserId } = useApp() // Get user_id from context

  const title = decodeURIComponent(params.id || '')
  const company = searchParams.get('company') || ''
  const user_id = searchParams.get('user_id') || contextUserId // Fallback to context

  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)

  // New Apply Logic States
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyData, setApplyData] = useState(null)
  const [applyError, setApplyError] = useState('')

  useEffect(() => {
    if (!user_id || !title || !company) {
      router.push('/jobs')
      return
    }

    const fetchJob = async () => {
      setIsLoading(true)
      try {
        const data = await getJobDetail(user_id, title, company)
        setJob(data)
      } catch (err) {
        console.error('Fetch job detail error:', err)
        toast.error('Failed to load job details')
        router.push('/jobs')
      } finally {
        setIsLoading(false)
      }
    }

    fetchJob()
  }, [user_id, title, company, router, toast])

  const getCompanyColor = (name) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-teal-500']
    const index = (name?.charCodeAt(0) || 0) % colors.length
    return colors[index]
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
    toast.info(isSaved ? 'Job removed from saved' : 'Job saved!')
  }

  // Combined Advanced Apply Logic
  const handleApply = async () => {
    setApplyError('')
    setApplyLoading(true)
    try {
      const data = await getApplyKit(user_id, job.title, job.company)
      setApplyData(data)
      toast.success('Apply Kit prepared successfully!')
    } catch (err) {
      setApplyError('Failed to prepare apply kit. Please try again.')
      toast.error('Could not prepare application materials.')
      console.error(err)
    } finally {
      setApplyLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A]">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="h-5 w-48 bg-[#334155] rounded animate-shimmer mb-8" />
          <div className="grid lg:grid-cols-[1fr_350px] gap-6">
            <SkeletonJobDetail />
            <div className="space-y-6">
              <div className="bg-[#1E293B] rounded-xl p-6 h-64 animate-shimmer" />
              <div className="bg-[#1E293B] rounded-xl p-6 h-48 animate-shimmer" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!job) return null

  const matchedSkills = Array.isArray(job.matched_skills) ? job.matched_skills : []
  const missingSkills = Array.isArray(job.missing_skills) ? job.missing_skills : []
  const requiredSkills = Array.isArray(job.required_skills) ? job.required_skills : []
  const matchedCount = matchedSkills.length
  const totalSkillsCount = matchedCount + missingSkills.length

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link href="/jobs" className="text-[#94A3B8] hover:text-white transition-colors">
            Jobs
          </Link>
          <ChevronRight className="w-4 h-4 text-[#64748B]" />
          <span className="text-white truncate max-w-xs">{job.title}</span>
        </nav>

        {/* Back Button */}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors mb-6"
        >
          ← Back to Jobs
        </Link>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-[1fr_350px] gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Job Header Card */}
            <div className="bg-[#1E293B] rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <GradeBadge grade={job.grade} size="large" />
                <div>
                  <h1 className="text-white text-2xl md:text-3xl font-bold mb-2">
                    {job.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-[#94A3B8]">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 ${getCompanyColor(job.company)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                        {job.company?.charAt(0)}
                      </div>
                      <span>{job.company}</span>
                    </div>
                    <span className="text-[#64748B]">·</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location || 'Not specified'}</span>
                    </div>
                    {job.date_posted && (
                      <>
                        <span className="text-[#64748B]">·</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Posted {job.date_posted}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {job.experience_level && (
                <div className="flex items-center gap-2 mt-4">
                  <Briefcase className="w-4 h-4 text-[#94A3B8]" />
                  <span className="px-3 py-1 bg-[#7C3AED]/20 text-[#7C3AED] rounded-full text-sm font-medium capitalize">
                    {job.experience_level} Level
                  </span>
                </div>
              )}
            </div>

            {/* Match Score Card */}
            <div className="bg-[#1E293B] rounded-xl p-6 border-2 border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/5 to-transparent">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-[#7C3AED]" />
                <h2 className="text-[#7C3AED] font-bold text-lg">Your Match Score</h2>
              </div>

              <div className="flex justify-center mb-6">
                <MatchRing percentage={job.raw_match || 0} size={160} strokeWidth={12} />
              </div>

              <p className="text-[#94A3B8] text-center mb-6">
                You match <span className="text-white font-bold">{matchedCount}</span> out of <span className="text-white font-bold">{totalSkillsCount}</span> required skills
              </p>

              {matchedSkills.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                    <h3 className="text-[#16A34A] font-medium">Matched Skills</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.map(skill => (
                      <SkillChip key={skill} skill={skill} variant="matched" />
                    ))}
                  </div>
                </div>
              )}

              {missingSkills.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-[#DC2626]" />
                    <h3 className="text-[#DC2626] font-medium">Skills to Learn</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {missingSkills.map(skill => (
                      <SkillChip key={skill} skill={skill} variant="missing" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* About This Role Card */}
            {job.description && (
              <div className="bg-[#1E293B] rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-[#7C3AED]" />
                  <h2 className="text-white font-bold text-lg">About This Role</h2>
                </div>
                <div className={`text-[#94A3B8] leading-relaxed ${!showFullDescription ? 'line-clamp-3 md:line-clamp-none' : ''}`}>
                  <p className="whitespace-pre-line">{job.description}</p>
                </div>
                {job.description.length > 300 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-3 text-[#7C3AED] text-sm font-medium flex items-center gap-1 md:hidden"
                  >
                    {showFullDescription ? (
                      <>Show Less <ChevronUp className="w-4 h-4" /></>
                    ) : (
                      <>Read More <ChevronDown className="w-4 h-4" /></>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            {/* Apply Card */}
            <div className="bg-[#1E293B] rounded-xl p-6 shadow-xl">
              <h2 className="text-white font-bold text-lg mb-4">Ready to Apply?</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${getCompanyColor(job.company)} rounded-full flex items-center justify-center text-white font-bold`}>
                    {job.company?.charAt(0)}
                  </div>
                  <span className="text-white font-medium">{job.company}</span>
                </div>
                <div className="flex items-center gap-3 text-[#94A3B8]">
                  <MapPin className="w-5 h-5" />
                  <span>{job.location || 'Not specified'}</span>
                </div>
              </div>
              
              <div className="border-t border-[#334155] pt-6 space-y-3">
                {/* ADVANCED APPLY BUTTON */}
                <button
                  onClick={handleApply}
                  disabled={applyLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 text-white"
                  style={{
                    backgroundColor: applyLoading ? '#334155' : '#7C3AED',
                    opacity: applyLoading ? 0.7 : 1,
                    cursor: applyLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {applyLoading ? (
                    <><Loader2 size={18} className="animate-spin" /> Preparing...</>
                  ) : (
                    <><Send size={18} /> Apply Now</>
                  )}
                </button>
                
                {applyError && (
                  <p className="text-sm mt-2 text-center" style={{ color: '#FCA5A5' }}>{applyError}</p>
                )}

                <button
                  onClick={handleSave}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                    isSaved 
                      ? 'bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]' 
                      : 'border border-[#334155] text-white hover:border-[#7C3AED] hover:text-[#7C3AED]'
                  }`}
                >
                  {isSaved ? <><BookmarkCheck className="w-4 h-4" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save Job</>}
                </button>
              </div>
            </div>

            {/* Match Summary Card */}
            <div className="bg-[#1E293B] rounded-xl p-6">
              <h2 className="text-white font-bold text-lg mb-4">Match Summary</h2>
              <div className="text-center mb-4">
                <p className="text-[#7C3AED] text-5xl font-bold mb-2">{job.raw_match || 0}%</p>
                <GradeBadge grade={job.grade} size="large" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1E293B] border-t border-[#334155] p-4 flex gap-3 z-50">
          <Link
            href="/jobs"
            className="flex-1 py-3 text-center border border-[#334155] text-white rounded-lg font-medium"
          >
            ← Back
          </Link>
          <button
            onClick={handleApply}
            disabled={applyLoading}
            className="flex-1 py-3 bg-[#7C3AED] text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {applyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Apply</>}
          </button>
        </div>
        
        <div className="h-20 lg:hidden" />

        {/* Apply Panel Modal */}
        {applyData && (
          <ApplyPanel
            applyData={applyData}
            onClose={() => setApplyData(null)}
          />
        )}
      </main>
    </div>
  )
}