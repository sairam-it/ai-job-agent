"use client"

import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(undefined)

// ── Key constants ─────────────────────────────────────────
// sessionStorage — cleared when tab/browser closes
const SESSION_KEYS = {
  USER_ID : 'aija_session_user_id',
  TOKEN   : 'aija_session_token',
}

// localStorage — survives tab close (profile data only, no auth)
export const STORAGE_KEYS = {
  NAME        : 'ai_job_agent_name',
  EMAIL       : 'ai_job_agent_email',
  PHONE       : 'ai_job_agent_phone',
  LAST_SIGNOUT: 'ai_job_agent_last_signout',
  PROFILE     : 'ai_job_agent_profile',
  COMPANIES   : 'ai_job_agent_companies',
}

export function AppProvider({ children }) {
  const [user_id,   setUserIdState] = useState(null)
  const [token,     setTokenState]  = useState(null)
  const [userName,  setUserName]    = useState(null)
  const [profile,   setProfileState] = useState(null)
  const [companies, setCompaniesState] = useState([])
  const [jobsCount, setJobsCount]   = useState(0)
  const [isLoading, setIsLoading]   = useState(true)

  // ── Restore session on mount ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Auth from sessionStorage — gone if tab was closed
    const sessionUserId = sessionStorage.getItem(SESSION_KEYS.USER_ID)
    const sessionToken  = sessionStorage.getItem(SESSION_KEYS.TOKEN)

    if (!sessionUserId || !sessionToken) {
      // No active session — user must sign in
      setIsLoading(false)
      return
    }

    // Auth exists — restore it
    setUserIdState(sessionUserId)
    setTokenState(sessionToken)

    // Restore non-auth data from localStorage
    const storedName    = localStorage.getItem(STORAGE_KEYS.NAME)
    const storedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE)
    const storedCompanies = localStorage.getItem(STORAGE_KEYS.COMPANIES)

    if (storedName)      setUserName(storedName)
    if (storedProfile) {
      try { setProfileState(JSON.parse(storedProfile)) } catch {}
    }
    if (storedCompanies) {
      try { setCompaniesState(JSON.parse(storedCompanies)) } catch {}
    }

    setIsLoading(false)
  }, [])

  // ── Setters ───────────────────────────────────────────
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
    if (c && c.length > 0) {
      localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(c))
    } else {
      localStorage.removeItem(STORAGE_KEYS.COMPANIES)
    }
  }

  // ── Sign out ──────────────────────────────────────────
  const clearSession = () => {
    const now = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium', timeStyle: 'short'
    })
    localStorage.setItem(STORAGE_KEYS.LAST_SIGNOUT, now)

    // Clear auth from sessionStorage
    sessionStorage.removeItem(SESSION_KEYS.USER_ID)
    sessionStorage.removeItem(SESSION_KEYS.TOKEN)

    // Clear profile from localStorage
    localStorage.removeItem(STORAGE_KEYS.PROFILE)
    localStorage.removeItem(STORAGE_KEYS.COMPANIES)
    localStorage.removeItem(STORAGE_KEYS.NAME)
    // Keep EMAIL, PHONE, LAST_SIGNOUT for dropdown display on next login

    // ── Task 1: Clear session indicator cookie ────────────
    document.cookie = 'aija_has_session=; path=/; max-age=0; SameSite=Lax'

    setUserIdState(null)
    setTokenState(null)
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
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    return {
      user_id: null,   setUserId: () => {},
      token: null,     setToken: () => {},
      userName: null,  setUserName: () => {},
      profile: null,   setProfile: () => {},
      companies: [],   setCompanies: () => {},
      jobsCount: 0,    setJobsCount: () => {},
      isLoading: false,
      clearSession: () => {},
    }
  }
  return context
}