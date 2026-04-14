"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Check, X, Loader2, Plus } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ProgressBar } from '@/components/ProgressBar'
import { useApp } from '@/lib/context/AppContext'
import { useToast } from '@/components/ToastProvider'
import { selectCompanies, scrapeJobs } from '@/lib/api'

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
  "Searching career pages...",
  "Scraping job listings with AI...",
  "Extracting requirements with Groq...",
  "Scoring matches against your resume...",
  "Almost done...",
]

export default function CompaniesPage() {
  const router = useRouter()
  const { user_id, setCompanies, setJobsCount, isLoading: contextLoading } = useApp()
  const toast = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef(null)

  // Redirect if no user_id
  useEffect(() => {
    if (!contextLoading && !user_id) {
      router.push('/upload')
    }
  }, [user_id, contextLoading, router])

  // Handle outside click for dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cycle through loading messages
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length)
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [isProcessing])

  // Filter Logic
  const trimmedQuery = searchQuery.trim()
  const filteredCompanies = companiesList.filter(company =>
    company.name.toLowerCase().includes(trimmedQuery.toLowerCase()) &&
    !selectedCompanies.includes(company.name)
  )

  const isCustom = trimmedQuery.length >= 2 &&
    !companiesList.some(c => c.name.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !selectedCompanies.includes(trimmedQuery)

  const toggleCompany = (companyName) => {
    setSelectedCompanies(prev =>
      prev.includes(companyName)
        ? prev.filter(c => c !== companyName)
        : [...prev, companyName]
    )
    setSearchQuery('')
    setShowDropdown(false)
  }

  const addCustomCompany = () => {
    if (!trimmedQuery || selectedCompanies.includes(trimmedQuery)) return
    setSelectedCompanies(prev => [...prev, trimmedQuery])
    setSearchQuery('')
    setShowDropdown(false)
    toast.success(`Added ${trimmedQuery} to research list`)
  }

  const handleSearch = async () => {
    if (selectedCompanies.length === 0) {
      toast.error('Please select at least one company')
      return
    }
    
    setIsProcessing(true)

    try {
      await selectCompanies(user_id, selectedCompanies)
      const scrapeResult = await scrapeJobs(user_id)
      
      if (!scrapeResult || scrapeResult.count === 0) {
        toast.error('No jobs found. AI will attempt a broad skill search.')
        setIsProcessing(false)
        return
      }

      setCompanies(selectedCompanies)
      setJobsCount(scrapeResult.count || 0)
      toast.success('Research completed successfully!')
      router.push('/jobs')
    } catch (err) {
      toast.error(err.message || 'Research failed. Please try again.')
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

      {isProcessing && (
        <div className="fixed inset-0 bg-[#0F172A]/95 z-50 flex flex-col items-center justify-center">
          <div className="text-center max-w-md px-4">
            <Loader2 className="w-16 h-16 text-[#7C3AED] animate-spin mx-auto mb-6" />
            <p className="text-white text-xl font-semibold mb-4">AI Research in Progress</p>
            <p className="text-[#94A3B8] mb-8 h-6">{loadingMessages[loadingMessageIndex]}</p>
            <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#7C3AED] rounded-full transition-all duration-500"
                style={{ width: `${((loadingMessageIndex + 1) / loadingMessages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Select Target Companies</h1>
          <p className="text-[#94A3B8] text-lg">Choose companies to research — or type any name to add it</p>
        </div>

        {/* Dynamic Search Bar with Dropdown */}
        <div className="relative max-w-xl mx-auto mb-6" ref={searchRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search or add any company..."
            className="w-full pl-12 pr-4 py-3 bg-[#1E293B] border border-[#334155] rounded-xl text-white focus:outline-none focus:border-[#7C3AED]"
          />

          {showDropdown && (trimmedQuery.length > 0 || filteredCompanies.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E293B] border border-[#334155] rounded-xl z-50 overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
              {filteredCompanies.map(company => (
                <button
                  key={company.name}
                  onClick={() => toggleCompany(company.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#334155] transition-colors border-b border-[#0F172A]"
                >
                  <div className={`w-8 h-8 ${company.color} rounded flex items-center justify-center text-white text-xs font-bold`}>
                    {company.name[0]}
                  </div>
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">{company.name}</p>
                    <p className="text-[#64748B] text-xs">{company.industry}</p>
                  </div>
                </button>
              ))}
              
              {isCustom && (
                <button
                  onClick={addCustomCompany}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#7C3AED]/10 transition-colors"
                >
                  <div className="w-8 h-8 bg-[#7C3AED]/20 rounded flex items-center justify-center text-[#A78BFA]">
                    <Plus size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[#A78BFA] text-sm font-medium">Add "{trimmedQuery}" to List</p>
                    <p className="text-[#64748B] text-xs">AI will research this specific website</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-6">
          <span className="text-[#94A3B8]">{selectedCompanies.length} companies selected</span>
          {selectedCompanies.length > 0 && (
            <button onClick={() => setSelectedCompanies([])} className="text-[#DC2626] hover:text-red-400 text-sm font-medium">Clear all</button>
          )}
        </div>

        {/* Company Grid (Filtered by what's NOT selected) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {companiesList.filter(c => !selectedCompanies.includes(c.name)).slice(0, 8).map((company) => (
            <button
              key={company.name}
              onClick={() => toggleCompany(company.name)}
              className="p-5 rounded-xl text-left bg-[#1E293B] border border-[#334155] hover:border-[#7C3AED] hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-10 h-10 ${company.color} rounded-full flex items-center justify-center text-white font-bold mb-3`}>
                {company.name[0]}
              </div>
              <p className="text-white font-bold">{company.name}</p>
              <p className="text-[#64748B] text-xs mt-1">{company.industry}</p>
            </button>
          ))}
        </div>

        {/* Selected Companies Strip */}
        <div className="bg-[#1E293B] rounded-xl p-4 mb-8">
          <p className="text-[#94A3B8] text-sm mb-3 font-semibold uppercase tracking-wider">Research Queue</p>
          <div className="flex flex-wrap gap-2">
            {selectedCompanies.map(name => (
              <span key={name} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7C3AED] text-white rounded-full text-sm font-medium">
                {name}
                <X onClick={() => setSelectedCompanies(prev => prev.filter(c => c !== name))} className="w-3 h-3 cursor-pointer hover:bg-white/20 rounded-full" />
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-[#334155]">
          <Link href="/upload" className="px-6 py-3 text-[#94A3B8] hover:text-white transition-colors">← Back</Link>
          <button
            onClick={handleSearch}
            disabled={selectedCompanies.length === 0 || isProcessing}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${selectedCompanies.length > 0 && !isProcessing ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]' : 'bg-[#7C3AED]/50 text-white/50 cursor-not-allowed'}`}
          >
            {isProcessing ? "Researching..." : `Research ${selectedCompanies.length} Companies →`}
          </button>
        </div>
      </main>
    </div>
  )
}