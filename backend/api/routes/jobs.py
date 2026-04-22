# api/routes/jobs.py
from slowapi import Limiter
from slowapi.util import get_remote_address
from api.database import db
from api.auth_utils import decode_token
from services.job_research_service import research_all_companies

from services.apply_service import generate_apply_kit
from services.llm_service import generate_cover_letter_for_job

from fastapi import APIRouter, HTTPException, Request, Query, Header, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

router  = APIRouter()
limiter = Limiter(key_func=get_remote_address)

resume_collection       = db["resumes"]
companies_collection    = db["companies"]
scraped_jobs_collection = db["scraped_jobs"]
saved_jobs_collection = db["saved_jobs"]

_job_store: dict[str, list] = {}


def get_user_from_token(authorization: str):
    """Extracts user_id from Bearer token header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token.")
    try:
        return decode_token(authorization.split(" ")[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Token expired or invalid.")


class ScrapeRequest(BaseModel):
    user_id: str


def build_profile_dict(profile: dict) -> dict:
    years = profile.get("years_of_experience") or profile.get("years") or 0
    return {
        "skills"             : profile.get("skills", []),
        "experience_level"   : profile.get("experience_level"),
        "years_of_experience": years,
        "years"              : years,
    }


@router.post("/jobs/scrape")
@limiter.limit("5/minute")
async def trigger_scrape(request: Request, body: ScrapeRequest):
    profile = await resume_collection.find_one({"user_id": body.user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Upload resume first.")

    companies_doc = await companies_collection.find_one({"user_id": body.user_id})
    if not companies_doc:
        raise HTTPException(status_code=404, detail="No companies selected.")

    user_skills = profile.get("skills", [])
    if not user_skills:
        raise HTTPException(status_code=400, detail="No skills in profile. Re-upload resume.")

    companies    = companies_doc.get("companies", [])
    user_profile = build_profile_dict(profile)

    jobs = await research_all_companies(
        companies    = companies,
        user_profile = user_profile
    )

    if not jobs:
        return {"message": "No jobs found. Try different companies or skills.", "count": 0}

    _job_store[body.user_id] = jobs

    await scraped_jobs_collection.delete_many({"user_id": body.user_id})
    await scraped_jobs_collection.insert_many([
        {**job, "user_id": body.user_id} for job in jobs
    ])

    selected_count    = sum(1 for j in jobs if j.get("source") != "recommended")
    recommended_count = sum(1 for j in jobs if j.get("source") == "recommended")

    return {
        "message"          : f"{len(jobs)} jobs found.",
        "count"            : len(jobs),
        "selected_count"   : selected_count,
        "recommended_count": recommended_count
    }


@router.post("/jobs/match")
@limiter.limit("10/minute")
async def trigger_match(request: Request, body: ScrapeRequest):
    count = await scraped_jobs_collection.count_documents({"user_id": body.user_id})
    if count == 0:
        jobs = _job_store.get(body.user_id, [])
        if not jobs:
            raise HTTPException(status_code=404, detail="No results. Run search first.")
        count = len(jobs)
    _job_store.pop(body.user_id, None)
    return {"message": f"{count} matched jobs ready.", "count": count}


@router.get("/jobs")
async def get_jobs(
    user_id : str,
    page    : int   = Query(default=1, ge=1),
    per_page: int   = Query(default=10, ge=1, le=50),
    grade   : str   = Query(default=None),
    company : str   = Query(default=None),
    level   : str   = Query(default=None),
    location: str   = Query(default=None),
    source  : str   = Query(default=None),   # "selected" | "recommended"
    sort_by : str   = Query(default="match")
):
    query = {"user_id": user_id}

    if grade:    query["grade"]            = grade
    if company:  query["company"]          = company
    if level:    query["experience_level"] = level
    if location: query["location"]         = {"$regex": location, "$options": "i"}
    if source:   query["source"]           = source

    total = await scraped_jobs_collection.count_documents(query)
    if total == 0:
        return {"jobs": [], "total": 0, "page": page, "per_page": per_page, "total_pages": 0}

    skip        = (page - 1) * per_page
    total_pages = -(-total // per_page)
    sort_field  = "match_score" if sort_by == "match" else "date_posted"

    cursor = scraped_jobs_collection.find(
        query, {"_id": 0, "user_id": 0}
    ).sort(sort_field, -1).skip(skip).limit(per_page)

    jobs = await cursor.to_list(length=per_page)
    return {
        "jobs": jobs, "total": total,
        "page": page, "per_page": per_page, "total_pages": total_pages
    }


@router.get("/jobs/detail")
async def get_job_detail(user_id: str, title: str, company: str):
    """
    Looks up a job by title + company for this user.

    Two-collection lookup strategy:
      1. Check scraped_jobs (live research results)
      2. If not found, check saved_jobs (favorites)

    This fixes "Job not found" when navigating from /favorites,
    because saved/demo jobs may only exist in saved_jobs.
    """
    # Primary: scraped_jobs collection
    job = await scraped_jobs_collection.find_one(
        {"user_id": user_id, "title": title, "company": company},
        {"_id": 0, "user_id": 0}
    )

    # Fallback: saved_jobs collection
    if not job:
        job = await db["saved_jobs"].find_one(
            {"user_id": user_id, "title": title, "company": company},
            {"_id": 0, "user_id": 0, "saved_at": 0}
        )

    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return job


class ApplyKitRequest(BaseModel):
    user_id : str
    title   : str
    company : str


# In jobs.py — replace the /jobs/apply-kit endpoint

@router.post("/jobs/apply-kit")
@limiter.limit("20/minute")
async def get_apply_kit(request: Request, body: ApplyKitRequest):
    """
    Generates pre-filled apply kit for a specific job.
    Resolves job URL with 3-level fallback and validates format.
    """
    profile = await resume_collection.find_one(
        {"user_id": body.user_id},
        {"_id": 0}
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    job = await scraped_jobs_collection.find_one(
        {
            "user_id": body.user_id,
            "title"  : body.title,
            "company": body.company,
        },
        {"_id": 0, "user_id": 0}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # ── URL Resolution: 3-level fallback ──────────────────
    # Level 1: direct apply URL stored in job
    # Level 2: raw source page we scraped
    # Level 3: Google search for the job title + company
    def resolve_job_url(job: dict) -> tuple[str, str]:
        """
        Returns (url, url_status) where url_status is:
          'direct'   → actual apply URL, reliable
          'source'   → scraped source page, may need navigation
          'search'   → Google search fallback, portal unknown
          'missing'  → no URL at all
        """
        # Try direct apply URL first
        url = job.get("url", "").strip()
        if url and is_valid_url(url):
            return ensure_https(url), "direct"

        # Try raw source page
        raw = job.get("raw_source", "").strip()
        if raw and is_valid_url(raw):
            return ensure_https(raw), "source"

        # Try apply_url field (some scrapers use this key)
        apply = job.get("apply_url", "").strip()
        if apply and is_valid_url(apply):
            return ensure_https(apply), "direct"

        # Last resort: Google search
        query = f"{job.get('title', '')} {job.get('company', '')} job apply"
        search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
        return search_url, "search"

    def is_valid_url(url: str) -> bool:
        """Returns False for empty, placeholder, or localhost URLs."""
        if not url:
            return False
        invalid = [
            "[ download", "placeholder", "n/a", "none",
            "localhost", "127.0.0.1", "example.com"
        ]
        url_lower = url.lower()
        return not any(x in url_lower for x in invalid)

    def ensure_https(url: str) -> str:
        """Adds https:// if no protocol present."""
        if url.startswith("http://") or url.startswith("https://"):
            return url
        return "https://" + url

    resolved_url, url_status = resolve_job_url(job)

    # ── Cover letter ───────────────────────────────────────
    cover_letter = profile.get("cover_letter_bio", "")
    if not cover_letter:
        try:
            from services.llm_service import generate_cover_letter_for_job
            cover_letter = await generate_cover_letter_for_job(profile, job)
        except Exception as e:
            print(f"[ApplyKit] Cover letter generation failed: {e}")
            name = profile.get("name", "")
            cover_letter = (
                f"I am writing to express my strong interest in the "
                f"{job.get('title', 'position')} role at {job.get('company', 'your company')}. "
                f"My background in {', '.join(profile.get('skills', [])[:3])} "
                f"makes me a strong fit for this opportunity."
            )

    profile_with_cl = {**profile, "cover_letter_bio": cover_letter}

    from services.apply_service import generate_apply_kit
    kit = generate_apply_kit(
        profile  = profile_with_cl,
        job_url  = resolved_url,
        job      = job
    )

    return {
        "job": {
            "title"     : job.get("title"),
            "company"   : job.get("company"),
            "location"  : job.get("location"),
            "url"       : resolved_url,
            "url_status": url_status,
            "grade"     : job.get("grade"),
            "match_score": job.get("match_score"),
        },
        "kit"         : kit,
        "cover_letter": cover_letter,
    }

