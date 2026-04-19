'use client'

import { useState, useEffect } from 'react'
import {
  X, Copy, Check, ExternalLink, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Search, Info
} from 'lucide-react'
import { saveMissingFields } from '@/lib/api'
import { useApp } from '@/lib/context/AppContext'

// ── Fields that are REQUIRED (cannot be skipped) ──────────
// Keyed by field name. Value is the validation function.
const REQUIRED_VALIDATORS = {
  first_name : (v) => v.trim().length >= 1  ? null : 'First name is required.',
  last_name  : (v) => v.trim().length >= 1  ? null : 'Last name is required.',
  full_name  : (v) => v.trim().length >= 2  ? null : 'Full name is required.',
  email      : (v) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v.trim())
                        ? null : 'Enter a valid email address.',
  phone      : (v) => /^\d{10}$/.test(v.replace(/[\s\-().+]/g, ''))
                        ? null : 'Phone must be exactly 10 digits.',
  linkedin_url: (v) => {
    if (!v.trim()) return 'LinkedIn URL is required.'
    if (!v.includes('linkedin.com')) return 'Enter a valid LinkedIn URL.'
    return null
  },
  city        : (v) => v.trim().length >= 2  ? null : 'City is required.',
  notice_period: (v) => v.trim().length >= 1 ? null : 'Select a notice period.',
}

// ── Fields that are OPTIONAL (can be skipped) ─────────────
const OPTIONAL_FIELDS = new Set([
  'github_url', 'portfolio_url', 'address', 'state', 'pincode',
  'nationality', 'gender', 'current_ctc', 'expected_ctc',
  'graduation_year', 'university', 'highest_degree', 'cover_letter',
  'current_company', 'resume_pdf',
])

function isRequired(key) {
  return key in REQUIRED_VALIDATORS
}

function validate(key, value) {
  if (!isRequired(key)) return null
  return REQUIRED_VALIDATORS[key]?.(value || '') ?? null
}

function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false
  const lower = url.toLowerCase()
  const invalid = ['[ download', 'placeholder', 'n/a', 'none', 'localhost']
  if (invalid.some(x => lower.includes(x))) return false
  return lower.startsWith('http://') || lower.startsWith('https://')
}

function ensureHttps(url) {
  if (!url) return ''
  return (url.startsWith('http://') || url.startsWith('https://'))
    ? url
    : 'https://' + url
}

