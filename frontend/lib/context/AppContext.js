"use client"

import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(undefined)

export const STORAGE_KEYS = {
  USER_ID     : 'ai_job_agent_user_id',
  TOKEN       : 'ai_job_agent_token',
  NAME        : 'ai_job_agent_name',
  EMAIL       : 'ai_job_agent_email',
  PHONE       : 'ai_job_agent_phone',
  LAST_SIGNOUT: 'ai_job_agent_last_signout',
}

export function AppProvider({ children }) {
  const [user_id,   setUserIdState] = useState(null)
  const [token,     setTokenState]  = useState(null)
  const [userName,  setUserName]    = useState(null)
  const [profile,   setProfile]     = useState(null)
  const [companies, setCompanies]   = useState([])
  const [jobsCount, setJobsCount]   = useState(0)
  const [isLoading, setIsLoading]   = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID)
    const storedToken  = localStorage.getItem(STORAGE_KEYS.TOKEN)
    const storedName   = localStorage.getItem(STORAGE_KEYS.NAME)

    if (storedUserId && storedToken) {
      setUserIdState(storedUserId)
      setTokenState(storedToken)
      if (storedName) setUserName(storedName)

      fetch(`http://localhost:8000/api/resume/${storedUserId}`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.exists && data?.profile) {
            setProfile(data.profile)
          }
        })
        .catch(() => clearSession())
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const setUserId = (id) => {
    setUserIdState(id)
    if (id) localStorage.setItem(STORAGE_KEYS.USER_ID, id)
  }

  const setToken = (t) => {
    setTokenState(t)
    if (t) localStorage.setItem(STORAGE_KEYS.TOKEN, t)
  }

  const clearSession = () => {
    const now = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
    localStorage.setItem(STORAGE_KEYS.LAST_SIGNOUT, now)

    localStorage.removeItem(STORAGE_KEYS.USER_ID)
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.NAME)

    setUserIdState(null)
    setTokenState(null)
    setUserName(null)
    setProfile(null)
    setCompanies([])
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