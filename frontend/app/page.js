"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Zap, Upload, Building2, BarChart3, Target, Award, Search, Github } from 'lucide-react'
import { useApp } from '@/lib/context/AppContext'

const heroCards = [
  {
    grade: 'A', title: 'Full Stack Developer', company: 'Google',
    location: 'Hyderabad', match: 87, skills: ['Python', 'React', 'AWS'],
    rotation: '-3deg', animationClass: 'animate-float-1',
  },
  {
    grade: 'A', title: 'Backend Engineer', company: 'Microsoft',
    location: 'Bangalore', match: 83, skills: ['Java', 'Spring Boot', 'Git'],
    rotation: '0deg', animationClass: 'animate-float-2',
  },
  {
    grade: 'B', title: 'Software Engineer', company: 'TCS',
    location: 'Chennai', match: 66, skills: ['Java', 'SQL', 'Git'],
    rotation: '2deg', animationClass: 'animate-float-3',
  },
]

const howItWorksSteps = [
  {
    number: 1, icon: Upload, title: 'Upload Resume',
    description: 'We parse your PDF or DOCX and extract all your skills, tools, and experience level automatically.',
  },
  {
    number: 2, icon: Building2, title: 'Select Companies',
    description: 'Choose which companies you want to target. We search only those companies for relevant roles.',
  },
  {
    number: 3, icon: BarChart3, title: 'See Your Matches',
    description: 'Every job is scored and ranked by how well your skills match the job requirements with A/B/C/D grades.',
  },
]

const features = [
  {
    icon: Zap, title: 'Instant Skill Extraction',
    description: 'Automatically pulls 130+ skills, frameworks, and tools directly from your resume using NLP pattern matching.',
  },
  {
    icon: Target, title: 'Confidence-Weighted Scoring',
    description: 'Our algorithm ensures a 6-skill match always ranks above a 1-skill match, even if both show 100% raw percentage.',
  },
  {
    icon: Award, title: 'A/B/C/D Grade System',
    description: 'Every job gets a clear grade so you know instantly where you stand as a candidate.',
  },
  {
    icon: Search, title: 'Multi-Company Search',
    description: 'Search 20+ companies simultaneously. Fully configurable — add any company you want.',
  },
]

