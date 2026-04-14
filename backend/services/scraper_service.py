# services/scraper_service.py
import httpx
from bs4 import BeautifulSoup

SCRAPE_TIMEOUT = 12  # seconds per page

# Realistic browser headers to reduce bot detection
HEADERS = {
    "User-Agent"     : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/120.0.0.0 Safari/537.36",
    "Accept"         : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection"     : "keep-alive",
}

# Tags that never contain useful job content
REMOVE_TAGS = [
    "script", "style", "nav", "footer", "header",
    "aside", "form", "iframe", "noscript", "svg"
]


def extract_clean_text(html: str) -> str:
    """
    Parses HTML and extracts clean readable text.
    Removes navigation, scripts, and boilerplate.
    Returns first 4000 chars — enough for LLM extraction.
    """
    soup = BeautifulSoup(html, "lxml")

    for tag in soup(REMOVE_TAGS):
        tag.decompose()

    # Try to find main content area first
    main = (
        soup.find("main") or
        soup.find("article") or
        soup.find(id="content") or
        soup.find(class_="job-description") or
        soup.find(class_="careers") or
        soup.body
    )

    if not main:
        return ""

    text = main.get_text(separator="\n", strip=True)

    # Remove excessive blank lines
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    clean = "\n".join(lines)

    return clean[:4000]


async def scrape_url(url: str) -> dict:
    """
    Async scrapes a single URL.
    Returns dict with url, text, and success flag.
    Never raises — caller always gets a result.
    """
    try:
        async with httpx.AsyncClient(
            headers         = HEADERS,
            timeout         = SCRAPE_TIMEOUT,
            follow_redirects= True
        ) as client:
            response = await client.get(url)

            if response.status_code != 200:
                return {"url": url, "text": "", "success": False,
                        "reason": f"HTTP {response.status_code}"}

            text = extract_clean_text(response.text)

            if len(text) < 100:
                return {"url": url, "text": "", "success": False,
                        "reason": "Page too short or JS-rendered"}

            return {"url": url, "text": text, "success": True}

    except httpx.TimeoutException:
        return {"url": url, "text": "", "success": False, "reason": "Timeout"}

    except Exception as e:
        return {"url": url, "text": "", "success": False, "reason": str(e)}


async def scrape_urls(urls: list[str]) -> list[dict]:
    """
    Scrapes multiple URLs concurrently.
    Returns only successfully scraped pages.
    """
    import asyncio

    tasks   = [scrape_url(url) for url in urls]
    results = await asyncio.gather(*tasks)

    return [r for r in results if r["success"] and r["text"]]