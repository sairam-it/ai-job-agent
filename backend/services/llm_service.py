# services/llm_service.py
import os
import json
import re
import asyncio
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# ── Two clients / models as specified ────────────────────
# Fast model  → bulk extraction (simple structured task)
# Smart model → semantic scoring (reasoning-heavy task)

_client       = Groq(api_key=os.environ.get("GROQ_API_KEY"))
FAST_MODEL    = "llama-3.1-8b-instant"
SMART_MODEL   = "llama-3.3-70b-versatile"


def _safe_json(text: str) -> dict | list | None:
    """
    Parses JSON from LLM response safely.
    Handles markdown fences and partial JSON wrapping.
    Returns None if parsing fails completely.
    """
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`").strip()
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
    Called via asyncio.to_thread — never blocks the event loop.

    JSON mode guarantees the response is always valid JSON,
    eliminating the need for regex cleanup in most cases.
    """
    messages = []

    if system:
        messages.append({"role": "system", "content": system})

    messages.append({"role": "user", "content": prompt})

    response = _client.chat.completions.create(
        model           = model,
        messages        = messages,
        response_format = {"type": "json_object"},
        temperature     = 0.1,    # low temp = consistent structured output
        max_tokens      = 2048,
    )

    return response.choices[0].message.content or ""


async def bulk_extract_jobs(
    pages       : list[dict],
    company_name: str,
    source_tag  : str = "selected"
) -> list[dict]:
    """
    Sends all scraped pages for one company in a single Groq call.
    Uses FAST_MODEL (llama-3.1-8b-instant) — sufficient for extraction.
    Wrapped in asyncio.to_thread so FastAPI event loop stays non-blocking.

    Returns list of extracted job dicts, empty list on failure.
    """
    if not pages:
        return []

    pages_text = ""
    for i, page in enumerate(pages[:4], 1):
        pages_text += f"\n--- PAGE {i} (URL: {page['url']}) ---\n{page['text'][:800]}\n"

    system_prompt = (
        "You are a job listing parser. "
        "Always respond with valid JSON only. "
        "Never include explanation or markdown outside the JSON."
    )

    user_prompt = f"""
Extract ALL distinct job listings from these {company_name} career pages.

Return a JSON object with this exact structure:
{{
  "jobs": [
    {{
      "title"           : "Job title string",
      "location"        : "City, Country or Remote",
      "experience_level": "entry" or "mid" or "senior" or null,
      "required_skills" : ["skill1", "skill2"],
      "description"     : "2-sentence role summary",
      "apply_url"       : "application URL string"
    }}
  ]
}}

Rules:
- Return at most 5 jobs total
- Only include real job listings
- If no jobs are found, return {{"jobs": []}}
- required_skills must be a list even if empty

PAGES:
{pages_text}
"""

    try:
        raw     = await asyncio.to_thread(_groq_chat, FAST_MODEL, user_prompt, system_prompt)
        parsed  = _safe_json(raw)

        if not parsed:
            return []

        # Handle both {"jobs": [...]} and bare [...] responses
        job_list = parsed if isinstance(parsed, list) else parsed.get("jobs", [])

        if not isinstance(job_list, list):
            return []

        jobs = []
        for job in job_list:
            if not job.get("title"):
                continue
            jobs.append({
                "title"           : str(job.get("title", "N/A")).strip(),
                "company"         : company_name,
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
        print(f"[Groq BulkExtract] Failed for {company_name}: {e}")
        return []


async def extract_job_details(
    scraped_text: str,
    company_name: str,
    page_url    : str,
    source_tag  : str = "selected"
) -> dict | None:
    """
    Single-page extraction — used as fallback when bulk fails.
    Uses FAST_MODEL for speed.
    Wrapped in asyncio.to_thread for non-blocking I/O.

    Returns a single job dict or None if extraction fails.
    """
    system_prompt = (
        "You are a job listing parser. "
        "Respond with valid JSON only."
    )

    user_prompt = f"""
Extract ONE job listing from this page.

Return this exact JSON structure (use null for missing fields):
{{
  "title"           : "Job title",
  "location"        : "City or Remote",
  "experience_level": "entry" or "mid" or "senior" or null,
  "required_skills" : ["skill1", "skill2"],
  "description"     : "2-sentence summary",
  "apply_url"       : "URL string"
}}

If no job listing found, return: {{"title": null}}

Company: {company_name}
URL: {page_url}

Content:
{scraped_text[:2500]}
"""

    try:
        raw    = await asyncio.to_thread(_groq_chat, FAST_MODEL, user_prompt, system_prompt)
        parsed = _safe_json(raw)

        if not parsed or not isinstance(parsed, dict) or not parsed.get("title"):
            return None

        return {
            "title"           : str(parsed["title"]).strip(),
            "company"         : company_name,
            "location"        : parsed.get("location") or "India",
            "experience_level": parsed.get("experience_level"),
            "required_skills" : parsed.get("required_skills") or [],
            "description"     : parsed.get("description") or "",
            "url"             : parsed.get("apply_url") or page_url,
            "date_posted"     : "Recent",
            "source"          : source_tag,
        }

    except Exception as e:
        print(f"[Groq Extract] Failed for {company_name}: {e}")
        return None


async def semantic_score(user_profile: dict, job: dict) -> dict:
    """
    Semantically scores a candidate against a job listing.
    Uses SMART_MODEL (llama-3.3-70b-versatile) for better reasoning.
    Wrapped in asyncio.to_thread for non-blocking I/O.

    Falls back to keyword matching if Groq call fails — the
    endpoint always returns a valid score dict regardless.
    """
    user_skills    = user_profile.get("skills", [])
    user_exp_level = user_profile.get("experience_level", "")
    user_years     = user_profile.get("years", 0)
    job_skills     = job.get("required_skills", [])
    job_description= job.get("description", "")
    job_level      = job.get("experience_level", "")

    system_prompt = (
        "You are a senior technical recruiter with 10 years of experience. "
        "Evaluate candidate-job fit objectively. "
        "Respond with valid JSON only."
    )

    user_prompt = f"""
Evaluate this candidate for this job.

CANDIDATE:
- Skills: {", ".join(user_skills) or "None listed"}
- Experience level: {user_exp_level or "Unknown"}
- Years of experience: {user_years}

JOB:
- Title: {job.get("title", "N/A")}
- Company: {job.get("company", "N/A")}
- Required skills: {", ".join(job_skills) or "Not specified"}
- Experience level required: {job_level or "Not specified"}
- Description: {job_description or "Not provided"}

Return this exact JSON:
{{
  "match_score"    : <integer between 0 and 100>,
  "matched_skills" : ["skills the candidate has that the job needs"],
  "missing_skills" : ["skills the job needs that candidate lacks"],
  "match_reason"   : "One clear sentence explaining the overall match quality.",
  "grade"          : "A" or "B" or "C" or "D"
}}

Grade rules: A = 80 to 100, B = 60 to 79, C = 40 to 59, D = below 40
Base the score on skill overlap, experience level alignment, and role relevance.
"""

    try:
        raw    = await asyncio.to_thread(_groq_chat, SMART_MODEL, user_prompt, system_prompt)
        result = _safe_json(raw)

        if not result or not isinstance(result, dict) or "match_score" not in result:
            raise ValueError("Invalid response structure from Groq")

        # Clamp and validate score
        score              = max(0, min(100, int(result["match_score"])))
        result["match_score"] = score

        # Re-derive grade from score to ensure consistency
        result["grade"] = (
            "A" if score >= 80 else
            "B" if score >= 60 else
            "C" if score >= 40 else "D"
        )

        # Ensure lists are actually lists
        result["matched_skills"] = result.get("matched_skills") or []
        result["missing_skills"] = result.get("missing_skills") or []
        result["match_reason"]   = result.get("match_reason") or "Match evaluated."

        return result

    except Exception as e:
        print(f"[Groq Score] Falling back to keyword match: {e}")
        return _keyword_fallback(user_skills, job_skills)


def _keyword_fallback(user_skills: list, job_skills: list) -> dict:
    """
    Pure Python fallback when Groq scoring fails.
    Guarantees the endpoint always returns a valid score.
    No external calls — instant.
    """
    if not job_skills:
        return {
            "match_score"   : 0,
            "matched_skills": [],
            "missing_skills": [],
            "grade"         : "D",
            "match_reason"  : "No required skills listed for this job."
        }

    user_set = set(s.lower() for s in user_skills)
    matched  = [s for s in job_skills if s.lower() in user_set]
    missing  = [s for s in job_skills if s.lower() not in user_set]
    score    = round(len(matched) / len(job_skills) * 100)
    grade    = "A" if score >= 80 else "B" if score >= 60 else "C" if score >= 40 else "D"

    return {
        "match_score"   : score,
        "matched_skills": matched,
        "missing_skills": missing,
        "grade"         : grade,
        "match_reason"  : (
            f"Keyword match: {len(matched)} of {len(job_skills)} required skills found."
        )
    }