'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle, Zap, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/context/AppContext'

export default function AuthPage() {
  const router = useRouter()
  const { setUserId, setToken, setUserName } = useApp()

  const [mode, setMode]               = useState('signin')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [showPassword, setShowPassword]         = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [signInEmail,    setSignInEmail]    = useState('')
  const [signInPassword, setSignInPassword] = useState('')

  const [signUpName,            setSignUpName]            = useState('')
  const [signUpEmail,           setSignUpEmail]           = useState('')
  const [signUpPhone,           setSignUpPhone]           = useState('')
  const [signUpPassword,        setSignUpPassword]        = useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('')

  // ── Validation ───────────────────────────────────────────
  const validateEmail = (email) => {
    const pattern = /^[^\s@]+@[^\s@]+\.com$/
    return pattern.test(email.trim())
  }

  const validatePhone = (phone) => {
    const digits = phone.replace(/[\s\-().+]/g, '')
    return /^\d{10}$/.test(digits)
  }

  const calculatePasswordStrength = (password) => {
    if (!password) return 0
    if (password.length < 6) return 1
    if (/\d/.test(password) || /[!@#$%^&*]/.test(password)) {
      if (password.length >= 8) {
        if (/\d/.test(password) && /[!@#$%^&*]/.test(password)) return 4
        return 3
      }
      return 2
    }
    return 1
  }

  const passwordStrength = calculatePasswordStrength(signUpPassword)
  const passwordStrengthColors = [
    'bg-gray-300', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500'
  ]

  const clearErrorOnInput = () => { if (error) setError('') }

  const formatApiError = (detail) => {
    if (!detail) return 'An unknown error occurred.'
    if (Array.isArray(detail)) {
      return detail.map(item =>
        typeof item === 'string' ? item : item?.msg || JSON.stringify(item)
      ).join(' | ') || 'Invalid data submitted.'
    }
    if (typeof detail === 'object') {
      return detail.message || detail.detail || JSON.stringify(detail)
    }
    return String(detail)
  }

  // ── Sign In ──────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateEmail(signInEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com)')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/auth/signin', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email: signInEmail.trim(), password: signInPassword }),
      })
      const data = await res.json()

      if (res.ok) {
        localStorage.setItem('ai_job_agent_user_id', data.user_id)
        localStorage.setItem('ai_job_agent_token',   data.token)
        localStorage.setItem('ai_job_agent_name',    data.name)
        localStorage.setItem('ai_job_agent_email',   signInEmail.toLowerCase().trim())
        setUserId(data.user_id)
        setToken(data.token)
        setUserName(data.name)
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

  // ── Sign Up ──────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    setSignupSuccess(false)

    if (!signUpName.trim() || signUpName.trim().length < 2) {
      setError('Please enter your full name.')
      return
    }

    if (!validateEmail(signUpEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com)')
      return
    }

    if (signUpPhone.trim() && !validatePhone(signUpPhone)) {
      setError('Phone number must be exactly 10 digits.')
      return
    }

    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/auth/signup', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          name    : signUpName.trim(),
          email   : signUpEmail.toLowerCase().trim(),
          phone   : signUpPhone.trim() || null,
          password: signUpPassword,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        localStorage.setItem('ai_job_agent_email', signUpEmail.toLowerCase().trim())
        if (signUpPhone.trim()) {
          localStorage.setItem('ai_job_agent_phone', signUpPhone.trim())
        }
        setSignupSuccess(true)
        const savedEmail = signUpEmail
        setSignUpName('')
        setSignUpEmail('')
        setSignUpPhone('')
        setSignUpPassword('')
        setSignUpConfirmPassword('')
        setSignInEmail(savedEmail)
        setTimeout(() => {
          setMode('signin')
          setSignupSuccess(false)
        }, 1500)
      } else {
        setError(formatApiError(data.detail || 'Sign up failed'))
      }
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared input styles ──────────────────────────────────
  const inputBase = {
    backgroundColor: '#0F172A',
    borderColor    : '#334155',
    color          : '#F8FAFC',
  }
  const onFocus = (e) => {
    e.target.style.borderColor = '#7C3AED'
    e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.1)'
  }
  const onBlur = (e) => {
    e.target.style.borderColor = '#334155'
    e.target.style.boxShadow   = 'none'
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

      {/* Card */}
      <div
        className="w-full max-w-md mx-4 p-8 rounded-2xl"
        style={{
          backgroundColor: '#1E293B',
          boxShadow      : '0 0 40px rgba(124,58,237,0.15)',
        }}
      >
        {/* Logo + Tabs */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap size={28} style={{ color: '#7C3AED' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#F8FAFC' }}>AI Job Agent</h1>
          </div>

          <div className="flex gap-3 rounded-lg p-1" style={{ backgroundColor: '#0F172A' }}>
            {['signin', 'signup'].map(tab => (
              <button
                key={tab}
                onClick={() => { setMode(tab); setError(''); setSignupSuccess(false) }}
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
        </div>

        {/* Success banner */}
        {signupSuccess && (
          <div
            className="mb-6 p-4 rounded-lg border flex gap-3"
            style={{ backgroundColor: '#052e16', borderColor: '#16A34A' }}
          >
            <span style={{ color: '#4ADE80', fontSize: '18px' }}>✓</span>
            <p style={{ color: '#4ADE80', fontSize: '14px' }}>
              Account created! Switching to Sign In...
            </p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg border flex gap-3"
            style={{ backgroundColor: '#7F1D1D', borderColor: '#DC2626' }}
          >
            <AlertCircle size={20} style={{ color: '#FCA5A5', flexShrink: 0 }} />
            <p style={{ color: '#FCA5A5', fontSize: '14px' }}>{error}</p>
          </div>
        )}

        {/* ── SIGN IN ──────────────────────────────────────── */}
        {mode === 'signin' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#F8FAFC' }}>Welcome back</h2>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>Sign in to view your job matches</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type="email" placeholder="you@example.com"
                    value={signInEmail} required
                    onChange={e => { setSignInEmail(e.target.value); clearErrorOnInput() }}
                    onFocus={onFocus} onBlur={onBlur}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                </div>
                {signInEmail && !validateEmail(signInEmail) && (
                  <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>
                    Enter a valid email (e.g. name@example.com)
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={signInPassword} required
                    onChange={e => { setSignInPassword(e.target.value); clearErrorOnInput() }}
                    onFocus={onFocus} onBlur={onBlur}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <a href="#" onClick={e => e.preventDefault()} style={{ color: '#7C3AED' }} className="text-sm">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full h-11 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all duration-200"
                style={{ backgroundColor: '#7C3AED', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In →'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ backgroundColor: '#334155' }} />
              <span style={{ color: '#94A3B8', fontSize: '12px' }}>or continue with</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#334155' }} />
            </div>

            {/* Google SSO */}
            <button
              onClick={() => setError('Google SSO coming soon')}
              className="w-full h-11 rounded-lg border font-medium text-white flex items-center justify-center gap-2 transition-all duration-200"
              style={{ borderColor: '#334155', backgroundColor: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center mt-6" style={{ color: '#94A3B8', fontSize: '14px' }}>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => { setMode('signup'); setError('') }}
                style={{ color: '#7C3AED' }} className="font-medium hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        )}

        {/* ── SIGN UP ──────────────────────────────────────── */}
        {mode === 'signup' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#F8FAFC' }}>Create your account</h2>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>Start finding jobs that match your skills</p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>Full name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type="text" placeholder="Your full name"
                    value={signUpName} required
                    onChange={e => { setSignUpName(e.target.value); clearErrorOnInput() }}
                    onFocus={onFocus} onBlur={onBlur}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>Email address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type="email" placeholder="you@example.com"
                    value={signUpEmail} required
                    onChange={e => { setSignUpEmail(e.target.value); clearErrorOnInput() }}
                    onFocus={onFocus} onBlur={onBlur}
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
                  Phone number (optional)
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type="tel" placeholder="+91 98765 43210"
                    value={signUpPhone}
                    onChange={e => { setSignUpPhone(e.target.value); clearErrorOnInput() }}
                    onFocus={onFocus} onBlur={onBlur}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                </div>
                {signUpPhone && !validatePhone(signUpPhone) && (
                  <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>
                    Phone number must be exactly 10 digits
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>Password</label>
                <div className="relative mb-2">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={signUpPassword} required
                    onChange={e => { setSignUpPassword(e.target.value); clearErrorOnInput() }}
                    onFocus={onFocus} onBlur={onBlur}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border outline-none transition-all duration-200"
                    style={inputBase}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Strength bar */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex-1 h-1.5 rounded-full transition-colors duration-200"
                      style={{ backgroundColor: i <= passwordStrength ? passwordStrengthColors[passwordStrength] : '#334155' }}
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
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={signUpConfirmPassword} required
                    onChange={e => { setSignUpConfirmPassword(e.target.value); clearErrorOnInput() }}
                    onFocus={e => {
                      if (!(signUpConfirmPassword && signUpPassword !== signUpConfirmPassword)) onFocus(e)
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
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {signUpConfirmPassword && signUpPassword !== signUpConfirmPassword && (
                  <p className="text-xs mt-1" style={{ color: '#FCA5A5' }}>Passwords do not match</p>
                )}
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full h-11 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all duration-200"
                style={{ backgroundColor: '#7C3AED', opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Creating account...</>
                  : 'Create Account →'
                }
              </button>
            </form>

            <p className="text-center mt-6" style={{ color: '#94A3B8', fontSize: '14px' }}>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError('') }}
                style={{ color: '#7C3AED' }} className="font-medium hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}