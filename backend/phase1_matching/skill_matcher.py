# skill_matcher.py
import math

MIN_SKILLS_COUNT     = 3
TOP_JOBS_PER_COMPANY = 6


def calculate_match(user_skills, required_skills):
    if not required_skills:
        return 0, 0, [], []

    user_set      = set(s.lower() for s in user_skills)
    required_set  = set(s.lower() for s in required_skills)
    matched_lower = user_set & required_set
    missing_lower = required_set - user_set

    matched     = [s for s in required_skills if s.lower() in matched_lower]
    missing     = [s for s in required_skills if s.lower() in missing_lower]
    raw_score   = round((len(matched) / len(required_skills)) * 100)
    match_score = round(raw_score * math.log(len(matched) + 1))

    return raw_score, match_score, matched, missing


def get_grade(raw_score, skills_count):
    if skills_count < MIN_SKILLS_COUNT:
        return "D"
    if raw_score >= 80: return "A"
    if raw_score >= 60: return "B"
    if raw_score >= 40: return "C"
    return "D"


def match_jobs(user_skills, jobs):
    scored = []

    for job in jobs:
        required = job.get("required_skills", [])
        raw, weighted, matched, missing = calculate_match(user_skills, required)

        if raw == 0:
            continue

        scored.append({
            "title"           : job["title"],
            "company"         : job["company"],
            "location"        : job["location"],
            "url"             : job["url"],
            "date_posted"     : job["date_posted"],
            "experience_level": job.get("experience_level"),
            "grade"           : get_grade(raw, len(required)),
            "raw_match"       : raw,
            "match_score"     : weighted,
            "matched_skills"  : matched,
            "missing_skills"  : missing,
            "all_required"    : required,
            "description"     : job.get("description", "")
        })

    scored.sort(key=lambda x: x["match_score"], reverse=True)

    company_counts = {}
    final_results  = []

    for job in scored:
        company = job["company"]
        count   = company_counts.get(company, 0)
        if count < TOP_JOBS_PER_COMPANY:
            final_results.append(job)
            company_counts[company] = count + 1

    final_results.sort(key=lambda x: x["match_score"], reverse=True)
    return final_results


def run_matcher(user_skills: list, jobs: list) -> list:
    """
    Refactored to accept parameters directly — no disk I/O.

    Parameters:
        user_skills : list of skill strings from user's resume
        jobs        : list of job dicts from scraper (in-memory)

    Returns:
        list of ranked, graded job dicts (in-memory only)
    """
    if not user_skills:
        print("[✗] No skills provided to matcher.")
        return []

    if not jobs:
        print("[✗] No jobs provided to matcher.")
        return []

    return match_jobs(user_skills, jobs)