# services/llm_service.py
import os
import json
import re
import asyncio
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# ── Two clients / models as specified ────────────────────
_client       = Groq(api_key=os.environ.get("GROQ_API_KEY"))
FAST_MODEL    = "llama-3.1-8b-instant"
SMART_MODEL   = "llama-3.3-70b-versatile"


def _safe_json(text: str) -> dict | list | None:
    """
    Parses JSON from LLM response safely.
    Handles markdown fences and partial JSON wrapping.
    Returns None if parsing fails completely.
    """
    text = re.sub(r"http://googleusercontent.com/immersive_entry_chip/0", "", text)
    try:
            return json.loads(text)
    except json.JSONDecodeError:
            match = re.search(r'[\[{].*[\]}]', text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except Exception:
                    return None
            return None


def _groq_chat(model: str, prompt: str, system: str = "") -> str:
    """
    Synchronous Groq call with JSON mode enabled.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = _client.chat.completions.create(
        model           = model,
        messages        = messages,
        response_format = {"type": "json_object"},
        temperature     = 0.1,
        max_tokens      = 2048,
    )
    return response.choices[0].message.content or ""


async def parse_resume(resume_text: str) -> dict:
    """
    Parses resume text to extract skills and professional experience only.
    Strictly excludes education years from the experience total.
    """
    system_prompt = (
        "You are a professional resume analytics engine. "
        "Respond with valid JSON only."
    )

    # Integrated your specific extraction rules here
    user_prompt = f"""
Extract details from this resume text.

EXTRACTION RULES FOR EXPERIENCE:
1. Divide the resume into 'Education' and 'Professional Work' sections.
2. ONLY calculate years from the 'Professional Work' section.
3. STRICT EXCLUSION: Do not count years listed for B.Tech, Degree, or Schooling (e.g., 2022-2026) as work experience.
4. If a job entry says 'Present', calculate from the start date until April 2026.
5. Return 'total_years_experience' as a float (e.g., 1.5). 
6. If no professional work is found, return 0.

RESUME TEXT:
{resume_text}

Return this exact JSON structure:
{{
"name": "Full Name",
"email": "Email Address",
"skills": ["skill1", "skill2"],
"total_years_experience": 0.0,
"experience_level": "entry" or "mid" or "senior"
}}
"""

    try:
        raw = await asyncio.to_thread(_groq_chat, SMART_MODEL, user_prompt, system_prompt)
        parsed = _safe_json(raw)
        return parsed or {}
    except Exception as e:
        print(f"[Groq ResumeParse] Failed: {e}")
        return {"total_years_experience": 0, "skills": [], "experience_level": "entry"}


async def bulk_extract_jobs(
    pages       : list[dict],
    company_name: str | None,    # None = infer from page content
    source_tag  : str = "selected"
) -> list[dict]:
    """
    Extracts job listings from scraped pages in one Groq call.

    When company_name is None (fallback/recommended jobs):
      LLM reads the company name from page content.
      This prevents "Various" appearing in job cards.

    Title accuracy:
      We instruct the LLM to copy the EXACT title from the page,
      not paraphrase or normalise it. This prevents title drift
      between our listing and the external portal.
    """
    if not pages:
        return []

    pages_text = ""
    for i, page in enumerate(pages[:4], 1):
        pages_text += f"\n--- PAGE {i} (URL: {page['url']}) ---\n{page['text'][:800]}\n"

    # Build company instruction based on whether name is known
    if company_name:
        company_instruction = f'Set "company" to exactly "{company_name}" for every job.'
    else:
        company_instruction = (
            'Set "company" to the exact company name found on the page. '
            'Read it from the page header, logo alt text, or "About" section. '
            'Never use "Various", "Unknown", or leave it empty.'
        )

    prompt = f"""
You are a job listing parser. Extract ALL distinct job listings from the pages below.
Return a JSON object with this exact structure:

{{
  "jobs": [
    {{
      "title"           : "EXACT job title as written on the page — do not paraphrase",
      "company"         : "company name",
      "location"        : "City, Country or Remote",
      "experience_level": "entry" | "mid" | "senior" | null,
      "required_skills" : ["skill1", "skill2"],
      "description"     : "2-sentence role summary",
      "apply_url"       : "direct application URL"
    }}
  ]
}}

Rules:
- Title: copy EXACTLY as written on the page, no rewording
- {company_instruction}
- Max 5 jobs total across all pages
- Return empty array if no real job listings found: {{"jobs": []}}
- required_skills must always be an array, even if empty
- apply_url should be the direct apply link if visible, otherwise the page URL

PAGES:
{pages_text}
"""

    try:
        raw    = await asyncio.to_thread(_groq_chat, FAST_MODEL, prompt,
                    "You are a precise job listing parser. Return only valid JSON.")
        parsed = _safe_json(raw)

        if not parsed:
            return []

        job_list = parsed if isinstance(parsed, list) else parsed.get("jobs", [])
        if not isinstance(job_list, list):
            return []

        jobs = []
        for job in job_list:
            title   = str(job.get("title", "")).strip()
            company = str(job.get("company", "")).strip()

            # Skip if essential fields missing or placeholder
            if not title or not company:
                continue
            if company.lower() in ("various", "unknown", "n/a", "company", ""):
                continue

            # Use company_name override if provided (selected companies)
            final_company = company_name if company_name else company

            jobs.append({
                "title"           : title,
                "company"         : final_company,
                "location"        : job.get("location") or "India",
                "experience_level": job.get("experience_level"),
                "required_skills" : job.get("required_skills") or [],
                "description"     : job.get("description") or "",
                "url"             : job.get("apply_url") or pages[0]["url"],
                "date_posted"     : "Recent",
                "source"          : source_tag,
            })

        return jobs

    except Exception as e:
        print(f"[LLM BulkExtract] Failed: {e}")
        return []


async def extract_job_details(
    scraped_text: str,
    company_name: str,
    page_url    : str,
    source_tag  : str = "selected"
) -> dict | None:
    """Fallback single-page extraction."""
    system_prompt = "You are a job listing parser. Respond with valid JSON only."
    user_prompt = f"Extract ONE job listing from this page. Content: {scraped_text[:2500]}"

    try:
        raw    = await asyncio.to_thread(_groq_chat, FAST_MODEL, user_prompt, system_prompt)
        parsed = _safe_json(raw)
        if not parsed or not parsed.get("title"): return None
        return {
            "title": str(parsed["title"]).strip(),
            "company": company_name,
            "location": parsed.get("location") or "India",
            "required_skills": parsed.get("required_skills") or [],
            "description": parsed.get("description") or "",
            "url": parsed.get("apply_url") or page_url,
            "source": source_tag,
        }
    except Exception:
        return None


async def semantic_score(user_profile: dict, job: dict) -> dict:
    """Semantically scores a candidate against a job listing."""
    user_skills    = user_profile.get("skills", [])
    user_exp_level = user_profile.get("experience_level", "")
    user_years     = user_profile.get("years", 0)
    job_skills     = job.get("required_skills", [])
    
    system_prompt = "You are a senior technical recruiter. Evaluate candidate-job fit. JSON only."
    user_prompt = f"""
Evaluate candidate (Skills: {user_skills}, Exp: {user_years}) 
against Job (Title: {job.get('title')}, Skills: {job_skills}).
Return JSON: {{"match_score": int, "matched_skills": [], "missing_skills": [], "match_reason": str, "grade": str}}
"""

    try:
        raw    = await asyncio.to_thread(_groq_chat, SMART_MODEL, user_prompt, system_prompt)
        result = _safe_json(raw)
        if not result or "match_score" not in result: raise ValueError("Invalid score")
        score = max(0, min(100, int(result["match_score"])))
        result["match_score"] = score
        result["grade"] = "A" if score >= 80 else "B" if score >= 60 else "C" if score >= 40 else "D"
        return result
    except Exception:
        return _keyword_fallback(user_skills, job_skills)


def _keyword_fallback(user_skills: list, job_skills: list) -> dict:
    """Fallback keyword matching."""
    user_set = set(s.lower() for s in user_skills)
    matched  = [s for s in job_skills if s.lower() in user_set]
    missing  = [s for s in job_skills if s.lower() not in user_set]
    score    = round(len(matched) / len(job_skills) * 100) if job_skills else 0
    return {
        "match_score": score,
        "matched_skills": matched,
        "missing_skills": missing,
        "grade": "A" if score >= 80 else "D",
        "match_reason": "Keyword fallback used."
    }


async def generate_cover_letter_for_job(
    profile : dict,
    job     : dict
) -> str:
    """
    Generates a personalized cover letter using profile + job context.
    Called when user's profile has no default cover_letter_bio.
    """
    user_skills    = profile.get("skills", [])[:10]
    matched_skills = job.get("matched_skills", [])
    user_name      = profile.get("name", "")
    job_title      = job.get("title", "")
    company        = job.get("company", "")
    experience_lvl = profile.get("experience_level", "")
    years          = profile.get("years", 0)
    match_reason   = job.get("match_reason", "")

    prompt = f"""
Write a professional 3-paragraph cover letter for this job application.

CANDIDATE:
  Name: {user_name}
  Skills: {", ".join(user_skills)}
  Experience: {experience_lvl} level, {years} years
  Why they match: {match_reason}

JOB:
  Title: {job_title}
  Company: {company}
  Required skills matched: {", ".join(matched_skills)}

Rules:
- Paragraph 1: Opening — express interest, mention the role and company
- Paragraph 2: Highlight 2-3 most relevant matched skills with brief context
- Paragraph 3: Close — express enthusiasm, mention availability
- Keep it under 250 words
- Professional but not robotic tone
- Do NOT include date, address headers, or "Dear Hiring Manager" salutation
- Return ONLY the cover letter text, no labels or JSON

Return a plain text cover letter body only.
"""

    try:
        raw = await asyncio.to_thread(
            _groq_chat,
            SMART_MODEL,
            prompt,
            "You are a professional career coach writing cover letters."
        )
        # For cover letters, we want plain text not JSON
        return raw.strip()
    except Exception as e:
        print(f"[Cover Letter] Generation failed: {e}")
        return (
            f"I am writing to express my strong interest in the {job_title} "
            f"position at {company}. With {years} years of experience in "
            f"{', '.join(user_skills[:3])}, I am confident I can contribute "
            f"meaningfully to your team. I would welcome the opportunity to "
            f"discuss how my background aligns with your requirements."
        )
    


def _groq_chat(model: str, prompt: str, system: str = "", json_mode: bool = True) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs = {
        "model"      : model,
        "messages"   : messages,
        "temperature": 0.1,
        "max_tokens" : 2048,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = _client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""