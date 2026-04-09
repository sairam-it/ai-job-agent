# api/routes/jobs.py
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from api.database import (
    resume_collection,
    companies_collection,
    jobs_collection,
    shortlist_collection
)
from phase1_matching.job_scraper import scrape_jobs
from phase1_matching.skill_matcher import run_matcher

router  = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# ── In-memory job store — keyed by user_id ───────────────
# Jobs only needed between scrape and match (~30 seconds)
# Cleared after matching to free memory
# User A's jobs never touch User B's jobs
_job_store: dict[str, list] = {}


class ScrapeRequest(BaseModel):
    user_id: str


def build_profile_dict(profile: dict) -> dict:
    """
    Safely reads profile from MongoDB regardless of which
    parser stored it (years vs years_of_experience field names).
    """
    years = (
        profile.get("years_of_experience") or
        profile.get("years") or
        0
    )
    return {
        "skills"             : profile.get("skills", []),
        "experience_level"   : profile.get("experience_level"),
        "years_of_experience": years
    }


# ── Scrape ────────────────────────────────────────────────

@router.post("/jobs/scrape")
@limiter.limit("5/minute")
async def trigger_scrape(request: Request, body: ScrapeRequest):
    """
    Rate limited: 5 requests/minute per IP.
    Reads profile + companies from MongoDB.
    Runs scraper with data passed directly (no disk I/O).
    Stores results in _job_store[user_id] and MongoDB.
    """
    profile = await resume_collection.find_one({"user_id": body.user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Upload resume first.")

    companies_doc = await companies_collection.find_one({"user_id": body.user_id})
    if not companies_doc:
        raise HTTPException(status_code=404, detail="No companies selected.")

    user_skills = profile.get("skills", [])
    if not user_skills:
        raise HTTPException(status_code=400, detail="No skills in profile. Re-upload resume.")

    companies = companies_doc.get("companies", [])

    # ── Run scraper with direct params — zero disk I/O ───
    jobs = scrape_jobs(user_skills=user_skills, companies=companies)

    if not jobs:
        return {"message": "No jobs found for your skills and companies.", "count": 0}

    # ── Store in memory for immediate matching ────────────
    _job_store[body.user_id] = jobs

    # ── Also persist to MongoDB jobs collection ───────────
    await jobs_collection.delete_many({"user_id": body.user_id})
    await jobs_collection.insert_many([
        {**job, "user_id": body.user_id} for job in jobs
    ])

    return {
        "message": f"{len(jobs)} jobs scraped.",
        "count"  : len(jobs)
    }


# ── Match ─────────────────────────────────────────────────

@router.post("/jobs/match")
@limiter.limit("10/minute")
async def trigger_match(request: Request, body: ScrapeRequest):
    """
    Rate limited: 10 requests/minute per IP.
    Reads user skills from MongoDB.
    Reads jobs from _job_store (memory-first) with MongoDB fallback.
    Runs matcher with data passed directly (no disk I/O).
    Saves shortlist to MongoDB and clears memory store.
    """
    profile = await resume_collection.find_one({"user_id": body.user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    user_skills = profile.get("skills", [])
    if not user_skills:
        raise HTTPException(status_code=400, detail="No skills in profile.")

    # ── Memory-first: use in-memory jobs if available ─────
    jobs = _job_store.get(body.user_id)

    # ── Fallback: load from MongoDB if memory was cleared ─
    if not jobs:
        cursor = jobs_collection.find(
            {"user_id": body.user_id},
            {"_id": 0, "user_id": 0}
        )
        jobs = await cursor.to_list(length=None)

    if not jobs:
        raise HTTPException(
            status_code=404,
            detail="No scraped jobs found. Please run scrape first."
        )

    # ── Run matcher with direct params — zero disk I/O ────
    shortlist = run_matcher(user_skills=user_skills, jobs=jobs)

    if not shortlist:
        # Clear memory store even on empty result
        _job_store.pop(body.user_id, None)
        return {"message": "No matching jobs found.", "count": 0}

    # ── Save shortlist to MongoDB ─────────────────────────
    await shortlist_collection.delete_many({"user_id": body.user_id})
    await shortlist_collection.insert_many([
        {**job, "user_id": body.user_id} for job in shortlist
    ])

    # ── Clear memory store — free RAM ────────────────────
    _job_store.pop(body.user_id, None)

    return {
        "message": f"{len(shortlist)} jobs ranked.",
        "count"  : len(shortlist)
    }


# ── Get paginated jobs ────────────────────────────────────

@router.get("/jobs")
async def get_jobs(
    user_id : str,
    page    : int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=50),
    grade   : str = Query(default=None),
    company : str = Query(default=None),
    level   : str = Query(default=None),
    location: str = Query(default=None),
    sort_by : str = Query(default="match")
):
    query = {"user_id": user_id}

    if grade:
        query["grade"]   = grade
    if company:
        query["company"] = company
    if level:
        query["experience_level"] = level
    if location:
        query["location"] = {"$regex": location, "$options": "i"}

    total = await shortlist_collection.count_documents(query)

    if total == 0:
        return {
            "jobs": [], "total": 0,
            "page": page, "per_page": per_page, "total_pages": 0
        }

    skip        = (page - 1) * per_page
    total_pages = -(-total // per_page)
    sort_field  = "match_score" if sort_by == "match" else "date_posted"

    cursor = shortlist_collection.find(
        query,
        {"_id": 0, "user_id": 0}
    ).sort(sort_field, -1).skip(skip).limit(per_page)

    jobs = await cursor.to_list(length=per_page)

    return {
        "jobs"       : jobs,
        "total"      : total,
        "page"       : page,
        "per_page"   : per_page,
        "total_pages": total_pages
    }


# ── Get single job detail ─────────────────────────────────

@router.get("/jobs/detail")
async def get_job_detail(user_id: str, title: str, company: str):
    job = await shortlist_collection.find_one(
        {"user_id": user_id, "title": title, "company": company},
        {"_id": 0, "user_id": 0}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job