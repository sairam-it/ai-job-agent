# api/models/job.py
from pydantic import BaseModel
from typing import Optional

class Job(BaseModel):
    title            : str
    company          : str
    location         : str
    url              : str
    date_posted      : str
    description      : str
    required_skills  : list[str]
    experience_level : Optional[str] = None

class ShortlistedJob(BaseModel):
    title            : str
    company          : str
    location         : str
    url              : str
    date_posted      : str
    experience_level : Optional[str] = None
    grade            : str
    raw_match        : int
    match_score      : int
    matched_skills   : list[str]
    missing_skills   : list[str]
    all_required     : list[str]
    description      : str

class PaginatedJobsResponse(BaseModel):
    jobs         : list[ShortlistedJob]
    total        : int
    page         : int
    per_page     : int
    total_pages  : int