@router.post("/jobs/save-missing-fields")
async def save_missing_fields(
    request: Request,
    user_id: str,
    fields : dict   # { "linkedin_url": "...", "city": "..." }
):
    """
    Saves user-provided missing fields to MongoDB.
    Called after user fills the missing fields prompt.
    Next time they apply, these fields are pre-filled.
    """
    if not fields:
        return {"message": "No fields to save."}

    await resume_collection.update_one(
        {"user_id": user_id},
        {"$set": fields}
    )

    return {
        "message": f"Saved {len(fields)} fields to your profile.",
        "fields" : list(fields.keys())
    }

# api/routes/jobs.py — replace the save_job endpoint only

class SaveJobRequest(BaseModel):
    user_id          : str
    title            : str
    company          : str
    location         : str          = ""
    url              : str          = ""
    url_status       : str          = "direct"
    grade            : str          = ""
    match_score      : int          = 0
    raw_match        : int          = 0
    experience_level : str          = ""
    description      : str          = ""
    matched_skills   : List[str]    = Field(default_factory=list)
    missing_skills   : List[str]    = Field(default_factory=list)
    required_skills  : List[str]    = Field(default_factory=list)
    match_reason     : str          = ""
    source           : str          = "selected"
    date_posted      : str          = ""


@router.post("/jobs/save")
async def save_job(body: SaveJobRequest, authorization: str = Header(None)):
    """
    Saves a job to user's personal favorites.

    User isolation strategy:
      Every document in saved_jobs has user_id field.
      All queries filter by user_id — impossible to
      read another user's saved jobs without their user_id.
      MongoDB compound index on (user_id, title, company)
      enforces uniqueness per user, not globally.

    Two-path save:
      Path 1 — job exists in scraped_jobs for this user
      Path 2 — build document from request body (demo data,
               seeded jobs, or jobs from other sessions)
    """
    # Verify token
    calling_user = get_user_from_token(authorization)

    # Security: user_id in body must match token
    if calling_user != body.user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot save jobs for another user."
        )

    # Path 1: look up from scraped_jobs
    scraped = await scraped_jobs_collection.find_one(
        {
            "user_id": body.user_id,
            "title"  : body.title,
            "company": body.company,
        },
        {"_id": 0}
    )

    if scraped:
        save_doc = {k: v for k, v in scraped.items() if k != "_id"}
    else:
        # Path 2: build from request body
        save_doc = {
            "title"          : body.title,
            "company"        : body.company,
            "location"       : body.location,
            "url"            : body.url,
            "url_status"     : body.url_status,
            "grade"          : body.grade,
            "match_score"    : body.match_score,
            "raw_match"      : body.raw_match,
            "experience_level": body.experience_level,
            "description"    : body.description,
            "matched_skills" : body.matched_skills,
            "missing_skills" : body.missing_skills,
            "required_skills": body.required_skills,
            "match_reason"   : body.match_reason,
            "source"         : body.source,
            "date_posted"    : body.date_posted,
        }

    # Always overwrite user_id and saved_at with authoritative values
    save_doc["user_id"]  = body.user_id
    save_doc["saved_at"] = datetime.utcnow().isoformat()

    await saved_jobs_collection.update_one(
        {
            "user_id": body.user_id,
            "title"  : body.title,
            "company": body.company,
        },
        {"$set": save_doc},
        upsert=True
    )

    return {"message": f"'{body.title}' saved to your favorites.", "saved": True}


