# phase1_matching/experience_estimator.py
import re
from datetime import datetime
from dateutil import relativedelta

MONTH_MAP = {
    "jan": 1,  "feb": 2,  "mar": 3,  "apr": 4,
    "may": 5,  "jun": 6,  "jul": 7,  "aug": 8,
    "sep": 9,  "oct": 10, "nov": 11, "dec": 12,
    "january": 1,  "february": 2,  "march": 3,    "april": 4,
    "june": 6,     "july": 7,      "august": 8,   "september": 9,
    "october": 10, "november": 11, "december": 12
}

# ── Section header sets ───────────────────────────────────

# Headers that START a work experience section
EXPERIENCE_HEADERS = [
    "experience", "work experience", "professional experience",
    "employment", "employment history", "work history",
    "career", "professional background", "internship",
    "internships", "work", "positions held"
]

# ── Task 3: Headers that TERMINATE a work experience section ──
# Any of these appearing after "experience" ends the work section.
# This is what was missing — education dates were leaking in.
TERMINATING_HEADERS = [
    # Education
    "education", "academic", "qualification", "qualifications",
    "schooling", "academics", "university", "college", "degree",
    "educational background", "academic background",
    # Other sections
    "projects", "personal projects", "academic projects",
    "skills", "technical skills", "technologies", "tools",
    "certifications", "certificates", "achievements", "awards",
    "publications", "languages", "interests", "hobbies",
    "summary", "objective", "profile", "about", "references",
    "extracurricular", "volunteer", "activities"
]

# ── Task 3: Patterns to detect education date noise ──────
# These patterns indicate a date range is from education, not work.
# Used as a secondary filter even within the experience section.
EDUCATION_NOISE_PATTERNS = [
    r'\b(b\.?tech|b\.?e|m\.?tech|m\.?e|b\.?sc|m\.?sc|b\.?a|m\.?a|ph\.?d|mba|bba)\b',
    r'\b(bachelor|master|doctoral|undergraduate|postgraduate)\b',
    r'\b(cgpa|gpa|percentage|marks|grade)\b',
    r'\b(semester|year\s+\d|first\s+year|second\s+year|third\s+year)\b',
    r'\b(intermediate|secondary|high\s+school|school)\b',
]


def _is_education_noise(text_block: str) -> bool:
    """
    Returns True if the text block looks like it's from an
    education entry rather than a work entry.
    Used to skip date ranges that belong to academic periods.
    """
    lower = text_block.lower()
    return any(re.search(p, lower) for p in EDUCATION_NOISE_PATTERNS)


def extract_experience_section(raw_text: str) -> str:
    """
    Task 3: Precision extraction of ONLY the work experience section.

    Algorithm:
        1. Find the first heading that matches EXPERIENCE_HEADERS
        2. Scan forward for the next heading in TERMINATING_HEADERS
        3. Slice only the text between those two points
        4. If terminator is "education" — explicitly stop there

    Before this fix: dates from education (college 2021-2025) leaked
    into experience calculation → wrong result (e.g. 7.8 years).
    After this fix: only professional employment dates are summed.
    """
    lines       = raw_text.split('\n')
    exp_start   = None
    exp_end     = None

    for i, line in enumerate(lines):
        stripped = line.strip().lower()

        # Skip very short lines and lines that are clearly content
        if len(stripped) < 3 or len(stripped) > 60:
            continue

        # Detect experience section start
        if exp_start is None:
            for header in EXPERIENCE_HEADERS:
                if stripped == header or stripped.startswith(header + ' ') or \
                   stripped.endswith(' ' + header) or re.match(rf'^{re.escape(header)}[\s:–\-]*$', stripped):
                    exp_start = i
                    break

        # Detect section end (must be after start)
        elif exp_start is not None and exp_end is None:
            for header in TERMINATING_HEADERS:
                if stripped == header or stripped.startswith(header + ' ') or \
                   stripped.endswith(' ' + header) or re.match(rf'^{re.escape(header)}[\s:–\-]*$', stripped):
                    exp_end = i
                    break

    if exp_start is None:
        # No experience section found — return full text as fallback
        return raw_text

    if exp_end is None:
        # No terminator found — take until end of document
        exp_end = len(lines)

    section = '\n'.join(lines[exp_start:exp_end])
    return section


def normalize_dates(text: str) -> str:
    """Strips leading day numbers: '1 Feb 2024' → 'Feb 2024'"""
    return re.sub(
        r'\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',
        r'\1', text, flags=re.IGNORECASE
    )


def parse_date(month_str, year_str):
    if year_str is None:
        return None
    year  = int(year_str)
    month = MONTH_MAP.get(month_str.lower().strip(), 1) if month_str else 1
    return datetime(year, month, 1)


