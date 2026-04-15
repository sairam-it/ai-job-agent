// app/auth/page.js
'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import {
  Mail, Lock, Eye, EyeOff, User, Phone,
  AlertCircle, Zap, Loader2, CheckCircle2, ArrowLeft
} from 'lucide-react'
import { useApp } from '@/lib/context/AppContext'

// ── Inner component — uses session and search params ──────
function AuthContent() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const { setUserId, setToken, setUserName } = useApp()

  // ── Core mode ─────────────────────────────────────────
  const [mode,    setMode]    = useState('signin')   // 'signin' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // ── Password visibility ───────────────────────────────
  const [showPassword,        setShowPassword]        = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ── Sign In fields ────────────────────────────────────
  const [signInEmail,    setSignInEmail]    = useState('')
  const [signInPassword, setSignInPassword] = useState('')

  // ── Sign Up fields ────────────────────────────────────
  const [signUpName,            setSignUpName]            = useState('')
  const [signUpEmail,           setSignUpEmail]           = useState('')
  const [signUpPhone,           setSignUpPhone]           = useState('')
  const [signUpPassword,        setSignUpPassword]        = useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('')

  // ── OTP state ─────────────────────────────────────────
  const [otpSent,      setOtpSent]      = useState(false)
  const [otpInputs,    setOtpInputs]    = useState(['', '', '', '', '', ''])
  const [otpLoading,   setOtpLoading]   = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const otpRefs = useRef([])

  // ── Google OAuth session sync ─────────────────────────
  // When NextAuth session arrives (after Google redirect), sync to our system
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    if (!session?.user_id || !session?.customToken) return

    sessionStorage.setItem('aija_session_token',   session.customToken)
    sessionStorage.setItem('aija_session_user_id', session.user_id)
    localStorage.setItem('ai_job_agent_name',  session.userName  || '')
    localStorage.setItem('ai_job_agent_email', session.userEmail || '')

    setToken(session.customToken)
    setUserId(session.user_id)
    setUserName(session.userName || '')

    router.push('/')
  }, [sessionStatus, session, router, setToken, setUserId, setUserName])

  // ── Read URL error params (from NextAuth redirect) ────
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const urlError = params.get('error')

    if (urlError === 'gmail_only') {
      setError('Only @gmail.com accounts are supported for Google sign-in.')
    } else if (urlError === 'OAuthAccountNotLinked') {
      setError('This email is already registered. Please sign in with email/password.')
    } else if (urlError) {
      setError('Google sign-in failed. Please try again.')
    }
  }, [])

  // ── Validation helpers ────────────────────────────────
  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.trim())

  const validatePhone = (phone) =>
    /^\d{10}$/.test(phone.replace(/[\s\-().+]/g, ''))

  const calculatePasswordStrength = (pw) => {
    if (!pw) return 0
    if (pw.length < 6) return 1
    if (/\d/.test(pw) || /[!@#$%^&*]/.test(pw)) {
      if (pw.length >= 8) {
        return (/\d/.test(pw) && /[!@#$%^&*]/.test(pw)) ? 4 : 3
      }
      return 2
    }
    return 1
  }

  const passwordStrength = calculatePasswordStrength(signUpPassword)
  const strengthColors   = ['bg-gray-300', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500']

  const clearError = () => { if (error) setError('') }

  const formatApiError = (detail) => {
    if (!detail)                  return 'An unknown error occurred.'
    if (Array.isArray(detail))    return detail.map(i => i?.msg || String(i)).join(' | ')
    if (typeof detail === 'object') return detail.message || detail.detail || JSON.stringify(detail)
    return String(detail)
  }

  // ── Shared input style helpers ────────────────────────
  const inputBase = { backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' }

  const onFocusStyle = (e) => {
    e.target.style.borderColor = '#7C3AED'
    e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.1)'
  }
  const onBlurStyle = (e) => {
    e.target.style.borderColor = '#334155'
    e.target.style.boxShadow   = 'none'
  }

  // ── Google sign-in ────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      // Returns to /auth after OAuth — useEffect above handles sync
      await signIn('google', { callbackUrl: '/auth' })
    } catch {
      setError('Google sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  // ── Email/password sign-in ────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateEmail(signInEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com)')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch('http://localhost:8000/api/auth/signin', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email: signInEmail.trim().toLowerCase(), password: signInPassword }),
      })
      const data = await res.json()

      if (res.ok) {
        sessionStorage.setItem('aija_session_token',   data.token)
        sessionStorage.setItem('aija_session_user_id', data.user_id)
        localStorage.setItem('ai_job_agent_name',  data.name)
        localStorage.setItem('ai_job_agent_email', signInEmail.trim().toLowerCase())

        setToken(data.token)
        setUserId(data.user_id)
        setUserName(data.name)

        if (data.profile?.skills?.length > 0) {
          // AppContext setProfile is imported via useApp if needed
        }

        router.push('/')
      } else {
        setError(formatApiError(data.detail || 'Sign in failed'))
      }
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  // ── Send OTP (Step 1 of signup) ───────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')

    if (!signUpName.trim() || signUpName.trim().length < 2) {
      setError('Please enter your full name.'); return
    }
    if (!validateEmail(signUpEmail)) {
      setError('Please enter a valid email address.'); return
    }
    if (signUpPhone.trim() && !validatePhone(signUpPhone)) {
      setError('Phone number must be exactly 10 digits.'); return
    }
    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters.'); return
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match.'); return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/otp/send', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          email   : signUpEmail.trim().toLowerCase(),
          name    : signUpName.trim(),
          phone   : signUpPhone.trim() || null,
          password: signUpPassword,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setPendingEmail(signUpEmail.trim().toLowerCase())
        localStorage.setItem('ai_job_agent_email', signUpEmail.trim().toLowerCase())
        if (signUpPhone.trim()) {
          localStorage.setItem('ai_job_agent_phone', signUpPhone.trim())
        }
        setOtpSent(true)
        // Focus first OTP input after render
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
      } else {
        setError(formatApiError(data.detail))
      }
    } catch {
      setError('Cannot connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP input handlers ────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const updated = [...otpInputs]
    updated[index] = value.slice(-1)
    setOtpInputs(updated)
    clearError()

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpInputs[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted  = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const updated = [...otpInputs]
    for (let i = 0; i < 6; i++) updated[i] = pasted[i] || ''
    setOtpInputs(updated)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  // ── Verify OTP (Step 2 of signup) ─────────────────────
  const handleVerifyOtp = async () => {
    const otp = otpInputs.join('')
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code.'); return
    }

    setOtpLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/otp/verify', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email: pendingEmail, otp }),
      })
      const data = await res.json()

      if (res.ok) {
        sessionStorage.setItem('aija_session_token',   data.token)
        sessionStorage.setItem('aija_session_user_id', data.user_id)
        localStorage.setItem('ai_job_agent_name',  data.name)

        setToken(data.token)
        setUserId(data.user_id)
        setUserName(data.name)

        setSignupSuccess(true)
        setTimeout(() => router.push('/'), 1200)
      } else {
        setError(formatApiError(data.detail))
        // Clear inputs on wrong code
        if (res.status === 400) {
          setOtpInputs(['', '', '', '', '', ''])
          setTimeout(() => otpRefs.current[0]?.focus(), 50)
        }
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setOtpInputs(['', '', '', '', '', ''])
    setError('')
    setOtpSent(false)
    // Brief pause then re-send
    setTimeout(() => {
      setOtpSent(false)
    }, 200)
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setOtpSent(false)
    setOtpInputs(['', '', '', '', '', ''])
    setSignupSuccess(false)
  }

  // ── If Google session is loading, show spinner ────────
  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && session?.user_id)) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0F172A' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#7C3AED' }} />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#0F172A' }}
    >
      {/* Decorative glow */}
      <div
        className="hidden lg:block absolute -top-40 -left-40 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
          filter    : 'blur(60px)',
        }}
      />

      {/* ── Auth Card ─────────────────────────────────── */}
      <div
        className="w-full max-w-md mx-4 p-8 rounded-2xl"
        style={{ backgroundColor: '#1E293B', boxShadow: '0 0 40px rgba(124,58,237,0.15)' }}
      >
        {/* Logo + Tabs */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap size={28} style={{ color: '#7C3AED' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#F8FAFC' }}>AI Job Agent</h1>
          </div>

          {/* Only show tabs when not in OTP flow */}
          {!otpSent && (
            <div className="flex gap-3 rounded-lg p-1" style={{ backgroundColor: '#0F172A' }}>
              {['signin', 'signup'].map(tab => (
                <button
                  key={tab}
                  onClick={() => switchMode(tab)}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200"
                  style={{
                    backgroundColor: mode === tab ? '#7C3AED' : 'transparent',
                    color          : mode === tab ? '#fff' : '#94A3B8',
                  }}
                >
                  {tab === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Success banner */}
        {signupSuccess && (
          <div className="mb-6 p-4 rounded-lg border flex gap-3"
            style={{ backgroundColor: '#052e16', borderColor: '#16A34A' }}>
            <CheckCircle2 size={20} style={{ color: '#4ADE80', flexShrink: 0 }} />
            <p style={{ color: '#4ADE80', fontSize: '14px' }}>
              Account verified! Redirecting...
            </p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-lg border flex gap-3"
            style={{ backgroundColor: '#7F1D1D', borderColor: '#DC2626' }}>
            <AlertCircle size={20} style={{ color: '#FCA5A5', flexShrink: 0 }} />
            <p style={{ color: '#FCA5A5', fontSize: '14px' }}>{error}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            OTP VERIFICATION SCREEN
        ══════════════════════════════════════════════ */}
        {otpSent && !signupSuccess && (
          <div>
            {/* Back button */}
            <button
              onClick={() => { setOtpSent(false); setOtpInputs(['', '', '', '', '', '']); setError('') }}
              className="flex items-center gap-1.5 mb-6 text-sm transition-colors"
              style={{ color: '#94A3B8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
            >
              <ArrowLeft size={15} />
              Back to sign up
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#F8FAFC' }}>
                Check your email
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                We sent a 6-digit code to{' '}
                <span className="font-medium" style={{ color: '#A78BFA' }}>
                  {pendingEmail}
                </span>
              </p>
            </div>

            {/* 6-digit OTP inputs */}
            <div className="flex gap-3 justify-center mb-6">
              {otpInputs.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  onClick={clearError}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl border outline-none transition-all duration-200"
                  style={{
                    backgroundColor: '#0F172A',
                    borderColor    : digit ? '#7C3AED' : '#334155',
                    color          : '#F8FAFC',
                    boxShadow      : digit ? '0 0 0 2px rgba(124,58,237,0.2)' : 'none',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#7C3AED'
                    e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.15)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = digit ? '#7C3AED' : '#334155'
                    e.target.style.boxShadow   = digit ? '0 0 0 2px rgba(124,58,237,0.2)' : 'none'
                  }}
                />
              ))}
            </div>

            {/* Verify button */}
            <button
              onClick={handleVerifyOtp}
              disabled={otpLoading || otpInputs.join('').length !== 6}
              className="w-full h-11 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all duration-200 mb-4"
              style={{
                backgroundColor: (otpLoading || otpInputs.join('').length !== 6) ? '#334155' : '#7C3AED',
                opacity        : (otpLoading || otpInputs.join('').length !== 6) ? 0.7 : 1,
                cursor         : (otpLoading || otpInputs.join('').length !== 6) ? 'not-allowed' : 'pointer',
              }}
            >
              {otpLoading
                ? <><Loader2 size={18} className="animate-spin" /> Verifying...</>
                : 'Verify & Create Account →'
              }
            </button>

            {/* Resend link */}
            <p className="text-center" style={{ color: '#94A3B8', fontSize: '14px' }}>
              Didn&apos;t receive it?{' '}
              <button
                onClick={handleResendOtp}
                className="font-medium hover:underline transition-colors"
                style={{ color: '#7C3AED' }}
              >
                Resend code
              </button>
            </p>

            <p className="text-center mt-2" style={{ color: '#475569', fontSize: '12px' }}>
              Code expires in 10 minutes
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            SIGN IN FORM
        ══════════════════════════════════════════════ */}
        {mode === 'signin' && !otpSent && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#F8FAFC' }}>
                Welcome back
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                Sign in to view your job matches
              </p>
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-11 rounded-lg border font-medium text-white flex items-center justify-center gap-3 mb-4 transition-all duration-200"
              style={{ borderColor: '#334155', backgroundColor: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" style={{ color: '#94A3B8' }} />
                : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )
              }
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ backgroundColor: '#334155' }} />
              <span style={{ color: '#475569', fontSize: '12px' }}>or sign in with email</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#334155' }} />
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }} />
                  <input
                    type="email" placeholder="you@example.com"
                    value={signInEmail} required
                    onChange={e => { setSignInEmail(e.target.value); clearError() }}
                    onFocus={onFocusStyle} onBlur={onBlurStyle}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                </div>
                {signInEmail && !validateEmail(signInEmail) && (
                  <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>
                    Enter a valid email address
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={signInPassword} required
                    onChange={e => { setSignInPassword(e.target.value); clearError() }}
                    onFocus={onFocusStyle} onBlur={onBlurStyle}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <a href="#" onClick={e => e.preventDefault()}
                  className="text-sm" style={{ color: '#7C3AED' }}>
                  Forgot password?
                </a>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full h-11 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all duration-200"
                style={{ backgroundColor: '#7C3AED', opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Signing in...</>
                  : 'Sign In →'
                }
              </button>
            </form>

            <p className="text-center mt-6" style={{ color: '#94A3B8', fontSize: '14px' }}>
              Don&apos;t have an account?{' '}
              <button onClick={() => switchMode('signup')}
                style={{ color: '#7C3AED' }} className="font-medium hover:underline">
                Sign up
              </button>
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            SIGN UP FORM
        ══════════════════════════════════════════════ */}
        {mode === 'signup' && !otpSent && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#F8FAFC' }}>
                Create your account
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                Your email will be verified with a code
              </p>
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-11 rounded-lg border font-medium text-white flex items-center justify-center gap-3 mb-4 transition-all duration-200"
              style={{ borderColor: '#334155', backgroundColor: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" style={{ color: '#94A3B8' }} />
                : <><GoogleIcon /> Sign up with Google</>
              }
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ backgroundColor: '#334155' }} />
              <span style={{ color: '#475569', fontSize: '12px' }}>or sign up with email</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#334155' }} />
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Full name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }} />
                  <input
                    type="text" placeholder="Siddeshwar Goud Palle"
                    value={signUpName} required
                    onChange={e => { setSignUpName(e.target.value); clearError() }}
                    onFocus={onFocusStyle} onBlur={onBlurStyle}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }} />
                  <input
                    type="email" placeholder="you@example.com"
                    value={signUpEmail} required
                    onChange={e => { setSignUpEmail(e.target.value); clearError() }}
                    onFocus={onFocusStyle} onBlur={onBlurStyle}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                </div>
                {signUpEmail && !validateEmail(signUpEmail) && (
                  <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>
                    Enter a valid email (e.g. name@example.com)
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Phone number{' '}
                  <span style={{ color: '#475569' }}>(optional)</span>
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }} />
                  <input
                    type="tel" placeholder="+91 98765 43210"
                    value={signUpPhone}
                    onChange={e => { setSignUpPhone(e.target.value); clearError() }}
                    onFocus={onFocusStyle} onBlur={onBlurStyle}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                </div>
                {signUpPhone && !validatePhone(signUpPhone) && (
                  <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>
                    Phone must be exactly 10 digits
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Password
                </label>
                <div className="relative mb-2">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={signUpPassword} required
                    onChange={e => { setSignUpPassword(e.target.value); clearError() }}
                    onFocus={onFocusStyle} onBlur={onBlurStyle}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Strength bar */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i}
                      className={`flex-1 h-1.5 rounded-full transition-colors duration-200 ${
                        i <= passwordStrength ? strengthColors[passwordStrength] : ''
                      }`}
                      style={i > passwordStrength ? { backgroundColor: '#334155' } : {}}
                    />
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Confirm password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={signUpConfirmPassword} required
                    onChange={e => { setSignUpConfirmPassword(e.target.value); clearError() }}
                    onFocus={e => {
                      if (!(signUpConfirmPassword && signUpPassword !== signUpConfirmPassword))
                        onFocusStyle(e)
                    }}
                    onBlur={e => {
                      e.target.style.boxShadow   = 'none'
                      e.target.style.borderColor = (signUpConfirmPassword && signUpPassword !== signUpConfirmPassword)
                        ? '#DC2626' : '#334155'
                    }}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={{
                      ...inputBase,
                      borderColor: (signUpConfirmPassword && signUpPassword !== signUpConfirmPassword)
                        ? '#DC2626' : '#334155'
                    }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#94A3B8' }}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {signUpConfirmPassword && signUpPassword !== signUpConfirmPassword && (
                  <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full h-11 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all duration-200"
                style={{ backgroundColor: '#7C3AED', opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Sending code...</>
                  : 'Send Verification Code →'
                }
              </button>
            </form>

            <p className="text-center mt-6" style={{ color: '#94A3B8', fontSize: '14px' }}>
              Already have an account?{' '}
              <button onClick={() => switchMode('signin')}
                style={{ color: '#7C3AED' }} className="font-medium hover:underline">
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Google SVG icon (inline — no external dependency) ─────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ── Page export wrapped in Suspense (required for App Router) ──
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#0F172A' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#7C3AED' }} />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  )
}