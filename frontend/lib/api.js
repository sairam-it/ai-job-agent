// lib/api.js

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

function getToken() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('aija_session_token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Resume ────────────────────────────────────────────────

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

// ── Companies ─────────────────────────────────────────────

export async function getUserCompanies(userId) {
  const res = await fetch(`${BASE_URL}/api/companies/${userId}`, {
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

export async function deleteCompany(userId, companyName) {
  const encoded = encodeURIComponent(companyName)
  const res = await fetch(`${BASE_URL}/api/companies/${userId}/${encoded}`, {
    method : 'DELETE',
    headers: authHeaders()
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Jobs ──────────────────────────────────────────────────

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
  const params = new URLSearchParams({
    user_id : userId,
    page,
    per_page: 10,
    ...filters
  })
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

// lib/api.js — replace saveJob only

export async function saveJob(userId, job) {
  /**
   * Sends full job data alongside user_id/title/company.
   * Backend uses scraped_jobs first, falls back to this payload.
   * This fixes favorites not appearing when scraped_jobs lookup fails.
   */
  const res = await fetch(`${BASE_URL}/api/jobs/save`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body   : JSON.stringify({
      user_id         : userId,
      title           : job.title           || '',
      company         : job.company         || '',
      location        : job.location        || '',
      url             : job.url             || '',
      grade           : job.grade           || '',
      match_score     : job.match_score     || 0,
      raw_match       : job.raw_match       || job.match_score || 0,
      experience_level: job.experience_level|| '',
      description     : job.description     || '',
      matched_skills  : job.matched_skills  || [],
      missing_skills  : job.missing_skills  || [],
      required_skills : job.required_skills || job.all_required || [],
      match_reason    : job.match_reason    || '',
      source          : job.source          || 'selected',
      date_posted     : job.date_posted     || '',
    })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function unsaveJob(userId, title, company) {
  const params = new URLSearchParams({ user_id: userId, title, company })
  const res = await fetch(`${BASE_URL}/api/jobs/save?${params}`, {
    method : 'DELETE',
    headers: authHeaders()
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getSavedJobs(userId) {
  const res = await fetch(`${BASE_URL}/api/jobs/saved?user_id=${userId}`, {
    headers: authHeaders()
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function checkJobSaved(userId, title, company) {
  const params = new URLSearchParams({ user_id: userId, title, company })
  const res = await fetch(`${BASE_URL}/api/jobs/saved/check?${params}`, {
    headers: authHeaders()
  })
  if (!res.ok) return { is_saved: false }
  return res.json()
}

// ── Apply Kit ─────────────────────────────────────────────

export async function getApplyKit(userId, title, company) {
  const res = await fetch(`${BASE_URL}/api/jobs/apply-kit`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body   : JSON.stringify({ user_id: userId, title, company })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveMissingFields(userId, fields) {
  const res = await fetch(
    `${BASE_URL}/api/jobs/save-missing-fields?user_id=${userId}`,
    {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body   : JSON.stringify(fields)
    }
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}