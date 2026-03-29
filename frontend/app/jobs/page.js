"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal, SearchX, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ProgressBar } from '@/components/ProgressBar'
import { JobCard } from '@/components/JobCard'
import { FilterSidebar } from '@/components/FilterSidebar'
import { SkeletonCard } from '@/components/SkeletonCard'
import { useApp } from '@/lib/context/AppContext'
import { useToast } from '@/components/ToastProvider'
import { getJobs } from '@/lib/api'

function useAnimatedNumber(target, duration = 800) {
  const [current, setCurrent] = useState(0)
  
  useEffect(() => {
    let startTime
    let animationFrame
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCurrent(Math.floor(progress * target))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [target, duration])
  
  return current
}

function StatCard({ label, value }) {
  const animatedValue = useAnimatedNumber(value)
  
  return (
    <div className="text-center p-4">
      <p className="text-2xl md:text-3xl font-bold text-[#7C3AED] animate-count-up">
        {animatedValue}
      </p>
      <p className="text-[#94A3B8] text-sm">{label}</p>
    </div>
  )
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
    }
    
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          currentPage === 1
            ? 'text-[#64748B] cursor-not-allowed'
            : 'border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white'
        }`}
      >
        ← Previous
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-3 py-2 text-[#64748B]">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                page === currentPage
                  ? 'bg-[#7C3AED] text-white'
                  : 'border border-[#334155] text-[#94A3B8] hover:border-[#7C3AED] hover:text-white'
              }`}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          currentPage === totalPages
            ? 'text-[#64748B] cursor-not-allowed'
            : 'border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white'
        }`}
      >
        Next →
      </button>
    </div>
  )
}

export default function JobsPage() {
  const router = useRouter()
  const { user_id, companies, isLoading: contextLoading } = useApp()
  const toast = useToast()

  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState('match')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
  const [filters, setFilters] = useState({
    grades: [],
    experience_level: '',
    location: '',
    companies: [],
  })

  // Stats
  const [stats, setStats] = useState({
    totalJobs: 0,
    gradeAB: 0,
    companiesCount: 0,
    bestMatch: 0,
  })

  // Company counts for filter
  const [companyCounts, setCompanyCounts] = useState([])

  // Redirect if no user_id
  useEffect(() => {
    if (!contextLoading && !user_id) {
      router.push('/upload')
    }
  }, [user_id, contextLoading, router])

  // Fetch jobs
  const fetchJobs = useCallback(async (page = 1) => {
    if (!user_id) return
    
    setIsLoading(true)
    
    try {
      const filterParams = {}
      if (filters.grades.length > 0) filterParams.grade = filters.grades
      if (filters.experience_level) filterParams.experience_level = filters.experience_level
      if (filters.location) filterParams.location = filters.location
      if (filters.companies.length > 0) filterParams.company = filters.companies
      if (sortBy) filterParams.sort_by = sortBy

      const data = await getJobs(user_id, page, filterParams)
      
      setJobs(data.jobs || [])
      setTotal(data.total || 0)
      setCurrentPage(data.page || 1)
      setTotalPages(data.total_pages || 1)
      
      // Calculate stats
      const allJobs = data.jobs || []
      const gradeABCount = allJobs.filter(j => j.grade === 'A' || j.grade === 'B').length
      const bestMatch = allJobs.length > 0 ? Math.max(...allJobs.map(j => j.raw_match || 0)) : 0
      
      setStats({
        totalJobs: data.total || 0,
        gradeAB: gradeABCount,
        companiesCount: companies.length || 0,
        bestMatch,
      })

      // Build company counts
      const counts = {}
      allJobs.forEach(job => {
        counts[job.company] = (counts[job.company] || 0) + 1
      })
      setCompanyCounts(
        Object.entries(counts)
          .map(([company, count]) => ({ company, count }))
          .sort((a, b) => b.count - a.count)
      )

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Fetch jobs error:', err)
      toast.error('Failed to load jobs. Is the backend running?')
    } finally {
      setIsLoading(false)
    }
  }, [user_id, filters, sortBy, companies.length, toast])

  // Fetch on mount and when filters change
  useEffect(() => {
    if (user_id) {
      fetchJobs(1)
    }
  }, [user_id, filters, sortBy])

  const handlePageChange = (page) => {
    fetchJobs(page)
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({
      grades: [],
      experience_level: '',
      location: '',
      companies: [],
    })
  }

  if (contextLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
      </div>
    )
  }

  const startItem = (currentPage - 1) * 10 + 1
  const endItem = Math.min(currentPage * 10, total)

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar />
      <ProgressBar currentStep={3} />

      <main className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        {/* Stats Bar */}
        <div className="bg-[#1E293B] rounded-xl mb-8 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#334155]">
          <StatCard label="Total Jobs" value={stats.totalJobs} />
          <StatCard label="Grade A+B" value={stats.gradeAB} />
          <StatCard label="Companies" value={stats.companiesCount} />
          <StatCard label="Best Match" value={stats.bestMatch} />
        </div>

        {/* Main Layout */}
        <div className="flex gap-6">
          {/* Filter Sidebar - Desktop */}
          <div className="hidden lg:block">
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleResetFilters}
              companies={companyCounts}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Top Row */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-[#94A3B8] text-sm">
                {total > 0 ? `Showing ${startItem}–${endItem} of ${total} jobs` : 'No jobs found'}
              </p>
              
              <div className="flex items-center gap-3">
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 bg-[#1E293B] rounded-lg text-[#94A3B8] hover:text-white transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </button>
                
                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white text-sm focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="match">Best Match</option>
                  <option value="recent">Most Recent</option>
                  <option value="company">Company A–Z</option>
                </select>
              </div>
            </div>

            {/* Job Cards or Loading */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : jobs.length > 0 ? (
              <>
                <div className="space-y-0">
                  {jobs.map((job, index) => (
                    <JobCard key={`${job.title}-${job.company}-${index}`} job={job} user_id={user_id} />
                  ))}
                </div>
                
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            ) : (
              /* Empty State */
              <div className="text-center py-16">
                <SearchX className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
                <h3 className="text-white text-xl font-bold mb-2">
                  No jobs match your filters
                </h3>
                <p className="text-[#94A3B8] mb-6">
                  Try adjusting or resetting your filters
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-3 border border-[#7C3AED] text-[#7C3AED] rounded-lg font-medium hover:bg-[#7C3AED] hover:text-white transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <FilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          companies={companyCounts}
          isMobile
          onClose={() => setShowMobileFilters(false)}
        />
      )}
    </div>
  )
}
