# api/routes/jobs.py
import json
from fastapi import APIRouter, HTTPException
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


def build_profile_json(profile):
    """
    Safely builds the profile dict written to data/profile.json.
    Handles both field name variants:
        resume_parser.py        → stores "years_of_experience"
        resume_section_parser.py → stores "years"
    Uses .get() with fallback so neither causes a KeyError.
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


@router.post("/jobs/scrape")
async def trigger_scrape(body: ScrapeRequest):
    profile = await resume_collection.find_one({"user_id": body.user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Upload resume first.")

    companies_doc = await companies_collection.find_one({"user_id": body.user_id})
    if not companies_doc:
        raise HTTPException(status_code=404, detail="No companies selected.")

    if not profile.get("skills"):
        raise HTTPException(status_code=400, detail="No skills found in profile. Re-upload resume.")

    # Write temp files for Phase 1 scraper
    with open("data/profile.json", "w") as f:
        json.dump(build_profile_json(profile), f)

    with open("data/companies.json", "w") as f:
        json.dump(companies_doc.get("companies", []), f)

    jobs = scrape_jobs()

    if not jobs:
        return {"message": "No jobs found for your skills and selected companies.", "count": 0}

    await jobs_collection.delete_many({"user_id": body.user_id})
    await jobs_collection.insert_many([{**job, "user_id": body.user_id} for job in jobs])

    return {
        "message": f"{len(jobs)} jobs scraped and saved.",
        "count"  : len(jobs)
    }


@router.post("/jobs/match")
async def trigger_match(body: ScrapeRequest):
    profile = await resume_collection.find_one({"user_id": body.user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    cursor = jobs_collection.find({"user_id": body.user_id}, {"_id": 0, "user_id": 0})
    jobs   = await cursor.to_list(length=None)

    if not jobs:
        raise HTTPException(status_code=404, detail="No scraped jobs found. Run scrape first.")

    # Write temp files for Phase 1 matcher
    with open("data/profile.json", "w") as f:
        json.dump(build_profile_json(profile), f)

    with open("data/job_listings.json", "w") as f:
        json.dump(jobs, f)

    shortlist = run_matcher()

    if not shortlist:
        return {"message": "No matching jobs found.", "count": 0}

    await shortlist_collection.delete_many({"user_id": body.user_id})
    await shortlist_collection.insert_many([
        {**job, "user_id": body.user_id} for job in shortlist
    ])

    return {
        "message": f"{len(shortlist)} jobs ranked and saved.",
        "count"  : len(shortlist)
    }


@router.get("/jobs")
async def get_jobs(
    user_id : str,
    page    : int = 1,
    per_page: int = 10,
    grade   : str = None,
    company : str = None,
    level   : str = None,
    location: str = None,
    sort_by : str = "match"
):
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
    total_pages = -(-total // per_page)

    # Sort by confidence score (match_score) or date
    sort_field = "match_score" if sort_by == "match" else "date_posted"

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


@router.get("/jobs/detail")
async def get_job_detail(user_id: str, title: str, company: str):
    job = await shortlist_collection.find_one(
        {"user_id": user_id, "title": title, "company": company},
        {"_id": 0, "user_id": 0}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job