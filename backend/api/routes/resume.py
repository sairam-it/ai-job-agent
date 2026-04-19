# api/routes/resume.py
import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from api.database import db
from api.auth_utils import decode_token
from phase1_matching.pdf_extractor import extract_text
from phase1_matching.resume_section_parser import build_full_profile
from jose import JWTError

router = APIRouter()
resume_collection   = db["resumes"]
companies_collection= db["companies"]

UPLOAD_DIR = "data/uploads"
SUPPORTED  = (".pdf", ".docx")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_user_from_token(authorization: str):
    """Extracts user_id from Bearer token header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token.")
    try:
        return decode_token(authorization.split(" ")[1])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid.")


@router.post("/resume/upload")
async def upload_resume(
    file         : UploadFile = File(...),
    authorization: str = Header(None)
):
    user_id = get_user_from_token(authorization)

    filename = file.filename or ""
    if not filename.endswith(SUPPORTED):
        raise HTTPException(status_code=400, detail="Upload PDF or DOCX only.")

    save_path = os.path.join(UPLOAD_DIR, f"{user_id}_{filename}")
    with open(save_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    try:
        raw_text = extract_text(save_path)
        profile  = build_full_profile(raw_text, user_id)
        profile["filename"] = filename

        # Upsert — if user uploads again, replace old profile
        await resume_collection.update_one(
            {"user_id": user_id},
            {"$set" : profile},
            upsert=True
        )
    finally:
        if os.path.exists(save_path):
            os.remove(save_path)

    return {
        "message" : "Resume parsed and saved.",
        "user_id" : user_id,
        "profile" : {
            "name"            : profile["name"],
            "skills"          : profile["skills"],
            "experience_level": profile["experience_level"],
            "years"           : profile["years"],
            "education"       : profile["education"],
            "work_experience" : profile["work_experience"],
        }
    }


@router.get("/resume/{user_id}")
async def get_resume(user_id: str, authorization: str = Header(None)):
    """
    Returns stored resume profile for the logged-in user.
    Frontend calls this on /upload page load to check if
    a returning user already has a parsed profile.
    """
    get_user_from_token(authorization)

    profile = await resume_collection.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        return {"exists": False}

    return {"exists": True, "profile": profile}


@router.get("/resume/{user_id}/companies")
async def get_saved_companies(user_id: str, authorization: str = Header(None)):
    """
    Returning user persistence — checks if user previously
    selected companies. Frontend uses this to show
    'Edit Selection' instead of blank company grid.
    """
    get_user_from_token(authorization)

    doc = await companies_collection.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return {"exists": False, "companies": []}

    return {
        "exists"   : True,
        "companies": [c["name"] for c in doc.get("companies", [])]
    }


# Add this function to resume.py
# Called when user fills missing fields during apply flow

@router.post("/resume/extend-profile")
async def extend_profile(
    user_id         : str,
    authorization   : str = Header(None),
    linkedin_url    : str = None,
    github_url      : str = None,
    portfolio_url   : str = None,
    address         : str = None,
    city            : str = None,
    state           : str = None,
    pincode         : str = None,
    nationality     : str = None,
    gender          : str = None,
    notice_period   : str = None,   # "Immediate" / "30 days" / "60 days"
    current_ctc     : str = None,   # "5 LPA"
    expected_ctc    : str = None,   # "8 LPA"
    highest_degree  : str = None,   # "B.Tech CSE"
    graduation_year : str = None,   # "2025"
    university      : str = None,   # "CBIT Hyderabad"
    cover_letter_bio: str = None,   # 2-3 sentence default bio
):
    """
    Saves additional profile fields that job applications need.
    Called when user is prompted for missing fields during apply flow.
    All fields optional — only updates what is provided.
    """
    get_user_from_token(authorization)

    update_fields = {}
    locals_copy = {
        "linkedin_url"   : linkedin_url,
        "github_url"     : github_url,
        "portfolio_url"  : portfolio_url,
        "address"        : address,
        "city"           : city,
        "state"          : state,
        "pincode"        : pincode,
        "nationality"    : nationality,
        "gender"         : gender,
        "notice_period"  : notice_period,
        "current_ctc"    : current_ctc,
        "expected_ctc"   : expected_ctc,
        "highest_degree" : highest_degree,
        "graduation_year": graduation_year,
        "university"     : university,
        "cover_letter_bio": cover_letter_bio,
    }

    for key, value in locals_copy.items():
        if value is not None:
            update_fields[key] = value

    if update_fields:
        await resume_collection.update_one(
            {"user_id": user_id},
            {"$set": update_fields}
        )

    return {"message": "Profile updated.", "updated_fields": list(update_fields.keys())}