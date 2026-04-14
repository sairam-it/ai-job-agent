# services/job_research_service.py
import asyncio
from services.search_service import search_all_companies
from services.scraper_service import scrape_urls
from services.llm_service import bulk_extract_jobs, semantic_score

_SCORE_SEMAPHORE = asyncio.Semaphore(4)


async def _score_jobs(jobs: list, user_profile: dict) -> list:
    """
    Scores all extracted jobs semantically.
    Uses semaphore to limit concurrent Gemini calls.
    """
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
    Full parallel research pipeline:

    1. search_all_companies() → all company URL searches fire simultaneously
    2. scrape_urls()          → all pages scraped concurrently per company
    3. bulk_extract_jobs()    → one LLM call per company (not per page)
    4. semantic_score()       → all jobs scored in parallel (semaphore-limited)

    Fallback:
    - If total jobs < 5, a "recommended" search was already triggered
      in search_service.py — those results are processed here too.
    """
    user_skills      = user_profile.get("skills", [])
    experience_level = user_profile.get("experience_level", "")

    # ── Step 1: Parallel search for all companies ─────────
    search_results = await search_all_companies(
        companies        = companies,
        user_skills      = user_skills,
        experience_level = experience_level
    )

    # ── Step 2 + 3: Scrape + bulk extract per company ─────
    async def process_company(company_name: str, data: dict) -> list:
        urls       = data.get("urls", [])
        source_tag = data.get("tag", "selected")

        if not urls:
            return []

        scraped_pages = await scrape_urls(urls)
        if not scraped_pages:
            return []

        # Bulk extraction — one LLM call for all pages of this company
        jobs = await bulk_extract_jobs(
            pages        = scraped_pages,
            company_name = company_name if company_name != "__fallback__" else "Various",
            source_tag   = source_tag
        )
        return jobs

    # Fire all company extractions concurrently
    extract_tasks = [
        process_company(company_name, data)
        for company_name, data in search_results.items()
    ]

    extracted_per_company = await asyncio.gather(
        *extract_tasks,
        return_exceptions=True
    )

    all_jobs = []
    for result in extracted_per_company:
        if isinstance(result, Exception):
            print(f"[Research] Company extraction error: {result}")
            continue
        all_jobs.extend(result)

    if not all_jobs:
        return []

    # ── Step 4: Semantic scoring — all jobs in parallel ───
    scored_jobs = await _score_jobs(all_jobs, user_profile)

    # ── Sort: selected first by score, then recommended ───
    selected    = [j for j in scored_jobs if j.get("source") != "recommended"]
    recommended = [j for j in scored_jobs if j.get("source") == "recommended"]

    selected.sort(   key=lambda x: x["match_score"], reverse=True)
    recommended.sort(key=lambda x: x["match_score"], reverse=True)

    return selected + recommended