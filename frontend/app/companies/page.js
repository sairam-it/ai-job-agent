"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, X, Loader2, Plus, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ProgressBar } from '@/components/ProgressBar'
import { useApp } from '@/lib/context/AppContext'
import { useToast } from '@/components/ToastProvider'
import { 
  getUserCompanies, 
  selectCompanies, 
  scrapeJobs, 
  deleteCompany 
} from '@/lib/api'

const COMPANIES_LIST = [
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

const KNOWN_NAMES = new Set(COMPANIES_LIST.map(c => c.name))

const loadingMessages = [
  "Searching career pages...",
  "Scraping job listings with AI...",
  "Extracting requirements with Groq...",
  "Scoring matches against your resume...",
  "Almost done...",
]

export default function CompaniesPage() {
  const router = useRouter()
  const { user_id, setCompanies: setContextCompanies, setJobsCount, isLoading: contextLoading } = useApp()
  const toast = useToast()

  // ── Core State ────────────────────────────────────────
  const [allCompanies, setAllCompanies] = useState(COMPANIES_LIST)
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [hiddenCompanies, setHiddenCompanies] = useState([])
  
  // ── UI State ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [initialising, setInitialising] = useState(true)
  const searchRef = useRef(null)

  // ── Restore State from MongoDB ────────────────────────
  useEffect(() => {
    if (!contextLoading && user_id) {
      async function restoreState() {
        try {
          const data = await getUserCompanies(user_id)
          const customFromDB = (data.custom_companies_list || []).filter(c => !KNOWN_NAMES.has(c.name))
          
          const merged = [
            ...COMPANIES_LIST,
            ...customFromDB.map(c => ({
              name: c.name,
              industry: c.industry || "Custom",
              color: "bg-slate-600",
              isCustom: true
            }))
          ]

          const hidden = data.hidden_companies || []
          setHiddenCompanies(hidden)
          setAllCompanies(merged.filter(c => !hidden.includes(c.name)))
          
          const prevSelected = (data.selected_companies || []).filter(name => !hidden.includes(name))
          setSelectedCompanies(prevSelected)
        } catch (err) {
          console.error('Failed to restore state:', err)
        } finally {
          setInitialising(false)
        }
      }
      restoreState()
    } else if (!contextLoading && !user_id) {
      router.push('/upload')
    }
  }, [user_id, contextLoading, router])

  // Handle outside click for dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cycle loading messages
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length)
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [isProcessing])

  // ── Logic Helpers ─────────────────────────────────────
  const trimmedQuery = searchQuery.trim()
  const filteredCompanies = allCompanies.filter(c => 
    c.name.toLowerCase().includes(trimmedQuery.toLowerCase()) && 
    !selectedCompanies.includes(c.name) &&
    !hiddenCompanies.includes(c.name)
  )

  const isCustomInput = trimmedQuery.length >= 2 && 
    !allCompanies.some(c => c.name.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !selectedCompanies.includes(trimmedQuery)

  const toggleCompany = (name) => {
    setSelectedCompanies(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])
    setSearchQuery('')
    setShowDropdown(false)
  }

  const addCustomCompany = () => {
    if (!trimmedQuery || selectedCompanies.includes(trimmedQuery)) return
    if (!allCompanies.some(c => c.name === trimmedQuery)) {
      setAllCompanies(prev => [...prev, { name: trimmedQuery, industry: "Custom", color: "bg-slate-600", isCustom: true }])
    }
    setSelectedCompanies(prev => [...prev, trimmedQuery])
    setSearchQuery('')
    setShowDropdown(false)
    toast.success(`Added ${trimmedQuery} to list`)
  }

  const handleDeleteCompany = async (e, companyName) => {
    e.stopPropagation()
    try {
      await deleteCompany(user_id, companyName)
      setHiddenCompanies(prev => [...prev, companyName])
      setAllCompanies(prev => prev.filter(c => c.name !== companyName))
      setSelectedCompanies(prev => prev.filter(c => c !== companyName))
      toast.success(`${companyName} removed`)
    } catch (err) {
      toast.error('Failed to remove company')
    }
  }

  const handleSearch = async () => {
    if (selectedCompanies.length === 0) return toast.error('Please select a company')
    setIsProcessing(true)
    try {
      await selectCompanies(user_id, selectedCompanies)
      setContextCompanies(selectedCompanies)
      const result = await scrapeJobs(user_id)
      if (!result || result.count === 0) {
        toast.error('No jobs found. Try a broader search.')
        setIsProcessing(false)
        return
      }
      setJobsCount(result.count || 0)
      toast.success('Research completed!')
      router.push('/jobs')
    } catch (err) {
      toast.error('Research failed. Please try again.')
      setIsProcessing(false)
    }
  }

  // ── Render Logic ──────────────────────────────────────
  if (initialising || contextLoading) {
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

      {/* Original Loading Overlay */}
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

        {/* Dynamic Search Bar */}
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
              {filteredCompanies.slice(0, 8).map(company => (
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
              
              {isCustomInput && (
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

        {/* Company Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {allCompanies.filter(c => !selectedCompanies.includes(c.name)).slice(0, 12).map((company) => (
            <div key={company.name} className="relative group">
              <button
                onClick={() => toggleCompany(company.name)}
                className="w-full p-5 rounded-xl text-left bg-[#1E293B] border border-[#334155] hover:border-[#7C3AED] hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-10 h-10 ${company.color} rounded-full flex items-center justify-center text-white font-bold mb-3`}>
                  {company.name[0]}
                </div>
                <p className="text-white font-bold">{company.name}</p>
                <p className="text-[#64748B] text-xs mt-1">{company.isCustom ? "Custom" : company.industry}</p>
              </button>
              
              <button
                onClick={(e) => handleDeleteCompany(e, company.name)}
                className="absolute top-3 right-3 p-1.5 bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Selected Companies Strip */}
        {selectedCompanies.length > 0 && (
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
        )}

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