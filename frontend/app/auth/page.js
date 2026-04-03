'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle, Zap, Loader2 } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')

  // Sign Up form state
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPhone, setSignUpPhone] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('')

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
    'bg-gray-300',
    'bg-red-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-green-500',
  ]

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail, password: signInPassword }),
      })

      const data = await res.json()

      if (res.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user_id', data.user_id)
        router.push('/upload')
      } else {
        setError(formatApiError(data.detail || 'Sign in failed'))
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signUpName,
          email: signUpEmail,
          phone: signUpPhone || null,
          password: signUpPassword,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user_id', data.user_id)
        router.push('/upload')
      } else {
        setError(formatApiError(data.detail || 'Sign up failed'))
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSSO = () => {
    setError('Google SSO coming soon')
  }

  const clearErrorOnInput = () => {
    if (error) setError('')
  }

  const formatApiError = (detail) => {
    if (!detail) return 'An unknown error occurred.'

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === 'string') return item
          if (item && typeof item.msg === 'string') return item.msg
          return JSON.stringify(item)
        })
        .join(' | ')
      return messages || 'Invalid data submitted.'
    }

    if (typeof detail === 'object') {
      if (detail.message) return detail.message
      if (detail.detail) return formatApiError(detail.detail)
      return JSON.stringify(detail)
    }

    return String(detail)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
      {/* Decorative purple glow circle - desktop only */}
      <div
        className="hidden lg:block absolute -top-40 -left-40 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.25) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Main card */}
      <div
        className="w-full max-w-md mx-4 p-8 rounded-2xl animate-in fade-in-0 slide-in-from-top-2 duration-500"
        style={{
          backgroundColor: '#1E293B',
          boxShadow: '0 0 40px rgba(124, 58, 237, 0.15)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap size={28} style={{ color: '#7C3AED' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#F8FAFC' }}>
              AI Job Agent
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-3 rounded-lg p-1" style={{ backgroundColor: '#0F172A' }}>
            <button
              onClick={() => {
                setMode('signin')
                setError('')
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                mode === 'signin'
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
              style={{
                backgroundColor: mode === 'signin' ? '#7C3AED' : 'transparent',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup')
                setError('')
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                mode === 'signup'
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
              style={{
                backgroundColor: mode === 'signup' ? '#7C3AED' : 'transparent',
              }}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Error card */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg border flex gap-3 animate-in slide-in-from-top-2 duration-150"
            style={{
              backgroundColor: '#7F1D1D',
              borderColor: '#DC2626',
            }}
          >
            <AlertCircle size={20} style={{ color: '#FCA5A5', flexShrink: 0 }} />
            <p style={{ color: '#FCA5A5', fontSize: '14px' }}>{error}</p>
          </div>
        )}

        {/* Sign In Mode */}
        {mode === 'signin' && (
          <div className="animate-in fade-in-0 duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#F8FAFC' }}>
                Welcome back
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                Sign in to view your job matches
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Email field */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => {
                      setSignInEmail(e.target.value)
                      clearErrorOnInput()
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      color: '#F8FAFC',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7C3AED'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#334155'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={signInPassword}
                    onChange={(e) => {
                      setSignInPassword(e.target.value)
                      clearErrorOnInput()
                    }}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      color: '#F8FAFC',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7C3AED'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#334155'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#94A3B8' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="text-right">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-sm transition-colors"
                  style={{ color: '#7C3AED' }}
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#7C3AED',
                  filter: loading ? 'brightness(1)' : 'brightness(1)',
                }}
                onMouseEnter={(e) => !loading && (e.target.style.filter = 'brightness(1.1)')}
                onMouseLeave={(e) => !loading && (e.target.style.filter = 'brightness(1)')}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>Sign In →</>
                )}
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
              onClick={handleGoogleSSO}
              className="w-full h-11 rounded-lg border font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                borderColor: '#334155',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Bottom text */}
            <p className="text-center mt-6" style={{ color: '#94A3B8', fontSize: '14px' }}>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => {
                  setMode('signup')
                  setError('')
                }}
                style={{ color: '#7C3AED' }}
                className="font-medium hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        )}

        {/* Sign Up Mode */}
        {mode === 'signup' && (
          <div className="animate-in fade-in-0 duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#F8FAFC' }}>
                Create your account
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                Start finding jobs that match your skills
              </p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Full Name field */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Full name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Siddeshwar Goud Palle"
                    value={signUpName}
                    onChange={(e) => {
                      setSignUpName(e.target.value)
                      clearErrorOnInput()
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      color: '#F8FAFC',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7C3AED'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#334155'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Email field */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => {
                      setSignUpEmail(e.target.value)
                      clearErrorOnInput()
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      color: '#F8FAFC',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7C3AED'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#334155'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Phone field (optional) */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Phone number (optional)
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={signUpPhone}
                    onChange={(e) => {
                      setSignUpPhone(e.target.value)
                      clearErrorOnInput()
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      color: '#F8FAFC',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7C3AED'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#334155'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Password
                </label>
                <div className="relative mb-3">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={signUpPassword}
                    onChange={(e) => {
                      setSignUpPassword(e.target.value)
                      clearErrorOnInput()
                    }}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      color: '#F8FAFC',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7C3AED'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#334155'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#94A3B8' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password strength bar */}
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1.5 rounded-full transition-colors duration-200"
                      style={{
                        backgroundColor: i <= passwordStrength ? passwordStrengthColors[passwordStrength] : '#334155',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Confirm Password field */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#F8FAFC' }}>
                  Confirm password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={signUpConfirmPassword}
                    onChange={(e) => {
                      setSignUpConfirmPassword(e.target.value)
                      clearErrorOnInput()
                    }}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: '#0F172A',
                      borderColor:
                        signUpConfirmPassword && signUpPassword !== signUpConfirmPassword ? '#DC2626' : '#334155',
                      color: '#F8FAFC',
                    }}
                    onFocus={(e) => {
                      if (!(signUpConfirmPassword && signUpPassword !== signUpConfirmPassword)) {
                        e.target.style.borderColor = '#7C3AED'
                        e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.boxShadow = 'none'
                      if (signUpConfirmPassword && signUpPassword !== signUpConfirmPassword) {
                        e.target.style.borderColor = '#DC2626'
                      } else {
                        e.target.style.borderColor = '#334155'
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#94A3B8' }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {signUpConfirmPassword && signUpPassword !== signUpConfirmPassword && (
                  <p className="text-sm mt-2" style={{ color: '#FCA5A5' }}>
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#7C3AED',
                  filter: loading ? 'brightness(1)' : 'brightness(1)',
                }}
                onMouseEnter={(e) => !loading && (e.target.style.filter = 'brightness(1.1)')}
                onMouseLeave={(e) => !loading && (e.target.style.filter = 'brightness(1)')}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>Create Account →</>
                )}
              </button>
            </form>

            {/* Bottom text */}
            <p className="text-center mt-6" style={{ color: '#94A3B8', fontSize: '14px' }}>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('signin')
                  setError('')
                }}
                style={{ color: '#7C3AED' }}
                className="font-medium hover:underline"
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