@router.delete("/jobs/save")
async def unsave_job(
    user_id      : str,
    title        : str,
    company      : str,
    authorization: str = Header(None)
):
    calling_user = get_user_from_token(authorization)
    if calling_user != user_id:
        raise HTTPException(status_code=403, detail="Cannot modify another user's favorites.")

    result = await saved_jobs_collection.delete_one(
        {"user_id": user_id, "title": title, "company": company}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved job not found.")

    return {"message": f"'{title}' removed from favorites.", "saved": False}


@router.get("/jobs/saved")
async def get_saved_jobs(
    user_id      : str,
    authorization: str = Header(None)
):
    calling_user = get_user_from_token(authorization)
    if calling_user != user_id:
        raise HTTPException(status_code=403, detail="Cannot view another user's favorites.")

    cursor = saved_jobs_collection.find(
        {"user_id": user_id},
        {"_id": 0, "user_id": 0}
    ).sort("saved_at", -1)

    jobs = await cursor.to_list(length=500)
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/jobs/saved/check")
async def check_job_saved(
    user_id      : str,
    title        : str,
    company      : str,
    authorization: str = Header(None)
):
    existing = await saved_jobs_collection.find_one(
        {"user_id": user_id, "title": title, "company": company},
        {"_id": 1}
    )
    return {"is_saved": existing is not None}
