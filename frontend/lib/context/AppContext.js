"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { getProfile } from '@/lib/api'

const AppContext = createContext(undefined)

export function AppProvider({ children }) {
  const [user_id, setUserId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [companies, setCompanies] = useState([])
  const [jobsCount, setJobsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, restore user_id from localStorage
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    const storedUserId = localStorage.getItem('ai_job_agent_user_id')
    if (storedUserId) {
      setUserId(storedUserId)
      // Fetch profile for this user
      getProfile(storedUserId)
        .then(data => {
          setProfile(data.profile || data)
        })
        .catch(err => {
          console.error('Failed to restore profile:', err)
          // Clear invalid user_id
          localStorage.removeItem('ai_job_agent_user_id')
          setUserId(null)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  // Persist user_id to localStorage when it changes
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    if (user_id) {
      localStorage.setItem('ai_job_agent_user_id', user_id)
    }
  }, [user_id])

  const clearSession = () => {
    localStorage.removeItem('ai_job_agent_user_id')
    setUserId(null)
    setProfile(null)
    setCompanies([])
    setJobsCount(0)
  }

  return (
    <AppContext.Provider
      value={{
        user_id,
        setUserId,
        profile,
        setProfile,
        companies,
        setCompanies,
        jobsCount,
        setJobsCount,
        isLoading,
        clearSession
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    // Return default values during SSR instead of throwing
    return {
      user_id: null,
      setUserId: () => {},
      profile: null,
      setProfile: () => {},
      companies: [],
      setCompanies: () => {},
      jobsCount: 0,
      setJobsCount: () => {},
      isLoading: false,
      clearSession: () => {}
    }
  }
  return context
}
