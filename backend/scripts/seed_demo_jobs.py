# scripts/seed_demo_jobs.py
# Run: python scripts/seed_demo_jobs.py --user_id YOUR_USER_ID
#
# Instructions:
#   1. Run the script with your user_id
#   2. Replace the 3 placeholder URLs with real ones:
#      boards.greenhouse.io/[company]  → pick any open role
#      jobs.lever.co/[company]         → pick any open role
#      careers.google.com/jobs/results → pick any open role
#   3. The script inserts directly into scraped_jobs collection

import asyncio
import os
import argparse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# ── STEP 1: Replace these 3 URLs before your demo ─────────
# Go to each site, find an open role, paste the URL here.
DEMO_JOB_URLS = {
    "google_swe"   : "https://careers.google.com/jobs/results/",   # REPLACE
    "microsoft_sde": "https://jobs.lever.co/microsoft/",            # REPLACE
    "freshworks_be": "https://boards.greenhouse.io/freshworks/",    # REPLACE
}

def make_demo_jobs(user_id: str) -> list:
    return [
        {
            # ── Job 1: Google Software Engineer ─────────
            "user_id"        : user_id,
            "title"          : "Software Engineer III, Backend Systems",
            "company"        : "Google",
            "location"       : "Hyderabad, Telangana, India",
            "experience_level": "mid",
            "description"    : (
                "Build and scale distributed backend systems serving billions of users. "
                "Work on infrastructure powering Google Search, Maps, and Cloud services. "
                "Collaborate with teams across Mountain View and Hyderabad on high-impact projects."
            ),
            "required_skills": [
                "Python", "Java", "Distributed Systems", "SQL",
                "REST APIs", "Docker", "Kubernetes", "Git",
                "Data Structures", "Algorithms"
            ],
            "matched_skills" : ["Python", "Java", "SQL", "REST APIs", "Git", "Docker"],
            "missing_skills" : ["Kubernetes", "Distributed Systems"],
            "match_score"    : 78,
            "raw_match"      : 78,
            "grade"          : "B",
            "match_reason"   : (
                "Strong match on core backend skills. "
                "Kubernetes exposure would strengthen the application."
            ),
            "source"         : "selected",
            "date_posted"    : "2025-04-10",
            "url"            : DEMO_JOB_URLS["https://www.google.com/about/careers/applications/apply/19d19a68-98a4-4247-b497-e70a1984e0fe/form"],
            "url_status"     : "direct",
        },
        {
            # ── Job 2: Microsoft Software Development Engineer ─
            "user_id"        : user_id,
            "title"          : "Software Development Engineer – Azure Platform",
            "company"        : "Microsoft",
            "location"       : "Hyderabad, India (Hybrid)",
            "experience_level": "entry",
            "description"    : (
                "Join the Azure Platform team building cloud-native services at global scale. "
                "Design APIs, write production Python and C# services, and contribute to "
                "Microsoft's open-source cloud tooling. Fresh graduates welcome."
            ),
            "required_skills": [
                "Python", "C#", "REST APIs", "Azure", "Git",
                "Agile", "SQL", "Unit Testing"
            ],
            "matched_skills" : ["Python", "REST APIs", "Git", "SQL"],
            "missing_skills" : ["C#", "Azure", "Unit Testing"],
            "match_score"    : 65,
            "raw_match"      : 65,
            "grade"          : "B",
            "match_reason"   : (
                "Good Python and API fundamentals. "
                "Azure certification would significantly boost this score."
            ),
            "source"         : "selected",
            "date_posted"    : "2025-04-12",
            "url"            : DEMO_JOB_URLS["https://apply.careers.microsoft.com/careers/apply?pid=1970393556630263"],
            "url_status"     : "direct",
        },
        {
            # ── Job 3: Freshworks Backend Engineer ─────────
            "user_id"        : user_id,
            "title"          : "Senior Backend Engineer – Platform Services",
            "company"        : "Freshworks",
            "location"       : "Chennai, India / Remote",
            "experience_level": "senior",
            "description"    : (
                "Freshworks is looking for a backend engineer to build scalable SaaS "
                "platform services used by 60,000+ businesses globally. "
                "You'll architect microservices, own deployment pipelines, and mentor junior engineers."
            ),
            "required_skills": [
                "Python", "Django", "FastAPI", "PostgreSQL", "Redis",
                "Docker", "AWS", "Microservices", "Git", "REST APIs"
            ],
            "matched_skills" : ["Python", "FastAPI", "PostgreSQL", "Docker", "Git", "REST APIs"],
            "missing_skills" : ["Django", "Redis", "AWS", "Microservices"],
            "match_score"    : 82,
            "raw_match"      : 82,
            "grade"          : "A",
            "match_reason"   : (
                "Excellent FastAPI and Python match. "
                "AWS experience would make this a near-perfect fit."
            ),
            "source"         : "selected",
            "date_posted"    : "2025-04-11",
            "url"            : DEMO_JOB_URLS["https://job-boards.greenhouse.io/remotecom/jobs/7702658003?gh_src=my.greenhouse.search"],
            "url_status"     : "direct",
        },
    ]


async def seed(user_id: str):
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    db     = client[os.getenv("MONGODB_DB_NAME", "ai_job_agent")]
    coll   = db["scraped_jobs"]

    jobs = make_demo_jobs(user_id)

    # Remove existing demo jobs for this user to avoid duplicates
    await coll.delete_many({"user_id": user_id, "source": "selected"})
    print(f"[Seed] Cleared existing jobs for user: {user_id}")

    result = await coll.insert_many(jobs)
    print(f"[Seed] Inserted {len(result.inserted_ids)} demo jobs:")

    for job in jobs:
        url_preview = job['url'][:60] + '...' if len(job['url']) > 60 else job['url']
        print(f"  [{job['grade']}] {job['title']} — {job['company']}")
        print(f"       URL: {url_preview}")
        print(f"       Match: {job['match_score']}%")

    client.close()
    print("\n[Seed] Done. Open /jobs in your browser to see the demo data.")
    print("\n⚠  REMINDER: Replace the 3 placeholder URLs in this script")
    print("   with real job posting URLs before your demo!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user_id", required=True, help="Your MongoDB user_id")
    args = parser.parse_args()
    asyncio.run(seed(args.user_id))