export default function ApplyPanel({ applyData, onClose }) {
  const { user_id } = useApp()
  const { job, kit, cover_letter } = applyData

  const [copiedKey,         setCopiedKey]         = useState(null)
  const [missingAnswers,    setMissingAnswers]     = useState({})
  const [fieldErrors,       setFieldErrors]        = useState({})  // per-field errors
  const [touchedFields,     setTouchedFields]      = useState({})  // track blur
  const [savingFields,      setSavingFields]       = useState(false)
  const [fieldsSaved,       setFieldsSaved]        = useState(false)
  const [showCoverLetter,   setShowCoverLetter]    = useState(false)
  const [coverLetterCopied, setCoverLetterCopied]  = useState(false)
  const [submitAttempted,   setSubmitAttempted]    = useState(false)

  const hasMissing = kit?.missing_fields?.length > 0
  const [step, setStep] = useState(hasMissing ? 'fill-missing' : 'apply-kit')

  const rawUrl   = job?.url || ''
  const applyUrl = ensureHttps(rawUrl)
  const urlValid = isValidUrl(applyUrl)
  const urlStatus= job?.url_status || (urlValid ? 'direct' : 'missing')

  const urlStatusConfig = {
    direct : { color: '#4ADE80', bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)',   message: 'Direct application link — opens the apply form',          icon: Check       },
    source : { color: '#FDB97D', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)',  message: 'Opens the careers page — find the "Apply" button there',  icon: Info        },
    search : { color: '#93C5FD', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)',  message: 'No direct link — opens Google search for this job',        icon: Search      },
    missing: { color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   message: 'No URL available — use the search fallback below',         icon: AlertCircle },
  }
  const urlInfo = urlStatusConfig[urlStatus] || urlStatusConfig.missing

  // ── Determine which missing fields are required ────────
  const requiredMissingFields = (kit?.missing_fields || []).filter(isRequired)
  const optionalMissingFields = (kit?.missing_fields || []).filter(k => !isRequired(k))

  // ── Validate all required missing fields ──────────────
  function validateAll() {
    const errors = {}
    requiredMissingFields.forEach(key => {
      const err = validate(key, missingAnswers[key] || '')
      if (err) errors[key] = err
    })
    return errors
  }

  // ── Check if form is ready to submit ──────────────────
  const allRequiredFilled = requiredMissingFields.every(key => {
    const value = missingAnswers[key] || ''
    return validate(key, value) === null
  })

  // ── Handle field change ────────────────────────────────
  const handleFieldChange = (key, value) => {
    setMissingAnswers(prev => ({ ...prev, [key]: value }))
    // Clear error as user types if field now valid
    if (fieldErrors[key]) {
      const err = validate(key, value)
      setFieldErrors(prev => ({ ...prev, [key]: err }))
    }
  }

  // ── Handle field blur — show error on blur ─────────────
  const handleFieldBlur = (key, value) => {
    setTouchedFields(prev => ({ ...prev, [key]: true }))
    if (isRequired(key)) {
      const err = validate(key, value || '')
      setFieldErrors(prev => ({ ...prev, [key]: err }))
    }
  }

  // ── Save missing fields ────────────────────────────────
  const handleSaveMissing = async () => {
    setSubmitAttempted(true)

    // Run full validation first
    const errors = validateAll()

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      // Mark all required fields as touched so errors show
      const touched = {}
      requiredMissingFields.forEach(k => { touched[k] = true })
      setTouchedFields(touched)
      return   // Block progression
    }

    setSavingFields(true)
    try {
      const filled = {}
      Object.entries(missingAnswers).forEach(([k, v]) => {
        if (v && v.trim()) filled[k] = v.trim()
      })

      if (Object.keys(filled).length > 0) {
        await saveMissingFields(user_id, filled)
      }

      // Update kit fields in-place
      if (kit?.fields) {
        kit.fields.forEach(f => {
          if (filled[f.key]) {
            f.value      = filled[f.key]
            f.is_missing = false
          }
        })
        kit.missing_fields = (kit.missing_fields || []).filter(k => !filled[k])
      }

      setFieldsSaved(true)
      setTimeout(() => {
        setFieldsSaved(false)
        setStep('apply-kit')
      }, 700)
    } catch (err) {
      console.error('[ApplyPanel] Save failed:', err)
    } finally {
      setSavingFields(false)
    }
  }

  const handleCopy = async (key, value) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const el = document.createElement('textarea')
        el.value = value
        el.style.position = 'fixed'
        el.style.opacity  = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (err) {
      console.error('[ApplyPanel] Copy failed:', err)
    }
  }

  const handleCopyCoverLetter = async () => {
    try {
      await navigator.clipboard.writeText(cover_letter || '')
      setCoverLetterCopied(true)
      setTimeout(() => setCoverLetterCopied(false), 2000)
    } catch {}
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const gradeColors = {
    A: { bg: 'rgba(22,163,74,0.15)',   text: '#4ADE80'  },
    B: { bg: 'rgba(59,130,246,0.15)',  text: '#93C5FD'  },
    C: { bg: 'rgba(249,115,22,0.15)',  text: '#FDB97D'  },
    D: { bg: 'rgba(107,114,128,0.15)', text: '#D1D5DB'  },
  }
  const grade  = job?.grade || 'C'
  const gColor = gradeColors[grade] || gradeColors.C

  // ── Shared input style ─────────────────────────────────
  const getInputStyle = (key) => {
    const hasError = (touchedFields[key] || submitAttempted) && fieldErrors[key]
    return {
      backgroundColor: '#0F172A',
      borderColor    : hasError ? '#DC2626' : '#334155',
      color          : '#F8FAFC',
    }
  }

  const inputFocus = (e) => {
    e.target.style.borderColor = '#7C3AED'
    e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.1)'
  }
  const inputBlur = (e, key, value) => {
    handleFieldBlur(key, value)
    const hasErr = isRequired(key) && validate(key, value)
    e.target.style.borderColor = hasErr ? '#DC2626' : '#334155'
    e.target.style.boxShadow   = 'none'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="h-full overflow-y-auto w-full max-w-lg flex flex-col"
        style={{ backgroundColor: '#1E293B', borderLeft: '1px solid #334155' }}
      >

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 shrink-0"
          style={{ borderBottom: '1px solid #334155' }}>
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: gColor.bg, color: gColor.text }}>
                Grade {grade}
              </span>
              {job?.match_score && (
                <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>
                  {job.match_score}% match
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
                {kit?.ats_name && kit.ats_name !== 'generic'
                  ? kit.ats_name.charAt(0).toUpperCase() + kit.ats_name.slice(1)
                  : 'Direct Apply'
                }
              </span>
            </div>
            <h2 className="text-base font-bold leading-tight" style={{ color: '#F8FAFC' }}>
              {job?.title}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
              {job?.company} {job?.location ? `· ${job.location}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 transition-colors"
            style={{ color: '#64748B' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748B'}>
            <X size={20} />
          </button>
        </div>

        {/* ══════════════════════════════════════════════
            STEP 1: Fill Missing Fields
        ══════════════════════════════════════════════ */}
        {step === 'fill-missing' && (
          <div className="p-5 flex-1">
            <div className="mb-5 p-4 rounded-xl flex gap-3"
              style={{
                backgroundColor: 'rgba(249,115,22,0.08)',
                border         : '1px solid rgba(249,115,22,0.25)'
              }}>
              <AlertCircle size={17} style={{ color: '#FDB97D', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#FDB97D' }}>
                  {kit.missing_fields.length} field{kit.missing_fields.length !== 1 ? 's' : ''} needed
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                  Required fields (<span style={{ color: '#DC2626' }}>*</span>) must be completed.
                  Optional fields can be skipped.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {(kit?.missing_fields || []).map(key => {
                const field    = kit.fields?.find(f => f.key === key)
                if (!field) return null

                const required = isRequired(key)
                const hasError = (touchedFields[key] || submitAttempted) && fieldErrors[key]
                const value    = missingAnswers[key] || ''

                return (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1.5"
                      style={{ color: '#F8FAFC' }}>
                      {field.label}
                      {required && (
                        <span className="ml-1" style={{ color: '#DC2626' }}>*</span>
                      )}
                      {!required && (
                        <span className="ml-1 text-xs font-normal" style={{ color: '#475569' }}>
                          (optional)
                        </span>
                      )}
                    </label>

                    {/* Textarea for cover letter */}
                    {key === 'cover_letter' ? (
                      <textarea
                        rows={4}
                        value={value}
                        onChange={e => handleFieldChange(key, e.target.value)}
                        onFocus={inputFocus}
                        onBlur={e => inputBlur(e, key, value)}
                        placeholder="Enter your cover letter..."
                        className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm resize-none transition-all duration-200"
                        style={getInputStyle(key)}
                      />
                    ) : key === 'gender' ? (
                      <select
                        value={value}
                        onChange={e => handleFieldChange(key, e.target.value)}
                        onBlur={e => inputBlur(e, key, e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm transition-all duration-200"
                        style={getInputStyle(key)}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    ) : key === 'notice_period' ? (
                      <select
                        value={value}
                        onChange={e => handleFieldChange(key, e.target.value)}
                        onBlur={e => inputBlur(e, key, e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm transition-all duration-200"
                        style={getInputStyle(key)}
                      >
                        <option value="">Select notice period</option>
                        <option value="Immediate">Immediate / Serving Notice</option>
                        <option value="15 days">15 days</option>
                        <option value="30 days">30 days</option>
                        <option value="60 days">60 days</option>
                        <option value="90 days">90 days</option>
                      </select>
                    ) : (
                      <input
                        type={key.includes('url') ? 'url' : 'text'}
                        value={value}
                        onChange={e => handleFieldChange(key, e.target.value)}
                        onFocus={inputFocus}
                        onBlur={e => inputBlur(e, key, e.target.value)}
                        placeholder={
                          key === 'linkedin_url' ? 'https://linkedin.com/in/your-profile'
                          : key.includes('url')  ? 'https://...'
                          : `Enter ${field.label.toLowerCase()}...`
                        }
                        className="w-full px-3 py-2.5 rounded-lg border outline-none text-sm transition-all duration-200"
                        style={getInputStyle(key)}
                      />
                    )}

                    {/* Inline error message */}
                    {hasError && fieldErrors[key] && (
                      <p className="flex items-center gap-1 mt-1.5 text-xs"
                        style={{ color: '#FCA5A5' }}>
                        <AlertCircle size={11} />
                        {fieldErrors[key]}
                      </p>
                    )}

                    {/* Valid check */}
                    {required && !hasError && value && validate(key, value) === null && (
                      <p className="flex items-center gap-1 mt-1.5 text-xs"
                        style={{ color: '#4ADE80' }}>
                        <Check size={11} />
                        Looks good
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Summary of required fields status */}
            {submitAttempted && !allRequiredFilled && (
              <div className="mt-4 p-3 rounded-lg flex items-start gap-2"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  border         : '1px solid rgba(239,68,68,0.25)'
                }}>
                <AlertCircle size={15} style={{ color: '#FCA5A5', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: '#FCA5A5' }}>
                  Please fill in all required fields (<span style={{ color: '#DC2626' }}>*</span>) before continuing.
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveMissing}
                disabled={savingFields}
                className="flex-1 h-11 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200"
                style={{
                  backgroundColor: fieldsSaved
                    ? '#16A34A'
                    : savingFields ? '#334155' : '#7C3AED',
                  cursor: savingFields ? 'not-allowed' : 'pointer',
                  opacity: savingFields ? 0.7 : 1,
                }}
              >
                {savingFields
                  ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                  : fieldsSaved
                    ? <><Check size={16} /> Saved!</>
                    : 'Save & Continue →'
                }
              </button>

              {/* Skip only visible if there are no required missing fields */}
              {requiredMissingFields.length === 0 && (
                <button
                  onClick={() => setStep('apply-kit')}
                  className="px-4 h-11 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{ color: '#94A3B8', border: '1px solid #334155', backgroundColor: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Skip
                </button>
              )}
            </div>

            {/* Required fields count indicator */}
            {requiredMissingFields.length > 0 && (
              <p className="text-xs text-center mt-3" style={{ color: '#475569' }}>
                {requiredMissingFields.length} required field{requiredMissingFields.length !== 1 ? 's' : ''} must be completed
                {optionalMissingFields.length > 0
                  ? ` · ${optionalMissingFields.length} optional`
                  : ''
                }
              </p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 2: Apply Kit
        ══════════════════════════════════════════════ */}
        {step === 'apply-kit' && (
          <div className="flex-1 flex flex-col">

            {/* Completion bar */}
            <div className="px-5 pt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: '#64748B' }}>
                  Profile completion for this ATS
                </span>
                <span className="text-xs font-bold" style={{ color: '#A78BFA' }}>
                  {kit?.completion_pct || 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#334155' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width          : `${kit?.completion_pct || 0}%`,
                    backgroundColor: (kit?.completion_pct || 0) >= 80 ? '#16A34A'
                      : (kit?.completion_pct || 0) >= 50 ? '#7C3AED' : '#DC2626'
                  }}
                />
              </div>
            </div>

            {/* URL status + open button */}
            <div className="px-5 mt-4">
              <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-lg"
                style={{ backgroundColor: urlInfo.bg, border: `1px solid ${urlInfo.border}` }}>
                <urlInfo.icon size={13} style={{ color: urlInfo.color, flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: urlInfo.color }}>
                  {urlInfo.message}
                </p>
              </div>

              {urlValid ? (
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 no-underline"
                  style={{ backgroundColor: '#7C3AED', display: 'flex' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#6D28D9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7C3AED'}
                >
                  <ExternalLink size={17} />
                  Open Application Page
                </a>
              ) : (
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    `${job?.title} ${job?.company} jobs apply`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 no-underline"
                  style={{ backgroundColor: '#334155', display: 'flex', border: '1px solid #475569' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#475569'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#334155'}
                >
                  <Search size={17} />
                  Search for This Job
                </a>
              )}
            </div>

            {/* Instruction */}
            <div className="mx-5 mt-4 px-3 py-2.5 rounded-lg text-xs"
              style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#A78BFA' }}>
              <strong>How to apply:</strong> Open the portal above, then copy each field below.
            </div>

            {/* Fields list */}
            <div className="px-5 mt-5 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
                Pre-filled Application Fields
              </p>

              <div className="space-y-1.5">
                {(kit?.fields || [])
                  .filter(f => f.key !== 'cover_letter' && f.key !== 'resume_pdf')
                  .map(field => (
                    <div key={field.key}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                      style={{
                        backgroundColor: field.is_missing ? 'rgba(239,68,68,0.04)' : 'rgba(15,23,42,0.8)',
                        border         : `1px solid ${field.is_missing ? 'rgba(239,68,68,0.2)' : '#1E293B'}`,
                      }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs mb-0.5 font-medium" style={{ color: '#475569' }}>
                          {field.label}
                          {isRequired(field.key) && !field.is_missing && (
                            <span className="ml-1 text-xs" style={{ color: '#4ADE80' }}>✓</span>
                          )}
                        </p>
                        <p className="text-sm truncate"
                          style={{
                            color    : field.is_missing ? '#475569' : '#F8FAFC',
                            fontStyle: field.is_missing ? 'italic' : 'normal',
                          }}>
                          {field.is_missing ? '— not provided —' : field.value}
                        </p>
                      </div>

                      {!field.is_missing && field.value && (
                        <button
                          onClick={() => handleCopy(field.key, field.value)}
                          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                          style={{
                            backgroundColor: copiedKey === field.key ? 'rgba(22,163,74,0.15)' : 'rgba(124,58,237,0.12)',
                            color          : copiedKey === field.key ? '#4ADE80' : '#A78BFA'
                          }}
                          title={`Copy ${field.label}`}
                        >
                          {copiedKey === field.key ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                  ))}

                {/* Resume row */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <div className="flex-1">
                    <p className="text-xs mb-0.5 font-medium" style={{ color: '#475569' }}>Resume (PDF)</p>
                    <p className="text-sm" style={{ color: '#A78BFA' }}>Download from your profile page</p>
                  </div>
                </div>

                {/* Cover letter collapsible */}
                <div className="rounded-lg overflow-hidden mt-1" style={{ border: '1px solid #334155' }}>
                  <button
                    onClick={() => setShowCoverLetter(p => !p)}
                    className="w-full flex items-center justify-between px-3 py-2.5 transition-all duration-150"
                    style={{ backgroundColor: 'rgba(15,23,42,0.8)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E293B'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(15,23,42,0.8)'}
                  >
                    <div className="text-left">
                      <p className="text-xs font-medium mb-0.5" style={{ color: '#475569' }}>Cover Letter</p>
                      <p className="text-sm" style={{ color: '#F8FAFC' }}>AI-generated · personalized</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {showCoverLetter && (
                        <button
                          onClick={e => { e.stopPropagation(); handleCopyCoverLetter() }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                          style={{
                            backgroundColor: coverLetterCopied ? 'rgba(22,163,74,0.15)' : 'rgba(124,58,237,0.12)',
                            color          : coverLetterCopied ? '#4ADE80' : '#A78BFA'
                          }}
                        >
                          {coverLetterCopied ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      )}
                      {showCoverLetter
                        ? <ChevronUp size={15} style={{ color: '#475569' }} />
                        : <ChevronDown size={15} style={{ color: '#475569' }} />
                      }
                    </div>
                  </button>

                  {showCoverLetter && (
                    <div className="px-4 py-3"
                      style={{ backgroundColor: '#0F172A', borderTop: '1px solid #334155' }}>
                      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#94A3B8' }}>
                        {cover_letter || 'Cover letter not available.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="h-8" />
          </div>
        )}
      </div>
    </div>
  )
}