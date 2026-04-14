# services/search_service.py
import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
TAVILY_URL     = "https://api.tavily.com/search"


def _build_company_query(company_name: str, skills: list) -> str:
    skill_str = " ".join(skills[:3]) if skills else "software engineer developer"
    return f"{company_name} careers {skill_str} jobs hiring 2025"


def _build_fallback_query(skills: list, experience_level: str) -> str:
    skill_str = " ".join(skills[:5]) if skills else "software engineer"
    level_str = experience_level or "fresher"
    return f"live {skill_str} {level_str} job openings India remote 2025 hiring"


async def _tavily_search(
    client: httpx.AsyncClient,
    query : str,
    tag   : str = "selected"
) -> dict:
    """
    Single async Tavily search call.
    Returns dict with urls list and the source tag.
    Never raises — returns empty on failure.
    """
    try:
        response = await client.post(
            TAVILY_URL,
            json={
                "api_key"     : TAVILY_API_KEY,
                "query"       : query,
                "search_depth": "basic",
                "max_results" : 5,
            },
            timeout=15
        )
        if response.status_code != 200:
            return {"urls": [], "tag": tag}

        results = response.json().get("results", [])
        urls    = [r["url"] for r in results if r.get("url")]
        return {"urls": urls[:5], "tag": tag}

    except Exception as e:
        print(f"[Search] Failed ({tag}): {e}")
        return {"urls": [], "tag": tag}


async def search_all_companies(
    companies       : list[dict],
    user_skills     : list,
    experience_level: str = ""
) -> dict:
    """
    Fires all company searches in parallel using asyncio.gather.
    Returns dict: { company_name: { urls, tag } }

    If total URLs found < 5, also fires a fallback general search
    tagged as 'recommended'.

    This is the key performance win:
        Sequential: N companies × 3s = N×3s
        Parallel:   N companies × 3s = ~3s total
    """
    async with httpx.AsyncClient() as client:

        # ── Fire all company searches simultaneously ──────
        tasks = {
            c["name"]: _tavily_search(
                client,
                _build_company_query(c["name"], user_skills),
                tag="selected"
            )
            for c in companies
        }

        results = await asyncio.gather(*tasks.values(), return_exceptions=True)

        company_results = {}
        total_urls      = 0

        for company_name, result in zip(tasks.keys(), results):
            if isinstance(result, Exception):
                print(f"[Search] Exception for {company_name}: {result}")
                company_results[company_name] = {"urls": [], "tag": "selected"}
            else:
                company_results[company_name] = result
                total_urls += len(result.get("urls", []))

        # ── Fallback: general skill search if results sparse ──
        if total_urls < 5:
            print(f"[Search] Only {total_urls} URLs found — triggering fallback search")
            fallback = await _tavily_search(
                client,
                _build_fallback_query(user_skills, experience_level),
                tag="recommended"
            )
            company_results["__fallback__"] = fallback

    return company_results