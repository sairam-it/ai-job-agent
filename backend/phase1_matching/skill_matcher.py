# skill_matcher.py
import json
import math

PROFILE_PATH     = "data/profile.json"
JOBS_PATH        = "data/job_listings.json"
OUTPUT_PATH      = "data/shortlist.json"
MIN_SKILLS_COUNT = 3    # minimum skills in JD to rank meaningfully


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def calculate_match(user_skills, required_skills):
    """
    Two-part scoring:

    raw_score   → what % of job's required skills user has
    match_score → confidence-weighted rank score

    Confidence weighting formula:
        raw_score × log(matched_count + 1)

    Why this works:
        1/1  required → 100 × log(2) = 69   low confidence, goes down
        3/4  required → 75  × log(4) = 104  good match
        6/8  required → 75  × log(7) = 134  strong match, goes up
        8/10 required → 80  × log(9) = 152  excellent match

    This ensures a job matching 6 skills ranks above
    a job matching 1 skill, even if both show 100% raw.
    """
    if not required_skills:
        return 0, 0, [], []

    user_set      = set(s.lower() for s in user_skills)
    required_set  = set(s.lower() for s in required_skills)

    matched_lower = user_set & required_set
    missing_lower = required_set - user_set

    matched = [s for s in required_skills if s.lower() in matched_lower]
    missing = [s for s in required_skills if s.lower() in missing_lower]

    raw_score   = round((len(matched) / len(required_skills)) * 100)
    match_score = round(raw_score * math.log(len(matched) + 1))

    return raw_score, match_score, matched, missing


def get_grade(raw_score, skills_count):
    """
    Human-readable grade shown on website job cards.

    Grade is based on raw match % but only awarded
    if the job description has enough skills to be meaningful.

    A → 80%+ match, 4+ skills   (strong candidate)
    B → 60%+ match, 3+ skills   (good candidate)
    C → 40%+ match, 3+ skills   (partial match)
    D → below 40% or weak JD    (low match)
    """
    if skills_count < MIN_SKILLS_COUNT:
        return "D"
    if raw_score >= 80:
        return "A"
    if raw_score >= 60:
        return "B"
    if raw_score >= 40:
        return "C"
    return "D"


def match_jobs(user_skills, jobs):
    """
    Scores every job and sorts into two groups:

    Group A → JD has >= MIN_SKILLS_COUNT skills
              Sorted by confidence-weighted match_score (best first)
              These are the jobs worth showing prominently on website

    Group B → JD has < MIN_SKILLS_COUNT skills
              Sorted by raw_score
              Shown at bottom — job description was too sparse to judge fairly

    This two-group approach ensures poorly-described jobs
    never appear above well-matched ones regardless of score.
    """
    group_a = []
    group_b = []

    for job in jobs:
        required_skills = job.get("required_skills", [])
        raw_score, match_score, matched, missing = calculate_match(
            user_skills, required_skills
        )

        skills_count = len(required_skills)
        grade        = get_grade(raw_score, skills_count)

        entry = {
            "title"           : job["title"],
            "company"         : job["company"],
            "location"        : job["location"],
            "url"             : job["url"],
            "date_posted"     : job["date_posted"],
            "experience_level": job.get("experience_level"),
            "grade"           : grade,
            "raw_match"       : raw_score,
            "match_score"     : match_score,
            "matched_skills"  : matched,
            "missing_skills"  : missing,
            "all_required"    : required_skills,
            "description"     : job.get("description", "")
        }

        if skills_count >= MIN_SKILLS_COUNT:
            group_a.append(entry)
        else:
            group_b.append(entry)

    group_a.sort(key=lambda x: x["match_score"], reverse=True)
    group_b.sort(key=lambda x: x["raw_match"],   reverse=True)

    return group_a + group_b


def print_summary(results, user_skills):
    """
    Professional terminal summary:
        - Overall stats
        - Grade distribution
        - Top 10 meaningful matches
        - Company-wise breakdown
    """
    group_a = [j for j in results if len(j["all_required"]) >= MIN_SKILLS_COUNT]
    group_b = [j for j in results if len(j["all_required"]) < MIN_SKILLS_COUNT]

    grade_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
    for job in group_a:
        grade_counts[job["grade"]] += 1

    # ── Overall Stats
    print(f"\n{'='*60}")
    print(f"  MATCH RESULTS SUMMARY")
    print(f"{'='*60}")
    print(f"  Total jobs ranked    : {len(results)}")
    print(f"  Meaningful matches   : {len(group_a)}  (JD had 3+ skills)")
    print(f"  Sparse descriptions  : {len(group_b)}  (JD had < 3 skills)")
    print(f"\n  Grade Distribution (meaningful matches only):")
    print(f"    A (80%+ match) : {grade_counts['A']} jobs  ← strong candidate")
    print(f"    B (60%+ match) : {grade_counts['B']} jobs  ← good candidate")
    print(f"    C (40%+ match) : {grade_counts['C']} jobs  ← partial match")
    print(f"    D (below 40%)  : {grade_counts['D']} jobs  ← low match")

    # ── Top 10
    print(f"\n{'='*60}")
    print(f"  TOP 10 BEST MATCHES")
    print(f"{'='*60}")

    for i, job in enumerate(group_a[:10], 1):
        print(f"\n  [{job['grade']}] {i}. {job['title']}")
        print(f"       Company  : {job['company']}")
        print(f"       Location : {job['location']}")
        print(f"       Match    : {job['raw_match']}%  |  "
              f"Skills in JD : {len(job['all_required'])}")
        print(f"       Matched  : {', '.join(job['matched_skills']) or 'None'}")
        print(f"       Missing  : {', '.join(job['missing_skills']) or 'None'}")
        print(f"       Level    : {job['experience_level'] or 'Not mentioned'}")
        print(f"       URL      : {job['url']}")

    # ── Company Breakdown
    print(f"\n{'='*60}")
    print(f"  JOBS PER COMPANY (meaningful matches only)")
    print(f"{'='*60}")

    company_map = {}
    for job in group_a:
        company_map.setdefault(job["company"], []).append(job)

    for company, jobs in sorted(
        company_map.items(),
        key=lambda x: max(j["match_score"] for j in x[1]),
        reverse=True
    ):
        best  = max(jobs, key=lambda x: x["match_score"])
        grade_dist = {}
        for j in jobs:
            grade_dist[j["grade"]] = grade_dist.get(j["grade"], 0) + 1
        grade_str = "  ".join(f"{g}:{n}" for g, n in sorted(grade_dist.items()))
        print(f"  {company:<22} {len(jobs):>3} jobs  │  "
              f"Best: {best['raw_match']}%  │  Grades: {grade_str}")

    print(f"\n{'='*60}")
    print(f"  Full ranked list → {OUTPUT_PATH}")
    print(f"{'='*60}\n")


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

    results = match_jobs(user_skills, jobs)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2)

    print_summary(results, user_skills)
    return results