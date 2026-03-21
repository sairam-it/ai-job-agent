# skill_matcher.py
import json

PROFILE_PATH = "data/profile.json"
JOBS_PATH    = "data/job_listings.json"
OUTPUT_PATH  = "data/shortlist.json"


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def calculate_match(user_skills, required_skills):
    if not required_skills:
        return 0, [], []

    user_set     = set(s.lower() for s in user_skills)
    required_set = set(s.lower() for s in required_skills)

    matched_lower = user_set & required_set
    missing_lower = required_set - user_set

    matched = [s for s in required_skills if s.lower() in matched_lower]
    missing = [s for s in required_skills if s.lower() in missing_lower]

    score = round((len(matched) / len(required_skills)) * 100)
    return score, matched, missing


def match_jobs(user_skills, jobs):
    """
    Scores every job — no filtering applied.
    All jobs are returned sorted by match_score highest to lowest.
    User sees the best matches first and decides what to apply for.
    """
    results = []

    for job in jobs:
        required_skills = job.get("required_skills", [])
        score, matched, missing = calculate_match(user_skills, required_skills)

        results.append({
            "title"           : job["title"],
            "company"         : job["company"],
            "location"        : job["location"],
            "url"             : job["url"],
            "date_posted"     : job["date_posted"],
            "experience_level": job.get("experience_level"),
            "match_score"     : score,
            "matched_skills"  : matched,
            "missing_skills"  : missing,
            "all_required"    : required_skills
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results


def print_summary(shortlist):
    print(f"\n{'='*55}")
    print(f"  ALL JOBS — SORTED BY MATCH % ({len(shortlist)} total)")
    print(f"{'='*55}")

    for i, job in enumerate(shortlist, 1):
        print(f"\n  {i}. {job['title']} — {job['company']}")
        print(f"     Location  : {job['location']}")
        print(f"     Match     : {job['match_score']}%")
        print(f"     Matched   : {', '.join(job['matched_skills']) or 'None'}")
        print(f"     Missing   : {', '.join(job['missing_skills']) or 'None'}")
        print(f"     Level     : {job['experience_level'] or 'Not mentioned'}")
        print(f"     URL       : {job['url']}")

    print(f"\n{'='*55}")


def run_matcher():
    profile = load_json(PROFILE_PATH)
    jobs    = load_json(JOBS_PATH)

    user_skills = profile.get("skills", [])

    if not user_skills:
        print("[✗] No skills in profile.json — run Task 1 first.")
        return []

    if not jobs:
        print("[✗] No jobs in job_listings.json — run Task 2 first.")
        return []

    print(f"[i] User skills : {user_skills}")
    print(f"[i] Total jobs  : {len(jobs)}")

    shortlist = match_jobs(user_skills, jobs)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(shortlist, f, indent=2)

    print_summary(shortlist)
    print(f"\n[✓] {len(shortlist)} jobs saved → {OUTPUT_PATH}")