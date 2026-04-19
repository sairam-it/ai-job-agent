// lib/context/AppContext.js
"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { signOut as nextAuthSignOut } from 'next-auth/react'

const AppContext = createContext(undefined)

const SESSION_KEYS = {
  USER_ID: 'aija_session_user_id',
  TOKEN  : 'aija_session_token',
}

export const STORAGE_KEYS = {
  NAME        : 'ai_job_agent_name',
  EMAIL       : 'ai_job_agent_email',
  PHONE       : 'ai_job_agent_phone',       // ← was missing from clearSession
  LAST_SIGNOUT: 'ai_job_agent_last_signout',
  PROFILE     : 'ai_job_agent_profile',
  COMPANIES   : 'ai_job_agent_companies',
  FORCE_REAUTH: 'aija_force_reauth',
}

// ── All localStorage keys that belong to a user session ──
// This list is the single source of truth for "what to clear"
// When a new user signs in, NONE of these should have stale values.
const ALL_USER_KEYS = [
  STORAGE_KEYS.NAME,
  STORAGE_KEYS.EMAIL,
  STORAGE_KEYS.PHONE,        // ← THE BUG FIX: was never cleared before
  STORAGE_KEYS.PROFILE,
  STORAGE_KEYS.COMPANIES,
  STORAGE_KEYS.FORCE_REAUTH,
  // Note: LAST_SIGNOUT intentionally kept — used in profile dropdown
]

export function AppProvider({ children }) {
  const [user_id,    setUserIdState]    = useState(null)
  const [token,      setTokenState]     = useState(null)
  const [userName,   setUserName]       = useState(null)
  const [profile,    setProfileState]   = useState(null)
  const [companies,  setCompaniesState] = useState([])
  const [jobsCount,  setJobsCount]      = useState(0)
  const [isLoading,  setIsLoading]      = useState(true)

  // ── Restore session from sessionStorage on mount ──────
  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUserId = sessionStorage.getItem(SESSION_KEYS.USER_ID)
    const storedToken  = sessionStorage.getItem(SESSION_KEYS.TOKEN)

    if (storedUserId && storedToken) {
      setUserIdState(storedUserId)
      setTokenState(storedToken)

      const name      = localStorage.getItem(STORAGE_KEYS.NAME)
      const profRaw   = localStorage.getItem(STORAGE_KEYS.PROFILE)
      const compRaw   = localStorage.getItem(STORAGE_KEYS.COMPANIES)

      if (name)    setUserName(name)
      if (profRaw) { try { setProfileState(JSON.parse(profRaw))   } catch {} }
      if (compRaw) { try { setCompaniesState(JSON.parse(compRaw)) } catch {} }
    }

    setIsLoading(false)
  }, [])

  const setUserId = (id) => {
    setUserIdState(id)
    if (id) sessionStorage.setItem(SESSION_KEYS.USER_ID, id)
    else    sessionStorage.removeItem(SESSION_KEYS.USER_ID)
  }

  const setToken = (t) => {
    setTokenState(t)
    if (t) sessionStorage.setItem(SESSION_KEYS.TOKEN, t)
    else   sessionStorage.removeItem(SESSION_KEYS.TOKEN)
  }

  const setProfile = (p) => {
    setProfileState(p)
    if (p) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(p))
    else   localStorage.removeItem(STORAGE_KEYS.PROFILE)
  }

  const setCompanies = (c) => {
    setCompaniesState(c)
    if (c?.length > 0) localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(c))
    else               localStorage.removeItem(STORAGE_KEYS.COMPANIES)
  }

  // ── clearSession: wipes EVERY user-owned key ──────────
  const clearSession = async () => {
    // Record sign-out time BEFORE clearing
    const now = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium', timeStyle: 'short'
    })
    localStorage.setItem(STORAGE_KEYS.LAST_SIGNOUT, now)

    // Set force-reauth so auth/page.js clears stale NextAuth session
    localStorage.setItem(STORAGE_KEYS.FORCE_REAUTH, 'true')

    // ── Clear ALL user-owned localStorage keys ─────────
    // This is the fix for the ghost phone number bug.
    // Previously only NAME, PROFILE, COMPANIES were cleared.
    // PHONE was left behind and appeared for the next user.
    ALL_USER_KEYS.forEach(key => localStorage.removeItem(key))

    // ── Clear auth from sessionStorage ────────────────
    sessionStorage.removeItem(SESSION_KEYS.USER_ID)
    sessionStorage.removeItem(SESSION_KEYS.TOKEN)

    // ── Kill session indicator cookie ─────────────────
    document.cookie = 'aija_has_session=; path=/; max-age=0; SameSite=Lax'

    // ── Kill NextAuth JWT cookie ──────────────────────
    await nextAuthSignOut({ redirect: false })

    // ── Reset all React state ─────────────────────────
    setUserIdState(null)
    setTokenState(null)
    setUserName(null)
    setProfileState(null)
    setCompaniesState([])
    setJobsCount(0)
  }

  // ── clearUserData: used on new signup BEFORE setting new data ──
  // Prevents any previous user's data from bleeding into new session.
  const clearUserData = () => {
    ALL_USER_KEYS.forEach(key => localStorage.removeItem(key))
    setUserName(null)
    setProfileState(null)
    setCompaniesState([])
    setJobsCount(0)
  }

  return (
    <AppContext.Provider value={{
      user_id,   setUserId,
      token,     setToken,
      userName,  setUserName,
      profile,   setProfile,
      companies, setCompanies,
      jobsCount, setJobsCount,
      isLoading,
      clearSession,
      clearUserData,   // ← new: call before writing new user data
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    return {
      user_id: null,       setUserId: () => {},
      token: null,         setToken: () => {},
      userName: null,      setUserName: () => {},
      profile: null,       setProfile: () => {},
      companies: [],       setCompanies: () => {},
      jobsCount: 0,        setJobsCount: () => {},
      isLoading: false,
      clearSession: async () => {},
      clearUserData: () => {},
    }
  }
  return context
}