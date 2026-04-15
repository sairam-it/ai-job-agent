// lib/api.js

const BASE_URL = 'http://localhost:8000'

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
  /**
   * GET /api/companies/{user_id}
   * Returns: { selected_companies, custom_companies_list, hidden_companies }
   * Called on /companies page mount to restore previous state.
   */
  const res = await fetch(`${BASE_URL}/api/companies/${userId}`, {
    headers: authHeaders()
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function selectCompanies(userId, companies) {
  /**
   * POST /api/companies/select
   * Saves selected companies. Auto-detects and stores custom ones.
   */
  const res = await fetch(`${BASE_URL}/api/companies/select`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body   : JSON.stringify({ user_id: userId, companies })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteCompany(userId, companyName) {
  /**
   * DELETE /api/companies/{user_id}/{company_name}
   * Hides company from user's view permanently.
   * Encoded to handle spaces and special chars in company names.
   */
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