const BASE_URL = "http://localhost:8000"

export async function uploadResume(file) {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch(`${BASE_URL}/api/resume/upload`, {
    method: "POST",
    body: formData
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
  // Returns: { user_id, profile: { skills, experience_level, years } }
}

export async function getProfile(user_id) {
  const res = await fetch(`${BASE_URL}/api/resume/${user_id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function selectCompanies(user_id, companies) {
  const res = await fetch(`${BASE_URL}/api/companies/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, companies })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function scrapeJobs(user_id) {
  const res = await fetch(`${BASE_URL}/api/jobs/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
  // Returns: { message, count }
}

export async function matchJobs(user_id) {
  const res = await fetch(`${BASE_URL}/api/jobs/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
  // Returns: { message, count }
}

export async function getJobs(user_id, page = 1, filters = {}) {
  const params = new URLSearchParams({
    user_id,
    page: String(page),
    per_page: "10",
  })
  
  // Add filters to params
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'any') {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v))
      } else {
        params.append(key, String(value))
      }
    }
  })
  
  const res = await fetch(`${BASE_URL}/api/jobs?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
  // Returns: { jobs, total, page, per_page, total_pages }
}

export async function getJobDetail(user_id, title, company) {
  const params = new URLSearchParams({ user_id, title, company })
  const res = await fetch(`${BASE_URL}/api/jobs/detail?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