function HeroCard({ card, index }) {
  const gradeColors = { A: 'bg-[#16A34A]', B: 'bg-[#3B82F6]' }
  return (
    <div
      className={`bg-white rounded-xl p-4 shadow-xl border-l-4 border-[#7C3AED] ${card.animationClass}`}
      style={{ transform: `rotate(${card.rotation})`, marginTop: index * 20 }}
    >
      <div className="flex items-start gap-3">
        <span className={`${gradeColors[card.grade]} text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm`}>
          {card.grade}
        </span>
        <div className="flex-1">
          <h3 className="text-[#0F172A] font-semibold">{card.title}</h3>
          <p className="text-[#64748B] text-sm">{card.company} · {card.location}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${card.match}%` }} />
        </div>
        <p className="text-[#64748B] text-xs mt-1">{card.match}% match</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {card.skills.map(skill => (
          <span key={skill} className="px-2 py-0.5 bg-[#7C3AED]/10 text-[#7C3AED] rounded-full text-xs font-medium">
            {skill}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [isClient, setIsClient]         = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const { user_id, userName, clearSession } = useApp()

  useEffect(() => { setIsClient(true) }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleGetStarted = () => router.push('/auth')
  const handleUploadResume = () => router.push('/auth')

  // const handleGetStarted = () => {
  //   router.push('/auth')
  // }

  // const handleUploadResume = () => {
  //   router.push('/auth')
  // }


  const handleSignOut = () => {
    setDropdownOpen(false)
    clearSession()
    router.push('/')
  }

  const storedEmail    = isClient ? (localStorage.getItem('ai_job_agent_email')        || '') : ''
  const storedPhone    = isClient ? (localStorage.getItem('ai_job_agent_phone')        || '') : ''
  const lastSignOut    = isClient ? (localStorage.getItem('ai_job_agent_last_signout') || '') : ''
  const firstLetter    = userName ? userName.charAt(0).toUpperCase() : '?'

  return (
    <div className="min-h-screen bg-[#0F172A] animate-fade-in">

      {/* ── NAVBAR ───────────────────────────────────────── */}
      <header
        className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between"
        suppressHydrationWarning
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#7C3AED]" />
          <span className="text-white font-bold text-lg">AI Job Agent</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3" suppressHydrationWarning>

          {isClient && user_id ? (
            // ── Logged in ─────────────────────────────────
            <>
              {/* Dashboard — no functionality */}
              <button
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-full border transition-all duration-200"
                style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#334155'
                  e.currentTarget.style.borderColor     = '#7C3AED'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#1E293B'
                  e.currentTarget.style.borderColor     = '#334155'
                }}
              >
                Dashboard
              </button>

              {/* Get Started */}
              <button
                onClick={handleGetStarted}
                className="px-6 py-2.5 text-sm font-semibold rounded-full border transition-all duration-200"
                style={{ borderColor: '#7C3AED', color: '#7C3AED', backgroundColor: 'transparent' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#7C3AED'
                  e.currentTarget.style.color           = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color           = '#7C3AED'
                }}
              >
                Get Started
              </button>

              {/* Profile circle + dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(prev => !prev)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all duration-200"
                  style={{ backgroundColor: '#7C3AED' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#6D28D9' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#7C3AED' }}
                  aria-label="Profile menu"
                >
                  {firstLetter}
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 rounded-xl z-50"
                    style={{
                      backgroundColor: '#1E293B',
                      border         : '1px solid #334155',
                      minWidth       : '230px',
                      boxShadow      : '0 8px 32px rgba(0,0,0,0.45)',
                    }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid #334155' }}>
                      <p className="font-semibold text-sm" style={{ color: '#F8FAFC' }}>
                        {userName || '—'}
                      </p>
                      {storedEmail && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#94A3B8' }}>
                          {storedEmail}
                        </p>
                      )}
                      {storedPhone && (
                        <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                          {storedPhone}
                        </p>
                      )}
                      {lastSignOut && (
                        <p className="text-xs mt-1.5" style={{ color: '#475569' }}>
                          Last sign out: {lastSignOut}
                        </p>
                      )}
                    </div>

                    {/* Sign Out */}
                    <div className="p-2">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-150"
                        style={{ color: '#DC2626', backgroundColor: 'transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7F1D1D' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>

          ) : (
            // ── Logged out ────────────────────────────────
            <>
              <button
                onClick={handleGetStarted}
                className="px-6 py-2.5 text-sm font-semibold rounded-full border transition-all duration-200"
                style={{ borderColor: '#7C3AED', color: '#7C3AED', backgroundColor: 'transparent' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#7C3AED'
                  e.currentTarget.style.color           = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color           = '#7C3AED'
                }}
              >
                Get Started
              </button>

              <Link
                href="/auth"
                className="px-6 py-2.5 text-sm font-semibold text-white rounded-full border transition-all duration-200"
                style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#334155'
                  e.currentTarget.style.borderColor     = '#7C3AED'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#1E293B'
                  e.currentTarget.style.borderColor     = '#334155'
                }}
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="min-h-[calc(100vh-80px)] flex items-center">
        <div className="max-w-7xl mx-auto px-4 py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED]/10 rounded-full">
                <span className="text-[#7C3AED]">✦</span>
                <span className="text-[#7C3AED] text-sm font-medium">AI-Powered Job Discovery</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-white leading-tight text-balance">
                Find Jobs That Actually Match Your Skills
              </h1>
              <p className="text-[#94A3B8] text-lg max-w-lg text-pretty">
                Upload your resume. We extract your skills, search your target companies, and rank every job by skill match percentage — automatically.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleUploadResume}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#7C3AED] text-white rounded-lg text-lg font-semibold hover:bg-[#6D28D9] transition-colors"
                >
                  Upload Your Resume <span aria-hidden="true">→</span>
                </button>
                <button
                  onClick={scrollToHowItWorks}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white text-white rounded-lg text-lg font-semibold hover:bg-white hover:text-[#0F172A] transition-colors"
                >
                  See How It Works <span aria-hidden="true">↓</span>
                </button>
              </div>
              <p className="text-[#64748B] text-sm">Built as an academic project · CBIT · 2026</p>
            </div>

            <div className="hidden lg:block relative h-[500px]">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 space-y-4 w-[340px]">
                {heroCards.map((card, index) => (
                  <HeroCard key={card.title} card={card} index={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-[#0F172A] text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-[#64748B] text-lg">Three steps to your perfect job match</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorksSteps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="bg-[#F8FAFC] rounded-2xl p-8 text-center h-full">
                  <div className="w-12 h-12 bg-[#7C3AED] text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-6">
                    {step.number}
                  </div>
                  <div className="w-16 h-16 bg-[#7C3AED]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <step.icon className="w-8 h-8 text-[#7C3AED]" />
                  </div>
                  <h3 className="text-[#0F172A] text-xl font-bold mb-4">{step.title}</h3>
                  <p className="text-[#64748B] text-pretty">{step.description}</p>
                </div>
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 text-[#7C3AED] text-2xl font-bold z-10">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="bg-[#0F172A] py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-white text-4xl font-bold mb-4">What Makes This Different</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map(feature => (
              <div
                key={feature.title}
                className="bg-[#1E293B] rounded-xl p-6 border border-[#334155] hover:border-l-4 hover:border-l-[#7C3AED] transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#7C3AED]/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#7C3AED]/30 transition-colors">
                    <feature.icon className="w-6 h-6 text-[#7C3AED]" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-[#94A3B8] text-pretty">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="bg-[#0F172A] border-t border-[#334155] py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[#64748B] text-sm mb-4">
            Built by Sairam Goud Palle · CBIT Hyderabad · 2026
          </p>
          <a
            href="https://github.com/sairam-it/ai-job-agent"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#64748B] hover:text-white transition-colors"
            aria-label="View project on GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </footer>

    </div>
  )
}