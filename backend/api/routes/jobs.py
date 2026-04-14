# api/routes/jobs.py
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from api.database import db
from services.job_research_service import research_all_companies

router  = APIRouter()
limiter = Limiter(key_func=get_remote_address)

resume_collection       = db["resumes"]
companies_collection    = db["companies"]
scraped_jobs_collection = db["scraped_jobs"]

_job_store: dict[str, list] = {}


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
    job = await scraped_jobs_collection.find_one(
        {"user_id": user_id, "title": title, "company": company},
        {"_id": 0, "user_id": 0}
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job