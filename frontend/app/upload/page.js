"use client"

import { useState, useCallback, useEffect } from 'react'
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
  const { user_id, profile, setUserId, setProfile } = useApp()
  const toast = useToast()

  // States
  const [state, setState] = useState('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [skillsError, setSkillsError] = useState('')
  
  // Local state for UI feedback
  const [uploadedFile, setUploadedFile] = useState(null)
  const [localSkills, setLocalSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')

  // ── Task 1: Check for existing session on mount ───────────────────
  useEffect(() => {
    if (!user_id) {
      // If your app requires login, redirect here. 
      // If not, we just stay idle.
      return
    }

    // If profile already exists in AppContext (from MongoDB or previous upload)
    if (profile && profile.skills && profile.skills.length > 0) {
      setLocalSkills(profile.skills)
      setState('success')
    }
  }, [user_id, profile])

  const handleFile = async (file) => {
    if (!file) return
    
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or DOCX file only.')
      toast.error('Please upload a PDF or DOCX file')
      return
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.')
      toast.error('File size must be less than 10MB')
      return
    }

    setState('uploading')
    setUploadedFile(file)
    setError('')
    setSkillsError('')

    try {
      const response = await uploadResume(file)
      const extractedSkills = response?.profile?.skills || response?.skills || []

      // ── Task 2: Immediate skills validation (Guard) ───────────────
      if (!extractedSkills || extractedSkills.length === 0) {
        setState('idle')
        setUploadedFile(null)
        setSkillsError('No skills were detected in this resume. Please upload a more detailed version.')
        toast.error('Validation failed: No skills found.')
        return
      }

      // Success — Proceed
      if (response.user_id) setUserId(response.user_id)
      
      const newProfile = response.profile || response
      setProfile({ ...newProfile, skills: extractedSkills })
      setLocalSkills(extractedSkills)
      
      setState('success')
      toast.success('Resume parsed successfully!')
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to parse resume. Please try again.')
      setState('error')
      setUploadedFile(null)
      toast.error('Failed to parse resume.')
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    setSkillsError('')
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [])

  const handleReset = () => {
    setState('idle')
    setUploadedFile(null)
    setLocalSkills([])
    setError('')
    setSkillsError('')
    setProfile(null) // Clear context so user can start fresh
  }

  const handleRemoveSkill = (skillToRemove) => {
    const updated = localSkills.filter(s => s !== skillToRemove)
    setLocalSkills(updated)
    // Keep context in sync
    setProfile({ ...profile, skills: updated })
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !localSkills.includes(newSkill.trim())) {
      const updated = [...localSkills, newSkill.trim()]
      setLocalSkills(updated)
      setProfile({ ...profile, skills: updated })
      setNewSkill('')
    }
  }

  const handleContinue = () => {
    if (profile && localSkills.length > 0) {
      router.push('/companies')
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Navbar />
      <ProgressBar currentStep={1} />

      <main className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Upload Your Resume
          </h1>
          <p className="text-[#94A3B8] text-lg">
            We'll extract your skills and experience automatically
          </p>
        </div>

        {/* ── Task 3: Returning User Banner ────────────────────────── */}
        {state === 'success' && !uploadedFile && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl border-2 border-[#16A34A] bg-[#16A34A]/10 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="shrink-0 mt-0.5 w-5 h-5 text-[#16A34A]" />
            <div>
              <p className="font-semibold text-sm text-[#4ADE80]">Profile Found</p>
              <p className="text-sm text-[#86EFAC]">We've loaded your last uploaded resume data. You can continue or upload a new one.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload Box */}
          <div className="flex flex-col">
            
            {/* Skills validation error */}
            {skillsError && (
              <div className="mb-6 p-4 rounded-xl border-2 border-[#DC2626] bg-[#1a0a0a] flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5 w-5 h-5 text-[#DC2626]" />
                <div>
                  <p className="font-semibold text-sm mb-1 text-[#FCA5A5]">No Skills Detected</p>
                  <p className="text-sm text-[#FCA5A5]/80">{skillsError}</p>
                </div>
              </div>
            )}

            {/* STATE: idle */}
            {state === 'idle' && (
              <label
                className={`block border-2 border-dashed rounded-xl min-h-[280px] cursor-pointer transition-all duration-200 ${
                  isDragging ? 'border-[#7C3AED] bg-[#7C3AED]/10' : 'border-[#7C3AED] hover:bg-[#1E293B]'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
              >
                <input type="file" className="hidden" accept=".pdf,.docx" onChange={(e) => handleFile(e.target.files[0])} />
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <UploadCloud className="w-16 h-16 text-[#7C3AED] mb-4" />
                  <p className="text-white text-lg font-medium mb-2">{isDragging ? 'Drop it here!' : 'Drag and drop your resume here'}</p>
                  {!isDragging && (
                    <>
                      <p className="text-[#94A3B8] mb-4">or</p>
                      <span className="px-6 py-2 border border-[#7C3AED] text-[#7C3AED] rounded-lg font-medium hover:bg-[#7C3AED] hover:text-white transition-colors">Browse Files</span>
                      <p className="text-[#64748B] text-sm mt-4">Supports PDF and DOCX · Max 10MB</p>
                    </>
                  )}
                </div>
              </label>
            )}

            {/* STATE: uploading */}
            {state === 'uploading' && (
              <div className="border-2 border-[#7C3AED] bg-[#7C3AED]/10 rounded-xl min-h-[280px] flex flex-col items-center justify-center p-8">
                <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin mb-4" />
                <p className="text-white text-lg font-medium mb-2">Parsing your resume...</p>
                <p className="text-[#94A3B8] text-sm">Extracting skills and experience level</p>
              </div>
            )}

            {/* STATE: success */}
            {state === 'success' && (
              <div className="bg-[#1E293B] rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-[#16A34A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#16A34A]" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-[#94A3B8]" />
                  <p className="text-white font-bold">{uploadedFile ? uploadedFile.name : 'Current Resume Profile'}</p>
                </div>
                <p className="text-[#94A3B8] text-sm mb-4">{formatFileSize(uploadedFile?.size)}</p>
                <p className="text-[#16A34A] font-medium mb-6">✓ Successfully parsed</p>
                <button onClick={handleReset} className="text-[#94A3B8] underline hover:text-white transition-colors">
                  Upload a different resume
                </button>
              </div>
            )}

            {/* STATE: error */}
            {state === 'error' && (
              <div className="border-2 border-[#DC2626] rounded-xl min-h-[280px] flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="w-12 h-12 text-[#DC2626] mb-4" />
                <p className="text-[#DC2626] text-lg font-bold mb-2">Failed to parse resume</p>
                <p className="text-[#94A3B8] text-sm mb-6 max-w-xs">{error}</p>
                <button onClick={handleReset} className="px-6 py-2 border border-[#DC2626] text-[#DC2626] rounded-lg font-medium hover:bg-[#DC2626] hover:text-white transition-colors">Try Again</button>
              </div>
            )}
          </div>

          {/* Right Column - Extracted Profile */}
          <div className="space-y-6">
            {state === 'success' && profile ? (
              <div className="animate-fade-in space-y-6">
                <div className="bg-[#1E293B] rounded-xl p-6">
                  <p className="text-[#94A3B8] text-xs uppercase tracking-wide mb-3">Experience Level</p>
                  <div className="flex items-center gap-4">
                    <Briefcase className="w-8 h-8 text-[#7C3AED]" />
                    <div>
                      <span className={`inline-block px-4 py-2 rounded-lg font-bold text-white ${experienceLevelConfig[profile.experience_level]?.color || 'bg-[#6B7280]'}`}>
                        {experienceLevelConfig[profile.experience_level]?.label || 'Unknown'}
                      </span>
                      <p className="text-[#94A3B8] mt-2">{profile.years_of_experience || profile.years || 0} years of experience</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1E293B] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-lg">Extracted Skills</h3>
                    <span className="px-3 py-1 bg-[#7C3AED]/20 text-[#7C3AED] rounded-full text-sm font-medium">({localSkills.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {localSkills.map((skill, index) => (
                      <SkillChip key={skill} skill={skill} removable onRemove={handleRemoveSkill} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text" value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                      placeholder="Add skill manually"
                      className="flex-1 px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED]"
                    />
                    <button onClick={handleAddSkill} className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg font-medium hover:bg-[#6D28D9] transition-colors flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#1E293B]/50 border-2 border-dashed border-[#334155] rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
                <FileText className="w-12 h-12 text-[#334155] mb-4" />
                <p className="text-[#64748B]">Your extracted skills and experience will appear here after analysis.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-[#334155]">
          <Link href="/" className="px-6 py-3 text-[#94A3B8] hover:text-white transition-colors font-medium">← Back to Home</Link>
          <button
            onClick={handleContinue}
            disabled={state !== 'success' || localSkills.length === 0}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              state === 'success' && localSkills.length > 0 ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] cursor-pointer' : 'bg-[#7C3AED]/50 text-white/50 cursor-not-allowed'
            }`}
          >
            Continue to Companies →
          </button>
        </div>
      </main>
    </div>
  )
}