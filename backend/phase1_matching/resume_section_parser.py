# resume_section_parser.py
import re
from datetime import datetime

# Section boundary keywords
SECTION_MARKERS = {
    "education"  : ["education", "academic", "qualification", "schooling"],
    "experience" : ["experience", "employment", "work history", "internship"],
    "skills"     : ["skills", "technologies", "technical skills", "tools"],
    "projects"   : ["projects", "personal projects", "academic projects"],
    "certifications": ["certifications", "certificates", "achievements"],
    "contact"    : ["contact", "personal info", "profile"],
}


def split_into_sections(raw_text):
    """
    Splits raw resume text into named sections.
    Returns dict: { "education": "...", "experience": "...", ... }
    
    Strategy: find each section header, slice text between headers.
    """
    lines    = raw_text.split("\n")
    sections = {}
    current_section = "header"
    buffer = []

    for line in lines:
        line_lower = line.strip().lower()
        matched    = None

        for section_name, keywords in SECTION_MARKERS.items():
            if any(kw in line_lower for kw in keywords) and len(line.strip()) < 40:
                matched = section_name
                break

        if matched:
            sections[current_section] = "\n".join(buffer)
            current_section = matched
            buffer = []
        else:
            buffer.append(line)

    sections[current_section] = "\n".join(buffer)
    return sections


def extract_contact_info(raw_text):
    """
    Extracts email, phone from full resume text.
    Returns dict with email and phone.
    """
    email_match = re.search(r'[\w.\-]+@[\w.\-]+\.\w+', raw_text)
    phone_match = re.search(r'(\+?\d[\d\s\-().]{8,15}\d)', raw_text)

    return {
        "email": email_match.group(0) if email_match else "",
        "phone": phone_match.group(0).strip() if phone_match else "",
    }


def extract_name(raw_text):
    """
    First non-empty line of resume is almost always the name.
    Returns cleaned name string.
    """
    for line in raw_text.split("\n"):
        line = line.strip()
        if line and len(line) < 50 and not "@" in line and not re.search(r'\d{5}', line):
            return line
    return ""


def extract_education(education_text):
    """
    Parses the education section into a list of dicts.
    Looks for institution names and year patterns.
    
    Returns: [{ institution, degree, year_start, year_end }]
    """
    entries   = []
    blocks    = re.split(r'\n{2,}', education_text.strip())

    for block in blocks:
        if not block.strip():
            continue

        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if not lines:
            continue

        year_match = re.search(r'(\d{4})\s*[-–—to]+\s*(\d{4}|present)', block, re.IGNORECASE)
        entry = {
            "institution": lines[0] if lines else "",
            "degree"     : lines[1] if len(lines) > 1 else "",
            "year_start" : year_match.group(1) if year_match else "",
            "year_end"   : year_match.group(2) if year_match else "",
        }
        if entry["institution"]:
            entries.append(entry)

    return entries


def extract_work_experience(experience_text):
    """
    Parses work experience section into a list of dicts.
    Looks for company names, roles, and date ranges.
    
    Returns: [{ company, role, start, end, duration_months }]
    """
    from dateutil import relativedelta

    entries = []
    blocks  = re.split(r'\n{2,}', experience_text.strip())

    MONTH_MAP = {
        "jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,
        "jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12
    }

    for block in blocks:
        if not block.strip():
            continue
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        if len(lines) < 2:
            continue

        date_pattern = re.search(
            r'(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)'
            r'\s+(\d{4})\s*[-–—to]+\s*'
            r'(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*|Present|Current)',
            block, re.IGNORECASE
        )

        duration = 0
        start_str, end_str = "", "Present"

        if date_pattern:
            start_month = MONTH_MAP.get(date_pattern.group(1)[:3].lower(), 1)
            start_year  = int(date_pattern.group(2))
            start_date  = datetime(start_year, start_month, 1)
            start_str   = date_pattern.group(1) + " " + date_pattern.group(2)
            end_token   = date_pattern.group(3)

            if end_token.lower() not in ("present", "current"):
                end_pattern = re.search(r'(\d{4})', block[date_pattern.end():])
                if end_pattern:
                    end_month = MONTH_MAP.get(end_token[:3].lower(), 12)
                    end_date  = datetime(int(end_pattern.group(1)), end_month, 1)
                    diff      = relativedelta.relativedelta(end_date, start_date)
                    duration  = diff.years * 12 + diff.months
                    end_str   = end_token + " " + end_pattern.group(1)
                else:
                    end_date = datetime.today()
                    diff     = relativedelta.relativedelta(end_date, start_date)
                    duration = diff.years * 12 + diff.months
            else:
                end_date = datetime.today()
                diff     = relativedelta.relativedelta(end_date, start_date)
                duration = diff.years * 12 + diff.months

        entry = {
            "company"        : lines[0],
            "role"           : lines[1] if len(lines) > 1 else "",
            "start"          : start_str,
            "end"            : end_str,
            "duration_months": duration
        }
        if entry["company"]:
            entries.append(entry)

    return entries


def build_full_profile(raw_text, user_id):
    """
    Master function — parses entire resume into structured sections.
    Returns a complete dict ready to insert into MongoDB resumes collection.
    
    What it extracts:
        name, email, phone  → from full text scan
        education           → from education section only
        work_experience     → from experience section only
        skills              → from skill_extractor (already built)
        experience_level    → from experience_estimator (already built)
        raw_text            → stored for future re-parsing
    """
    from phase1_matching.skill_extractor import extract_skills
    from phase1_matching.experience_estimator import estimate_experience

    sections       = split_into_sections(raw_text)
    contact        = extract_contact_info(raw_text)
    education      = extract_education(sections.get("education", ""))
    work_experience= extract_work_experience(sections.get("experience", ""))
    skills         = extract_skills(raw_text)
    level, years   = estimate_experience(raw_text, source="resume")

    return {
        "user_id"         : user_id,
        "name"            : extract_name(raw_text),
        "email"           : contact["email"],
        "phone"           : contact["phone"],
        "education"       : education,
        "work_experience" : work_experience,
        "skills"          : skills,
        "experience_level": level,
        "years"           : years,
        "raw_text"        : raw_text[:5000],
        "updated_at"      : datetime.utcnow().isoformat()
    }