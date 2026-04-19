# services/job_research_service.py
import asyncio
from services.search_service import search_all_companies
from services.scraper_service import scrape_urls
from services.llm_service import bulk_extract_jobs, semantic_score

_SCORE_SEMAPHORE = asyncio.Semaphore(4)


async def _score_jobs(jobs: list, user_profile: dict) -> list:
    """Scores all extracted jobs semantically with semaphore throttling."""
    async def score_one(job):
        async with _SCORE_SEMAPHORE:
            score_data = await semantic_score(user_profile, job)
            return {
                **job,
                "match_score"   : score_data["match_score"],
                "raw_match"     : score_data["match_score"],
                "grade"         : score_data["grade"],
                "matched_skills": score_data["matched_skills"],
                "missing_skills": score_data["missing_skills"],
                "match_reason"  : score_data["match_reason"],
            }

    tasks   = [score_one(job) for job in jobs]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if not isinstance(r, Exception)]


async def research_all_companies(
    companies   : list[dict],
    user_profile: dict
) -> list[dict]:
    """
    Full parallel research pipeline.

    Fix for "Various" company name:
      The __fallback__ key is a special sentinel used by search_service
      when not enough results come from selected companies.
      Previously we passed company_name="Various" to bulk_extract_jobs.
      Now we skip the fallback bucket entirely for company name assignment
      and instead tag those jobs as source="recommended" with no
      company override — the LLM assigns whatever company it finds.

    Fix for title drift:
      We no longer allow the LLM to "normalise" job titles.
      The title extracted from the career page is the authoritative title.
      apply_service.py uses this same title when building the apply kit,
      so what the user sees matches what the portal shows.
    """
    user_skills      = user_profile.get("skills", [])
    experience_level = user_profile.get("experience_level", "")

    # Step 1: Parallel search
    search_results = await search_all_companies(
        companies        = companies,
        user_skills      = user_skills,
        experience_level = experience_level
    )

    # Step 2 + 3: Scrape + bulk extract per company
    async def process_company(company_name: str, data: dict) -> list:
        urls       = data.get("urls", [])
        source_tag = data.get("tag", "selected")

        if not urls:
            return []

        scraped_pages = await scrape_urls(urls)
        if not scraped_pages:
            return []

        # Fix: resolve real company name for fallback bucket
        # __fallback__ is a sentinel — use None so LLM picks the real name
        resolved_name = None if company_name == "__fallback__" else company_name

        jobs = await bulk_extract_jobs(
            pages        = scraped_pages,
            company_name = resolved_name,   # None → LLM infers from page content
            source_tag   = source_tag
        )

        # Fix: strip any job where company resolved to empty or placeholder
        cleaned = []
        for job in jobs:
            c = (job.get("company") or "").strip()
            if not c or c.lower() in ("various", "unknown", "n/a", "company", ""):
                # Skip rather than show misleading company name
                print(f"[Research] Skipping job with invalid company name: '{c}'")
                continue
            cleaned.append(job)

        return cleaned

    extract_tasks = [
        process_company(name, data)
        for name, data in search_results.items()
    ]

    extracted_per_company = await asyncio.gather(
        *extract_tasks,
        return_exceptions=True
    )

    all_jobs = []
    for result in extracted_per_company:
        if isinstance(result, Exception):
            print(f"[Research] Extraction error: {result}")
            continue
        all_jobs.extend(result)

    if not all_jobs:
        return []

    # Step 4: Semantic scoring
    scored_jobs = await _score_jobs(all_jobs, user_profile)

    # Sort: selected company jobs first, then recommended
    selected    = [j for j in scored_jobs if j.get("source") != "recommended"]
    recommended = [j for j in scored_jobs if j.get("source") == "recommended"]

    selected.sort(   key=lambda x: x["match_score"], reverse=True)
    recommended.sort(key=lambda x: x["match_score"], reverse=True)

    return selected + recommended