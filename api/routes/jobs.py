# api/routes/jobs.py
import json
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from api.database import (
    resume_collection,
    companies_collection,
    jobs_collection,
    shortlist_collection
)
from phase1_matching.job_scraper import scrape_jobs
from phase1_matching.skill_matcher import run_matcher

router = APIRouter()


class ScrapeRequest(BaseModel):
    user_id: str


# ─────────────────────────────────────────────
# TRIGGER JOB SCRAPING
# ─────────────────────────────────────────────

@router.post("/jobs/scrape")
async def trigger_scrape(body: ScrapeRequest):
    """
    Fetches user profile + companies from MongoDB,
    runs Phase 1 Task 2 scraper, saves results to MongoDB.

    Frontend calls this after company selection is complete.
    """
    # Load user profile
    profile = await resume_collection.find_one({"user_id": body.user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    # Load user companies
    companies_doc = await companies_collection.find_one(
        {"user_id": body.user_id}
    )
    if not companies_doc:
        raise HTTPException(status_code=404, detail="No companies selected.")

    # Write to data/ files temporarily (Phase 1 code reads from files)
    with open("data/profile.json", "w") as f:
        json.dump({
            "skills"             : profile["skills"],
            "experience_level"   : profile["experience_level"],
            "years_of_experience": profile["years_of_experience"]
        }, f)

    with open("data/companies.json", "w") as f:
        json.dump(companies_doc["companies"], f)

    # Run Phase 1 scraper
    jobs = scrape_jobs()

    if not jobs:
        return {"message": "No jobs found.", "count": 0}

    # Save to MongoDB (delete old results for this user first)
    await jobs_collection.delete_many({"user_id": body.user_id})

    jobs_to_insert = [{**job, "user_id": body.user_id} for job in jobs]
    await jobs_collection.insert_many(jobs_to_insert)

    return {
        "message": f"{len(jobs)} jobs scraped and saved.",
        "count"  : len(jobs)
    }


# ─────────────────────────────────────────────
# TRIGGER SKILL MATCHING
# ─────────────────────────────────────────────

@router.post("/jobs/match")
async def trigger_match(body: ScrapeRequest):
    """
    Loads jobs from MongoDB for this user,
    runs Phase 1 Task 3 matcher,
    saves ranked shortlist back to MongoDB.
    """
    # Load profile
    profile = await resume_collection.find_one({"user_id": body.user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    # Load jobs for this user
    cursor   = jobs_collection.find({"user_id": body.user_id}, {"_id": 0})
    jobs     = await cursor.to_list(length=None)

    if not jobs:
        raise HTTPException(
            status_code=404,
            detail="No jobs found. Run scrape first."
        )

    # Write temp files for Phase 1 matcher
    with open("data/profile.json", "w") as f:
        json.dump({
            "skills"             : profile["skills"],
            "experience_level"   : profile["experience_level"],
            "years_of_experience": profile["years_of_experience"]
        }, f)

    with open("data/job_listings.json", "w") as f:
        json.dump(jobs, f)

    # Run Phase 1 matcher
    shortlist = run_matcher()

    # Save shortlist to MongoDB
    await shortlist_collection.delete_many({"user_id": body.user_id})

    shortlist_to_insert = [
        {**job, "user_id": body.user_id} for job in shortlist
    ]
    await shortlist_collection.insert_many(shortlist_to_insert)

    return {
        "message": f"{len(shortlist)} jobs ranked and saved.",
        "count"  : len(shortlist)
    }


# ─────────────────────────────────────────────
# GET PAGINATED JOB RESULTS
# ─────────────────────────────────────────────

@router.get("/jobs")
async def get_jobs(
    user_id  : str,
    page     : int = Query(default=1, ge=1),
    per_page : int = Query(default=10, ge=1, le=50),
    grade    : str = Query(default=None),
    company  : str = Query(default=None),
    level    : str = Query(default=None),
    location : str = Query(default=None)
):
    """
    Returns paginated, filtered job results for the frontend.

    Query parameters:
        user_id  → required, identifies whose jobs to fetch
        page     → page number (default 1)
        per_page → jobs per page (default 10, max 50)
        grade    → filter by A/B/C/D
        company  → filter by company name
        level    → filter by experience level
        location → filter by location string
    """
    # Build filter
    query = {"user_id": user_id}

    if grade:
        query["grade"] = grade
    if company:
        query["company"] = company
    if level:
        query["experience_level"] = level
    if location:
        query["location"] = {"$regex": location, "$options": "i"}

    total = await shortlist_collection.count_documents(query)

    if total == 0:
        return {
            "jobs"       : [],
            "total"      : 0,
            "page"       : page,
            "per_page"   : per_page,
            "total_pages": 0
        }

    skip        = (page - 1) * per_page
    total_pages = -(-total // per_page)   # ceiling division

    cursor = shortlist_collection.find(
        query,
        {"_id": 0, "user_id": 0}    # exclude internal fields
    ).skip(skip).limit(per_page)

    jobs = await cursor.to_list(length=per_page)

    return {
        "jobs"       : jobs,
        "total"      : total,
        "page"       : page,
        "per_page"   : per_page,
        "total_pages": total_pages
    }


# ─────────────────────────────────────────────
# GET SINGLE JOB DETAIL
# ─────────────────────────────────────────────

@router.get("/jobs/detail")
async def get_job_detail(user_id: str, title: str, company: str):
    """
    Returns full details of a single job for the detail page.
    Matches by title + company + user_id.
    """
    job = await shortlist_collection.find_one(
        {
            "user_id": user_id,
            "title"  : title,
            "company": company
        },
        {"_id": 0, "user_id": 0}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job