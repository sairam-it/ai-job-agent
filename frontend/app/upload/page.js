"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  Briefcase,
  Loader2,
  FileText,
  Plus,
  X
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ProgressBar } from '@/components/ProgressBar'
import { SkillChip } from '@/components/SkillChip'
import { useApp } from '@/lib/context/AppContext'
import { useToast } from '@/components/ToastProvider'
import { uploadResume } from '@/lib/api'

const experienceLevelConfig = {
  entry: { label: 'Entry Level', color: 'bg-[#3B82F6]' },
  mid: { label: 'Mid Level', color: 'bg-[#7C3AED]' },
  senior: { label: 'Senior Level', color: 'bg-[#16A34A]' },
}

export default function UploadPage() {
  const router = useRouter()
  const { setUserId, setProfile } = useApp()
  const toast = useToast()

  // Page states: idle, uploading, success, error
  const [state, setState] = useState('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  
  // Uploaded file info
  const [uploadedFile, setUploadedFile] = useState(null)
  
  // Extracted profile data
  const [extractedProfile, setExtractedProfile] = useState(null)
  const [localSkills, setLocalSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')
  const [userId, setLocalUserId] = useState(null)

  const handleFile = async (file) => {
    if (!file) return
    
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or DOCX file')
      return
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setState('uploading')
    setUploadedFile(file)
    setError('')

    try {
      const response = await uploadResume(file)
      
      setLocalUserId(response.user_id)
      setExtractedProfile(response.profile)
      setLocalSkills(response.profile.skills || [])
      setState('success')
      toast.success('Resume parsed successfully!')
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to parse resume')
      setState('error')
      toast.error('Failed to parse resume. Is the backend running?')
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    handleFile(file)
  }

  const handleReset = () => {
    setState('idle')
    setUploadedFile(null)
    setExtractedProfile(null)
    setLocalSkills([])
    setError('')
    setLocalUserId(null)
  }

  const handleRemoveSkill = (skillToRemove) => {
    setLocalSkills(prev => prev.filter(s => s !== skillToRemove))
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !localSkills.includes(newSkill.trim())) {
      setLocalSkills(prev => [...prev, newSkill.trim()])
      setNewSkill('')
    }
  }

  const handleContinue = () => {
    if (userId && extractedProfile) {
      // Save to context
      setUserId(userId)
      setProfile({ ...extractedProfile, skills: localSkills })
      router.push('/companies')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar />
      <ProgressBar currentStep={1} />

      <main className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
        {/* Page Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Upload Your Resume
          </h1>
          <p className="text-[#94A3B8] text-lg">
            We'll extract your skills and experience automatically
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload Box */}
          <div>
            {/* STATE: idle */}
            {state === 'idle' && (
              <label
                className={`
                  block border-2 border-dashed rounded-xl min-h-[280px] cursor-pointer
                  transition-all duration-200
                  ${isDragging 
                    ? 'border-[#7C3AED] bg-[#7C3AED]/10' 
                    : 'border-[#7C3AED] hover:bg-[#1E293B]'}
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleFileInput}
                />
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <UploadCloud className="w-16 h-16 text-[#7C3AED] mb-4" />
                  {isDragging ? (
                    <p className="text-white text-lg font-medium">Drop it here!</p>
                  ) : (
                    <>
                      <p className="text-white text-lg font-medium mb-2">
                        Drag and drop your resume here
                      </p>
                      <p className="text-[#94A3B8] mb-4">or</p>
                      <span className="px-6 py-2 border border-[#7C3AED] text-[#7C3AED] rounded-lg font-medium hover:bg-[#7C3AED] hover:text-white transition-colors">
                        Browse Files
                      </span>
                      <p className="text-[#64748B] text-sm mt-4">
                        Supports PDF and DOCX · Max 10MB
                      </p>
                    </>
                  )}
                </div>
              </label>
            )}

            {/* STATE: uploading */}
            {state === 'uploading' && (
              <div className="border-2 border-[#7C3AED] bg-[#7C3AED]/10 rounded-xl min-h-[280px] flex flex-col items-center justify-center p-8">
                <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin mb-4" />
                <p className="text-white text-lg font-medium mb-2">
                  Parsing your resume...
                </p>
                <p className="text-[#94A3B8] text-sm">
                  Extracting skills and experience level
                </p>
              </div>
            )}

            {/* STATE: success */}
            {state === 'success' && uploadedFile && (
              <div className="bg-[#1E293B] rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-[#16A34A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#16A34A]" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-[#94A3B8]" />
                  <p className="text-white font-bold">{uploadedFile.name}</p>
                </div>
                <p className="text-[#94A3B8] text-sm mb-4">
                  {formatFileSize(uploadedFile.size)}
                </p>
                <p className="text-[#16A34A] font-medium mb-6">
                  ✓ Successfully parsed
                </p>
                <button
                  onClick={handleReset}
                  className="text-[#94A3B8] underline hover:text-white transition-colors"
                >
                  Upload a different resume
                </button>
              </div>
            )}

            {/* STATE: error */}
            {state === 'error' && (
              <div className="border-2 border-[#DC2626] rounded-xl min-h-[280px] flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="w-12 h-12 text-[#DC2626] mb-4" />
                <p className="text-[#DC2626] text-lg font-bold mb-2">
                  Failed to parse resume
                </p>
                <p className="text-[#94A3B8] text-sm mb-6 max-w-xs">
                  {error}
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2 border border-[#DC2626] text-[#DC2626] rounded-lg font-medium hover:bg-[#DC2626] hover:text-white transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Extracted Profile (only shown on success) */}
          {state === 'success' && extractedProfile && (
            <div className="space-y-6 animate-fade-in">
              {/* Experience Card */}
              <div className="bg-[#1E293B] rounded-xl p-6">
                <p className="text-[#94A3B8] text-xs uppercase tracking-wide mb-3">
                  Experience Level
                </p>
                <div className="flex items-center gap-4">
                  <Briefcase className="w-8 h-8 text-[#7C3AED]" />
                  <div>
                    <span className={`
                      inline-block px-4 py-2 rounded-lg font-bold text-white
                      ${experienceLevelConfig[extractedProfile.experience_level]?.color || 'bg-[#6B7280]'}
                    `}>
                      {experienceLevelConfig[extractedProfile.experience_level]?.label || 'Unknown'}
                    </span>
                    <p className="text-[#94A3B8] mt-2">
                      {extractedProfile.years_of_experience || extractedProfile.years || 0} years of experience
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills Card */}
              <div className="bg-[#1E293B] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-lg">Extracted Skills</h3>
                  <span className="px-3 py-1 bg-[#7C3AED]/20 text-[#7C3AED] rounded-full text-sm font-medium">
                    ({localSkills.length})
                  </span>
                </div>

                {/* Skills Grid */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {localSkills.map((skill, index) => (
                    <div 
                      key={skill} 
                      className="animate-stagger-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <SkillChip
                        skill={skill}
                        removable
                        onRemove={handleRemoveSkill}
                      />
                    </div>
                  ))}
                </div>

                {/* Add Skill Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="Add skill manually"
                    className="flex-1 px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED]"
                  />
                  <button
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg font-medium hover:bg-[#6D28D9] transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                <p className="text-[#64748B] text-xs mt-2">
                  Manual changes are local only and won't affect the API data.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-[#334155]">
          <Link
            href="/"
            className="px-6 py-3 text-[#94A3B8] hover:text-white transition-colors font-medium"
          >
            ← Back to Home
          </Link>
          <button
            onClick={handleContinue}
            disabled={state !== 'success'}
            className={`
              px-8 py-3 rounded-lg font-semibold transition-all
              ${state === 'success'
                ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] cursor-pointer'
                : 'bg-[#7C3AED]/50 text-white/50 cursor-not-allowed'}
            `}
          >
            Continue to Companies →
          </button>
        </div>
      </main>
    </div>
  )
}
