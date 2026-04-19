# services/apply_service.py

import re

# ── Known ATS URL patterns ─────────────────────────────────
ATS_PATTERNS = {
    "greenhouse" : [r"boards\.greenhouse\.io", r"grnh\.se"],
    "lever"      : [r"jobs\.lever\.co"],
    "workday"    : [r"myworkdayjobs\.com", r"wd\d+\.myworkdayjobs"],
    "icims"      : [r"icims\.com", r"careers\..*\.icims"],
    "linkedin"   : [r"linkedin\.com/jobs"],
    "naukri"     : [r"naukri\.com"],
    "indeed"     : [r"indeed\.com"],
    "freshteam"  : [r"freshteam\.com"],
    "zohorecruit": [r"zohorecruit\.com"],
    "smartrecruiters": [r"smartrecruiters\.com"],
}

# ── Fields each ATS typically asks for ────────────────────
ATS_FIELD_MAPS = {
    "greenhouse": [
        "first_name", "last_name", "email", "phone",
        "resume_pdf", "linkedin_url", "github_url",
        "city", "cover_letter"
    ],
    "lever": [
        "full_name", "email", "phone", "resume_pdf",
        "linkedin_url", "cover_letter", "current_company"
    ],
    "workday": [
        "first_name", "last_name", "email", "phone",
        "address", "city", "state", "pincode",
        "highest_degree", "graduation_year", "university",
        "resume_pdf", "cover_letter"
    ],
    "linkedin": [
        "full_name", "email", "phone", "resume_pdf",
        "linkedin_url", "notice_period", "expected_ctc"
    ],
    "naukri": [
        "full_name", "email", "phone",
        "current_ctc", "expected_ctc", "notice_period",
        "highest_degree", "graduation_year", "university",
        "city", "resume_pdf"
    ],
    "generic": [
        "full_name", "email", "phone", "resume_pdf",
        "linkedin_url", "cover_letter"
    ]
}

# ── Field labels for UI display ────────────────────────────
FIELD_LABELS = {
    "first_name"     : "First Name",
    "last_name"      : "Last Name",
    "full_name"      : "Full Name",
    "email"          : "Email Address",
    "phone"          : "Phone Number",
    "resume_pdf"     : "Resume (PDF)",
    "linkedin_url"   : "LinkedIn Profile URL",
    "github_url"     : "GitHub Profile URL",
    "portfolio_url"  : "Portfolio / Website URL",
    "cover_letter"   : "Cover Letter",
    "city"           : "City",
    "state"          : "State",
    "pincode"        : "PIN Code",
    "address"        : "Full Address",
    "current_ctc"    : "Current CTC",
    "expected_ctc"   : "Expected CTC",
    "notice_period"  : "Notice Period",
    "highest_degree" : "Highest Degree",
    "graduation_year": "Graduation Year",
    "university"     : "University / College",
    "nationality"    : "Nationality",
    "gender"         : "Gender",
    "current_company": "Current Company",
}


def detect_ats(url: str) -> str:
    """
    Detects which ATS a job URL belongs to.
    Returns ATS name string.
    """
    if not url:
        return "generic"
    url_lower = url.lower()
    for ats_name, patterns in ATS_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, url_lower):
                return ats_name
    return "generic"


def build_profile_field_map(profile: dict) -> dict:
    """
    Maps MongoDB profile fields to generic apply-kit field names.
    Handles name splitting, phone normalization, etc.
    """
    name = profile.get("name", "")
    parts = name.strip().split(" ", 1)
    first = parts[0] if parts else ""
    last  = parts[1] if len(parts) > 1 else ""

    return {
        "first_name"     : first,
        "last_name"      : last,
        "full_name"      : name,
        "email"          : profile.get("email", ""),
        "phone"          : profile.get("phone", ""),
        "linkedin_url"   : profile.get("linkedin_url", ""),
        "github_url"     : profile.get("github_url", ""),
        "portfolio_url"  : profile.get("portfolio_url", ""),
        "city"           : profile.get("city", ""),
        "state"          : profile.get("state", ""),
        "pincode"        : profile.get("pincode", ""),
        "address"        : profile.get("address", ""),
        "current_ctc"    : profile.get("current_ctc", ""),
        "expected_ctc"   : profile.get("expected_ctc", ""),
        "notice_period"  : profile.get("notice_period", ""),
        "highest_degree" : profile.get("highest_degree", ""),
        "graduation_year": profile.get("graduation_year", ""),
        "university"     : profile.get("university", ""),
        "nationality"    : profile.get("nationality", "India"),
        "gender"         : profile.get("gender", ""),
        "current_company": (
            profile.get("work_experience", [{}])[0].get("company", "")
            if profile.get("work_experience") else ""
        ),
        "cover_letter"   : profile.get("cover_letter_bio", ""),
        "resume_pdf"     : "[ Download from profile ]",
    }


def generate_apply_kit(profile: dict, job_url: str, job: dict) -> dict:
    """
    Master function.
    Returns everything the frontend needs to render the apply panel:
      - ats_name: which portal was detected
      - apply_url: where to redirect the user
      - fields: list of { field_key, label, value, is_missing }
      - missing_fields: fields with empty values
      - completion_pct: how complete the profile is for this ATS
    """
    ats_name      = detect_ats(job_url)
    required_keys = ATS_FIELD_MAPS.get(ats_name, ATS_FIELD_MAPS["generic"])
    field_map     = build_profile_field_map(profile)

    fields       = []
    missing      = []

    for key in required_keys:
        value      = field_map.get(key, "")
        is_missing = not value or value.strip() == ""

        fields.append({
            "key"       : key,
            "label"     : FIELD_LABELS.get(key, key),
            "value"     : value,
            "is_missing": is_missing,
        })

        if is_missing and key != "cover_letter":
            missing.append(key)

    filled_count    = len([f for f in fields if not f["is_missing"]])
    completion_pct  = round((filled_count / len(fields)) * 100)

    return {
        "ats_name"      : ats_name,
        "apply_url"     : job_url,
        "fields"        : fields,
        "missing_fields": missing,
        "completion_pct": completion_pct,
        "ready_to_apply": len(missing) == 0,
    }