def extract_explicit_years(text: str) -> int:
    """
    Finds explicit mentions like '2 years of experience', '3+ years'.
    Only used as a cross-check — section extraction is primary.
    """
    forward = re.findall(
        r'(\d+)\+?\s*years?\s*(?:of\s+)?experience',
        text, re.IGNORECASE
    )
    reverse = re.findall(
        r'experience\s+(?:of\s+)?(\d+)\+?\s*years?',
        text, re.IGNORECASE
    )
    return sum(int(n) for n in set(forward + reverse))


def extract_date_range_years(text: str) -> float:
    """
    Task 3: Sums date ranges found in the work experience section.

    Skips date ranges that appear in text blocks containing
    education noise keywords (degree names, CGPA, etc.).
    """
    text         = normalize_dates(text)
    total_months = 0

    # Split into paragraphs/blocks for noise detection
    blocks = re.split(r'\n{2,}|\r\n{2,}', text)

    pattern_month_year = re.compile(
        r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
        r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
        r'\s+(\d{4})\s*[-–—to]+\s*'
        r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
        r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?'
        r'|Present|Current|Now)\s*(\d{4})?',
        re.IGNORECASE
    )

    for block in blocks:
        # ── Task 3: Skip blocks that look like education ──
        if _is_education_noise(block):
            continue

        for match in pattern_month_year.finditer(block):
            start_month, start_year, end_token, end_year = match.groups()
            start_date = parse_date(start_month, start_year)

            if end_token.lower() in ("present", "current", "now"):
                end_date = datetime.today()
            else:
                end_date = parse_date(end_token, end_year)
                if end_date is None:
                    continue

            # Sanity check — reject obviously wrong ranges
            if start_date > datetime.today():
                continue
            if end_date < start_date:
                continue

            diff          = relativedelta.relativedelta(end_date, start_date)
            months        = diff.years * 12 + diff.months

            # Skip ranges longer than 10 years (likely education mis-parse)
            if months > 120:
                continue

            total_months += months

    # Fallback: year-only ranges if month-year found nothing
    if total_months == 0:
        for block in blocks:
            if _is_education_noise(block):
                continue

            for match in re.finditer(
                r'\b(20\d{2}|19\d{2})\s*[-–—to]+\s*(20\d{2}|19\d{2}|Present|Current)\b',
                block, re.IGNORECASE
            ):
                start_y, end_token = match.groups()
                start_date = datetime(int(start_y), 1, 1)
                end_date   = datetime.today() if end_token.lower() in ("present", "current") \
                             else datetime(int(end_token), 1, 1)

                if start_date > datetime.today() or end_date < start_date:
                    continue

                diff   = relativedelta.relativedelta(end_date, start_date)
                months = diff.years * 12 + diff.months

                if months > 120:
                    continue

                total_months += months

    return round(total_months / 12, 1)


FRESHER_KEYWORDS = [
    r'\bfresher\b', r'entry[- ]level', r'fresh\s+graduate',
    r'no\s+experience\s+required', r'recent\s+graduate',
    r'0[- ]1\s*years?', r'ideal\s+for\s+fresher',
]
SENIOR_KEYWORDS = [
    r'\bsenior\b', r'\blead\b', r'\bprincipal\b',
    r'\bstaff\b', r'5\+\s*years?'
]
MID_KEYWORDS = [
    r'\bmid[- ]level\b', r'[2-4]\+?\s*years?\s*(?:of\s+)?experience'
]


def detect_by_keywords(text: str):
    for pattern in FRESHER_KEYWORDS:
        if re.search(pattern, text, re.IGNORECASE):
            return "entry", 0
    for pattern in SENIOR_KEYWORDS:
        if re.search(pattern, text, re.IGNORECASE):
            return "senior", 5
    for pattern in MID_KEYWORDS:
        if re.search(pattern, text, re.IGNORECASE):
            return "mid", 2
    return None, None


def estimate_experience(raw_text: str, source: str = "resume"):
    """
    Task 3: Two-stage experience estimation.

    For resumes (source="resume"):
        1. Extract ONLY the work experience section (not education)
        2. Run date math on that section only
        3. Apply noise filter on individual blocks within the section

    For job descriptions (source="job"):
        Keyword scan is sufficient — no sections to separate.
    """
    # Stage 1 — keyword detection (fast, works for both)
    level, years = detect_by_keywords(raw_text)
    if level:
        return level, years

    # Stage 2 — section-aware date math (resumes only)
    if source == "resume":
        # ── Task 3: Extract ONLY work experience section ──
        work_section = extract_experience_section(raw_text)
        explicit     = extract_explicit_years(work_section)
        from_dates   = extract_date_range_years(work_section)
    else:
        # Job descriptions — full text is fine
        explicit   = extract_explicit_years(raw_text)
        from_dates = extract_date_range_years(raw_text)

    total = max(explicit, from_dates)

    if total == 0:
        return None, None

    level = "entry" if total <= 1 else "mid" if total <= 4 else "senior"
    return level, total