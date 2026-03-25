# experience_estimator.py
import re
from datetime import datetime
from dateutil import relativedelta

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    "january": 1, "february": 2, "march": 3, "april": 4,
    "june": 6, "july": 7, "august": 8, "september": 9,
    "october": 10, "november": 11, "december": 12
}

SECTION_HEADERS = [
    "projects", "skills", "technologies", "education",
    "certifications", "achievements", "awards", "publications",
    "languages", "interests", "summary", "objective"
]

# Keywords that directly signal experience level — no year numbers needed
FRESHER_KEYWORDS = [
    r'\bfresher', r'entry[- ]level', r'fresh\s+graduate',
    r'no\s+experience\s+required', r'recent\s+graduate',
    r'0[- ]1\s*years?', r'ideal\s+for\s+fresher'
]
SENIOR_KEYWORDS  = [r'\bsenior\b', r'\blead\b', r'\bprincipal\b', r'\bstaff\b', r'5\+\s*years?']
MID_KEYWORDS     = [r'\bmid[- ]level\b', r'[2-4]\+?\s*years?\s*(?:of\s+)?experience']


def detect_by_keywords(text):
    """
    Scans for explicit experience-level keywords before trying date math.
    Returns (level, years) if found, else (None, None).

    Examples:
        "ideal for freshers"        → ("entry", 0)
        "senior engineer needed"    → ("senior", 5)
        "2+ years of experience"    → ("mid", 2)
        "no mention at all"         → (None, None)
    """
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


def extract_experience_section(raw_text):
    exp_match = re.search(r'\bexperience\b', raw_text, re.IGNORECASE)
    if not exp_match:
        return raw_text
    exp_start = exp_match.start()
    next_section = re.compile(
        r'\b(' + '|'.join(SECTION_HEADERS) + r')\b', re.IGNORECASE
    )
    next_match = next_section.search(raw_text, exp_start + len("experience"))
    exp_end = next_match.start() if next_match else len(raw_text)
    return raw_text[exp_start:exp_end]


def normalize_dates(text):
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


def extract_explicit_years(text):
    forward = re.findall(r'(\d+)\+?\s*years?\s*(?:of\s+)?experience', text, re.IGNORECASE)
    reverse = re.findall(r'experience\s+(?:of\s+)?(\d+)\+?\s*years?', text, re.IGNORECASE)
    return sum(int(n) for n in forward) + sum(int(n) for n in reverse)


def extract_date_range_years(text):
    text         = normalize_dates(text)
    total_months = 0

    pattern_month_year = re.compile(
        r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
        r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
        r'\s+(\d{4})\s*[-–—to]+\s*'
        r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
        r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?'
        r'|Present|Current|Now)\s*(\d{4})?',
        re.IGNORECASE
    )

    for match in pattern_month_year.finditer(text):
        start_month, start_year, end_token, end_year = match.groups()
        start_date = parse_date(start_month, start_year)
        if end_token.lower() in ("present", "current", "now"):
            end_date = datetime.today()
        else:
            end_date = parse_date(end_token, end_year)
            if end_date is None:
                continue
        diff          = relativedelta.relativedelta(end_date, start_date)
        total_months += diff.years * 12 + diff.months

    if total_months == 0:
        for match in re.finditer(
            r'\b(20\d{2}|19\d{2})\s*[-–—to]+\s*(20\d{2}|19\d{2}|Present|Current)\b',
            text, re.IGNORECASE
        ):
            start_y, end_token = match.groups()
            start_date = datetime(int(start_y), 1, 1)
            end_date   = datetime.today() if end_token.lower() in ("present", "current") \
                         else datetime(int(end_token), 1, 1)
            diff          = relativedelta.relativedelta(end_date, start_date)
            total_months += diff.years * 12 + diff.months

    return round(total_months / 12, 1)


def estimate_experience(raw_text, source="resume"):
    """
    Two-stage detection:
        Stage 1 → keyword scan (catches fresher, entry-level, senior, etc.)
        Stage 2 → year/date math (catches "3 years experience", date ranges)

    For job descriptions (source="job"), keyword scan alone is usually enough.
    For resumes (source="resume"), date math is more reliable.
    """
    # Stage 1 — keyword detection (works for both resume and job description)
    level, years = detect_by_keywords(raw_text)
    if level:
        return level, years

    # Stage 2 — date math (mainly for resumes with date ranges)
    text_to_scan = extract_experience_section(raw_text) if source == "resume" else raw_text
    explicit     = extract_explicit_years(text_to_scan)
    from_dates   = extract_date_range_years(text_to_scan)
    total        = max(explicit, from_dates)

    if total == 0:
        return None, None   # genuinely not mentioned

    level = "entry" if total <= 1 else "mid" if total <= 4 else "senior"
    return level, total