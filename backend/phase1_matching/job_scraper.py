# job_scraper.py
import os
import json
import time
import requests
from dotenv import load_dotenv
from phase1_matching.skill_extractor import extract_skills
from phase1_matching.experience_estimator import estimate_experience

load_dotenv()

APP_ID         = os.getenv("ADZUNA_APP_ID")
APP_KEY        = os.getenv("ADZUNA_APP_KEY")
BASE_URL       = "https://api.adzuna.com/v1/api/jobs/in/search"
PROFILE_PATH   = "data/profile.json"
COMPANIES_PATH = "data/companies.json"
OUTPUT_PATH    = "data/job_listings.json"

PAGE_SIZE      = 50     # Adzuna max per page
MAX_PAGES      = 3      # cap at 150 jobs per company
REQUEST_DELAY  = 0.3    # seconds between page requests

PRIORITY_SKILLS = [
    "Python", "Java", "SQL", "JavaScript", "React",
    "Node.js", "Spring Boot", "AWS", "Docker", "Git",
    "Machine Learning", "MongoDB", "PostgreSQL", "TypeScript"
]


def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def build_skill_query(user_skills):
    """
    Picks top 3 widely-indexed skills for Adzuna query.
    3 skills = broad enough to return results,
    specific enough to filter irrelevant roles.
    """
    priority_matches = [s for s in user_skills if s in PRIORITY_SKILLS]
    chosen = priority_matches[:3] if priority_matches else user_skills[:3]
    return " ".join(chosen)


def fetch_jobs(company_name, skill_query):
    """
    Fetches all available jobs for a company+skill query.

    Uses Adzuna's total_count field to calculate exact pages needed
    instead of blindly paginating until empty.

    Deduplicates within a company's results by URL — Adzuna
    sometimes returns the same listing on multiple pages.
    """
    all_results = []
    seen_urls   = set()

    for page in range(1, MAX_PAGES + 1):
        params = {
            "app_id"          : APP_ID,
            "app_key"         : APP_KEY,
            "results_per_page": PAGE_SIZE,
            "what_and"        : f"{company_name} {skill_query}",
            "where"           : "India",
            "content-type"    : "application/json"
        }

        try:
            response = requests.get(
                f"{BASE_URL}/{page}", params=params, timeout=15
            )
        except requests.exceptions.RequestException as e:
            print(f"    [✗] Request failed on page {page} — {e}")
            break

        if response.status_code != 200:
            print(f"    [✗] HTTP {response.status_code} on page {page}")
            break

        data         = response.json()
        results      = data.get("results", [])
        total_count  = data.get("count", 0)

        if not results:
            break

        # Deduplicate within this company's results
        new_results = []
        for job in results:
            url = job.get("redirect_url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                new_results.append(job)

        all_results.extend(new_results)

        # Calculate total pages available from Adzuna's count
        total_pages = min(
            MAX_PAGES,
            -(-total_count // PAGE_SIZE)   # ceiling division
        )

        print(f"    Page {page}/{total_pages} → "
              f"{len(new_results)} new jobs "
              f"({len(results) - len(new_results)} duplicates removed)")

        # Stop if we've fetched everything available
        if page >= total_pages or len(results) < PAGE_SIZE:
            break

        time.sleep(REQUEST_DELAY)

    return all_results


def parse_job(raw_job, company_name):
    """
    Extracts and structures a single Adzuna job dict.

    Normalizes company name to the one from companies.json
    instead of whatever Adzuna returns — keeps grouping clean.
    """
    description = raw_job.get("description", "")
    if not description:
        return None

    required_skills = extract_skills(description)
    level, _        = estimate_experience(description, source="job")

    return {
        "title"           : raw_job.get("title", "N/A").strip(),
        "company"         : company_name,
        "location"        : raw_job.get("location", {}).get("display_name", "N/A"),
        "url"             : raw_job.get("redirect_url", "N/A"),
        "date_posted"     : raw_job.get("created", "N/A")[:10],
        "description"     : description[:500],
        "required_skills" : required_skills,
        "experience_level": level
    }


def scrape_jobs():
    """
    Master function — loads profile + companies, fetches
    deduplicated skill-relevant jobs, saves to job_listings.json.

    Cross-company deduplication: same job URL appearing under
    multiple company searches is removed here.
    """
    profile   = load_json(PROFILE_PATH)
    companies = load_json(COMPANIES_PATH)

    user_skills = profile.get("skills", [])
    if not user_skills:
        print("[✗] No skills in profile.json — run Task 1 first.")
        return []

    skill_query = build_skill_query(user_skills)

    print(f"[i] Skill filter : {skill_query}")
    print(f"[i] Companies    : {[c['name'] for c in companies]}\n")

    all_jobs       = []
    seen_urls      = set()     # cross-company deduplication
    company_counts = {}

    for company in companies:
        name = company["name"]
        print(f"[→] {name}")

        raw_jobs    = fetch_jobs(name, skill_query)
        parsed_jobs = [parse_job(r, name) for r in raw_jobs]

        # Cross-company deduplication — remove jobs seen in earlier companies
        unique_jobs = []
        for job in parsed_jobs:
            if job and job["url"] not in seen_urls:
                seen_urls.add(job["url"])
                unique_jobs.append(job)

        # Limit to 3 jobs per company
        #unique_jobs = unique_jobs[:3]

        company_counts[name] = len(unique_jobs)
        print(f"    Saved : {len(unique_jobs)} unique jobs\n")
        all_jobs.extend(unique_jobs)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(all_jobs, f, indent=2)

    print(f"[✓] {len(all_jobs)} total unique jobs saved → {OUTPUT_PATH}\n")
    return all_jobs