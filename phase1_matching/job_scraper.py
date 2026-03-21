# job_scraper.py
import os
import json
import time
import requests
from bs4 import BeautifulSoup
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
PAGE_SIZE      = 50    # Adzuna max per page


def load_profile():
    with open(PROFILE_PATH, "r") as f:
        return json.load(f)


def load_companies():
    with open(COMPANIES_PATH, "r") as f:
        return json.load(f)


def build_skill_query(skills):
    # Top 5 skills keeps query focused and avoids over-filtering
    return " ".join(skills[:5])


def fetch_full_description(job_url):
    """
    Fetches the actual Adzuna job detail page and extracts
    the full description text — including skills sections that
    the API truncates.

    Returns full text string, or empty string on failure.
    """
    try:
        headers  = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(job_url, headers=headers, timeout=10)
        if response.status_code != 200:
            return ""
        soup = BeautifulSoup(response.text, "html.parser")

        # Adzuna detail pages wrap description in these selectors
        selectors = [
            "section.adp-body",
            "div.adp-description",
            "div[class*='description']",
            "div[class*='job-description']"
        ]
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                return element.get_text(separator=" ", strip=True)

        # Fallback — grab all paragraph text from the page
        paragraphs = soup.find_all("p")
        return " ".join(p.get_text() for p in paragraphs)

    except Exception:
        return ""


def fetch_all_pages(company_name, skill_query):
    """
    Paginates through ALL Adzuna result pages for a company + skill query.
    Stops when a page returns 0 results or an error occurs.

    Adzuna URL format:
        /search/1  → page 1
        /search/2  → page 2  ...and so on
    """
    all_results = []
    page        = 1

    while True:
        params = {
            "app_id"          : APP_ID,
            "app_key"         : APP_KEY,
            "results_per_page": PAGE_SIZE,
            "what_and"        : skill_query,
            "company"         : company_name,
            "where"           : "India",
            "content-type"    : "application/json"
        }

        response = requests.get(f"{BASE_URL}/{page}", params=params)

        if response.status_code != 200:
            print(f"    [✗] HTTP {response.status_code} on page {page} — stopping.")
            break

        results = response.json().get("results", [])

        if not results:
            break   # no more pages

        all_results.extend(results)
        print(f"    Page {page} → {len(results)} jobs fetched")

        if len(results) < PAGE_SIZE:
            break   # last page (partial page = final page)

        page += 1
        time.sleep(0.5)   # polite delay between page requests

    return all_results


def parse_job(raw_job, company_name):
    """
    Parses a single Adzuna job dict into our standard structure.

    Skills strategy:
        Step 1 → extract from API description (fast, always available)
        Step 2 → if skills list is empty, fetch full page and re-extract
        This ensures we don't miss skills that appear below the API truncation.

    Experience strategy:
        Keyword-first detection handles "fresher", "entry-level", "senior" etc.
        Falls back to year/date math if no keywords found.
        Stores only experience_level — cleaner for display.
    """
    api_description = raw_job.get("description", "")
    if not api_description:
        return None

    job_url = raw_job.get("redirect_url", "")

    # Step 1 — try skills from API description
    required_skills = extract_skills(api_description)

    # Step 2 — if empty, fetch the full page for complete skills
    if not required_skills and job_url:
        print(f"      [↻] Fetching full page for skills → {raw_job.get('title','')}")
        full_description = fetch_full_description(job_url)
        if full_description:
            required_skills = extract_skills(full_description)
            # use full description for experience detection too
            api_description = full_description

    level, _ = estimate_experience(api_description, source="job")

    return {
        "title"           : raw_job.get("title", "N/A"),
        "company"         : company_name,
        "location"        : raw_job.get("location", {}).get("display_name", "N/A"),
        "url"             : job_url,
        "date_posted"     : raw_job.get("created", "N/A")[:10],
        "description"     : api_description[:500],
        "required_skills" : required_skills,
        "experience_level": level
    }


def scrape_jobs():
    """
    Master function — called by main.py.
    Loads profile + companies, paginates through all results,
    saves structured job listings for Task 3 skill matching.
    """
    profile   = load_profile()
    companies = load_companies()

    user_skills = profile.get("skills", [])
    if not user_skills:
        print("[✗] No skills in profile.json — run Task 1 first.")
        return []

    skill_query = build_skill_query(user_skills)
    print(f"[i] Skill filter : {skill_query}")
    print(f"[i] Companies    : {[c['name'] for c in companies]}")

    all_jobs = []

    for company in companies:
        name = company["name"]
        print(f"\n[→] Scraping all relevant jobs at {name}...")

        raw_jobs    = fetch_all_pages(name, skill_query)
        parsed_jobs = [parse_job(r, name) for r in raw_jobs]
        valid_jobs  = [j for j in parsed_jobs if j is not None]

        print(f"    Total valid jobs : {len(valid_jobs)}")
        all_jobs.extend(valid_jobs)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(all_jobs, f, indent=2)

    print(f"\n[✓] {len(all_jobs)} jobs saved → {OUTPUT_PATH}")
    return all_jobs