"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Check, X, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ProgressBar } from '@/components/ProgressBar'
import { useApp } from '@/lib/context/AppContext'
import { useToast } from '@/components/ToastProvider'
import { selectCompanies, scrapeJobs, matchJobs } from '@/lib/api'

const companiesList = [
  { name: "Google", industry: "Technology", color: "bg-blue-500" },
  { name: "Microsoft", industry: "Technology", color: "bg-green-500" },
  { name: "Amazon", industry: "E-Commerce/Cloud", color: "bg-orange-500" },
  { name: "TCS", industry: "IT Services", color: "bg-purple-500" },
  { name: "Infosys", industry: "IT Services", color: "bg-cyan-500" },
  { name: "Meta", industry: "Social Media", color: "bg-indigo-500" },
  { name: "Wipro", industry: "IT Services", color: "bg-teal-500" },
  { name: "HCL Technologies", industry: "IT Services", color: "bg-blue-600" },
  { name: "Accenture", industry: "Consulting", color: "bg-purple-600" },
  { name: "IBM", industry: "Technology", color: "bg-blue-700" },
  { name: "Adobe", industry: "Software", color: "bg-red-500" },
  { name: "Oracle", industry: "Software/Cloud", color: "bg-red-600" },
  { name: "SAP", industry: "Enterprise SW", color: "bg-teal-600" },
  { name: "Salesforce", industry: "CRM/Cloud", color: "bg-blue-400" },
  { name: "Cisco Systems", industry: "Networking", color: "bg-blue-500" },
  { name: "Intel Corporation", industry: "Semiconductors", color: "bg-blue-600" },
  { name: "Dell Technologies", industry: "Hardware/Cloud", color: "bg-blue-700" },
  { name: "Uber", industry: "Mobility/Tech", color: "bg-gray-600" },
  { name: "Airbnb", industry: "Travel/Tech", color: "bg-red-400" },
  { name: "Freshworks", industry: "SaaS", color: "bg-green-500" },
  { name: "Zoho", industry: "SaaS", color: "bg-orange-600" },
]

const loadingMessages = [
  "Searching Google for Python, Java, JavaScript jobs...",
  "Searching Microsoft for relevant roles...",
  "Running skill matching algorithm...",
  "Ranking jobs by confidence score...",
]

export default function CompaniesPage() {
  const router = useRouter()
  const { user_id, setCompanies, setJobsCount, isLoading: contextLoading } = useApp()
  const toast = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)

  // Redirect if no user_id
  useEffect(() => {
    if (!contextLoading && !user_id) {
      router.push('/upload')
    }
  }, [user_id, contextLoading, router])

  // Cycle through loading messages
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [isProcessing])

  const filteredCompanies = companiesList.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleCompany = (companyName) => {
    setSelectedCompanies(prev =>
      prev.includes(companyName)
        ? prev.filter(c => c !== companyName)
        : [...prev, companyName]
    )
  }

  const clearAll = () => {
    setSelectedCompanies([])
  }

  const handleSearch = async () => {
    if (selectedCompanies.length === 0) {
      toast.error('Please select at least one company')
      return
    }

    setIsProcessing(true)

    try {
      // Step 1: Select companies
      await selectCompanies(user_id, selectedCompanies)
      
      // Step 2: Scrape jobs
      const scrapeResult = await scrapeJobs(user_id)
      
      // Step 3: Match jobs
      const matchResult = await matchJobs(user_id)

      // Save to context
      setCompanies(selectedCompanies)
      setJobsCount(matchResult.count || scrapeResult.count || 0)

      toast.success('Jobs scraped and matched successfully!')
      router.push('/jobs')
    } catch (err) {
      console.error('Search error:', err)
      toast.error(err.message || 'Something went wrong. Please try again.')
      setIsProcessing(false)
    }
  }

  if (contextLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar />
      <ProgressBar currentStep={2} />

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-[#0F172A]/95 z-50 flex flex-col items-center justify-center">
          <div className="text-center max-w-md px-4">
            <Loader2 className="w-16 h-16 text-[#7C3AED] animate-spin mx-auto mb-6" />
            <p className="text-white text-xl font-semibold mb-4">
              Searching for Jobs
            </p>
            <p className="text-[#94A3B8] mb-8 h-6">
              {loadingMessages[loadingMessageIndex]}
            </p>
            {/* Progress bar */}
            <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#7C3AED] rounded-full transition-all duration-500"
                style={{ width: `${((loadingMessageIndex + 1) / loadingMessages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Select Target Companies
          </h1>
          <p className="text-[#94A3B8] text-lg">
            Choose which companies to search for your skills
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-12 pr-4 py-3 bg-[#1E293B] border border-[#334155] rounded-xl text-white placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>

        {/* Selected Count Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8]">{selectedCompanies.length} companies selected</span>
            {selectedCompanies.length > 0 && (
              <span className="px-2 py-0.5 bg-[#7C3AED] text-white rounded-full text-xs font-medium">
                {selectedCompanies.length}
              </span>
            )}
          </div>
          {selectedCompanies.length > 0 && (
            <button
              onClick={clearAll}
              className="text-[#DC2626] hover:text-red-400 text-sm font-medium transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Company Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {filteredCompanies.map((company) => {
            const isSelected = selectedCompanies.includes(company.name)
            return (
              <button
                key={company.name}
                onClick={() => toggleCompany(company.name)}
                className={`
                  relative p-5 rounded-xl text-left transition-all duration-200
                  ${isSelected
                    ? 'bg-[#7C3AED]/10 border-2 border-[#7C3AED]'
                    : 'bg-[#1E293B] border border-[#334155] hover:border-[#7C3AED] hover:-translate-y-0.5 hover:shadow-lg'}
                `}
                aria-pressed={isSelected}
                aria-label={`${company.name} - ${isSelected ? 'Selected' : 'Not selected'}`}
              >
                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-[#7C3AED] rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Company Initial */}
                <div className={`w-10 h-10 ${company.color} rounded-full flex items-center justify-center text-white font-bold mb-3`}>
                  {company.name.charAt(0)}
                </div>

                {/* Company Info */}
                <p className="text-white font-bold">{company.name}</p>
                <p className="text-[#64748B] text-xs mt-1">{company.industry}</p>
              </button>
            )
          })}
        </div>

        {/* Selected Companies Strip */}
        <div className="bg-[#1E293B] rounded-xl p-4 mb-8">
          <p className="text-[#94A3B8] text-sm mb-3">Selected Companies</p>
          {selectedCompanies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedCompanies.map(company => (
                <span
                  key={company}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7C3AED] text-white rounded-full text-sm font-medium"
                >
                  {company}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCompany(company)
                    }}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${company}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[#64748B] text-sm italic">
              No companies selected yet — click cards above to add
            </p>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-[#334155]">
          <Link
            href="/upload"
            className="px-6 py-3 text-[#94A3B8] hover:text-white transition-colors font-medium"
          >
            ← Back
          </Link>
          <button
            onClick={handleSearch}
            disabled={selectedCompanies.length === 0}
            className={`
              px-8 py-3 rounded-lg font-semibold transition-all
              ${selectedCompanies.length > 0
                ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] cursor-pointer'
                : 'bg-[#7C3AED]/50 text-white/50 cursor-not-allowed'}
            `}
          >
            Search {selectedCompanies.length} {selectedCompanies.length === 1 ? 'Company' : 'Companies'} →
          </button>
        </div>
      </main>
    </div>
  )
}
