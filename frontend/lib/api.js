// lib/api.js

const BASE_URL = 'http://localhost:8000'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ai_job_agent_token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function uploadResume(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/api/resume/upload`, {
    method : 'POST',
    headers: authHeaders(),
    body   : formData
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getProfile(userId) {
  const res = await fetch(`${BASE_URL}/api/resume/${userId}`, {
    headers: authHeaders()
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getSavedCompanies(userId) {
  const res = await fetch(`${BASE_URL}/api/resume/${userId}/companies`, {
    headers: authHeaders()
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function selectCompanies(userId, companies) {
  const res = await fetch(`${BASE_URL}/api/companies/select`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body   : JSON.stringify({ user_id: userId, companies })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function scrapeJobs(userId) {
  const res = await fetch(`${BASE_URL}/api/jobs/scrape`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body   : JSON.stringify({ user_id: userId })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function matchJobs(userId) {
  const res = await fetch(`${BASE_URL}/api/jobs/match`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body   : JSON.stringify({ user_id: userId })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJobs(userId, page = 1, filters = {}) {
  const params = new URLSearchParams({ user_id: userId, page, per_page: 10, ...filters })
  const res = await fetch(`${BASE_URL}/api/jobs?${params}`, {
    headers: authHeaders()
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJobDetail(userId, title, company) {
  const params = new URLSearchParams({ user_id: userId, title, company })
  const res = await fetch(`${BASE_URL}/api/jobs/detail?${params}`, {
    headers: authHeaders()
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}