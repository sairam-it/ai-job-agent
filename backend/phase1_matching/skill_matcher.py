# skill_matcher.py
import json
import math

PROFILE_PATH     = "data/profile.json"
JOBS_PATH        = "data/job_listings.json"
OUTPUT_PATH      = "data/shortlist.json"
MIN_SKILLS_COUNT = 3     # job must have 3+ skills to rank meaningfully
TOP_JOBS_PER_COMPANY = 6 # Golden Number — top 6 per company


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def calculate_match(user_skills, required_skills):
    if not required_skills:
        return 0, 0, [], []

    user_set      = set(s.lower() for s in user_skills)
    required_set  = set(s.lower() for s in required_skills)
    matched_lower = user_set & required_set
    missing_lower = required_set - user_set

    matched    = [s for s in required_skills if s.lower() in matched_lower]
    missing    = [s for s in required_skills if s.lower() in missing_lower]
    raw_score  = round((len(matched) / len(required_skills)) * 100)
    match_score= round(raw_score * math.log(len(matched) + 1))

    return raw_score, match_score, matched, missing


def get_grade(raw_score, skills_count):
    if skills_count < MIN_SKILLS_COUNT:
        return "D"
    if raw_score >= 80: return "A"
    if raw_score >= 60: return "B"
    if raw_score >= 40: return "C"
    return "D"


def match_jobs(user_skills, jobs):
    """
    Three refinements applied here:

    Refinement 1 — Zero-percent filter:
        Jobs with 0% raw match are completely excluded.
        No skill overlap = no value to the user = don't show it.

    Refinement 2 — Golden Number (top N per company):
        After scoring all jobs, keep only top TOP_JOBS_PER_COMPANY
        per company based on match_score.
        Prevents one company flooding results with 40+ jobs.

    Refinement 3 — Confidence-weighted ranking:
        Final sort is strictly by match_score (confidence-weighted),
        not raw percentage. This is already implemented.
    """
    # Step 1 — Score every job
    scored = []
    for job in jobs:
        required = job.get("required_skills", [])
        raw, weighted, matched, missing = calculate_match(user_skills, required)

        # Refinement 1: skip zero-match jobs entirely
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

    # Step 2: sort all by confidence score first
    scored.sort(key=lambda x: x["match_score"], reverse=True)

    # Refinement 2: keep only top N per company (Golden Number)
    company_counts = {}
    final_results  = []

    for job in scored:
        company = job["company"]
        count   = company_counts.get(company, 0)

        if count < TOP_JOBS_PER_COMPANY:
            final_results.append(job)
            company_counts[company] = count + 1

    # Final sort after company capping
    final_results.sort(key=lambda x: x["match_score"], reverse=True)
    return final_results


def print_summary(results, user_skills):
    meaningful = [j for j in results if len(j["all_required"]) >= MIN_SKILLS_COUNT]
    grade_dist = {}
    for j in meaningful:
        grade_dist[j["grade"]] = grade_dist.get(j["grade"], 0) + 1

    print(f"\n{'='*60}")
    print(f"  MATCH RESULTS  (0% jobs excluded  ·  top {TOP_JOBS_PER_COMPANY}/company)")
    print(f"{'='*60}")
    print(f"  Total jobs shown : {len(results)}")
    print(f"  Grade A (80%+)   : {grade_dist.get('A', 0)}")
    print(f"  Grade B (60%+)   : {grade_dist.get('B', 0)}")
    print(f"  Grade C (40%+)   : {grade_dist.get('C', 0)}")
    print(f"\n  TOP 10:")

    for i, job in enumerate(results[:10], 1):
        print(f"\n  [{job['grade']}] {i}. {job['title']} — {job['company']}")
        print(f"       Match    : {job['raw_match']}%  (score: {job['match_score']})")
        print(f"       Matched  : {', '.join(job['matched_skills'])}")
        print(f"       Missing  : {', '.join(job['missing_skills']) or 'None'}")

    company_map = {}
    for j in results:
        company_map.setdefault(j["company"], 0)
        company_map[j["company"]] += 1
    print(f"\n  Per company: {company_map}")
    print(f"{'='*60}\n")


def run_matcher():
    profile     = load_json(PROFILE_PATH)
    jobs        = load_json(JOBS_PATH)
    user_skills = profile.get("skills", [])

    if not user_skills:
        print("[✗] No skills in profile.json")
        return []
    if not jobs:
        print("[✗] No jobs in job_listings.json")
        return []

    print(f"[i] User skills : {user_skills}")
    print(f"[i] Total jobs  : {len(jobs)}")
    print(f"[i] 0% jobs will be excluded")
    print(f"[i] Max per company: {TOP_JOBS_PER_COMPANY}")

    results = match_jobs(user_skills, jobs)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2)

    print_summary(results, user_skills)
    print(f"[✓] {len(results)} jobs saved → {OUTPUT_PATH}")
    return results