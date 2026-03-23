# api/routes/resume.py
import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from api.database import resume_collection
from phase1_matching.pdf_extractor import extract_text
from phase1_matching.skill_extractor import extract_skills
from phase1_matching.experience_estimator import estimate_experience

router = APIRouter()

UPLOAD_DIR  = "data/uploads"
SUPPORTED   = (".pdf", ".docx")

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/resume/upload")
async def upload_resume(file: UploadFile = File(...)):
    """
    Accepts a PDF or DOCX resume file from the frontend.

    Flow:
        1. Validate file type
        2. Save file temporarily to data/uploads/
        3. Extract raw text using pdf_extractor
        4. Extract skills + experience using Phase 1 code
        5. Save profile to MongoDB with a generated user_id
        6. Delete temp file
        7. Return profile + user_id to frontend
    """
    # Validate file type
    filename = file.filename or ""
    if not filename.endswith(SUPPORTED):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload PDF or DOCX."
        )

    # Save file temporarily
    user_id   = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{user_id}_{filename}")

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Run Phase 1 Task 1 code
        raw_text = extract_text(save_path)
        skills   = extract_skills(raw_text)
        level, years = estimate_experience(raw_text, source="resume")

        profile = {
            "user_id"            : user_id,
            "skills"             : skills,
            "experience_level"   : level,
            "years_of_experience": years,
            "original_filename"  : filename
        }

        # Save to MongoDB
        await resume_collection.insert_one(profile)

    finally:
        # Always delete temp file
        if os.path.exists(save_path):
            os.remove(save_path)

    return {
        "message" : "Resume parsed successfully",
        "user_id" : user_id,
        "profile" : {
            "skills"             : skills,
            "experience_level"   : level,
            "years_of_experience": years
        }
    }


@router.get("/resume/{user_id}")
async def get_profile(user_id: str):
    """
    Fetches a previously parsed profile from MongoDB by user_id.
    Frontend calls this to restore session after page refresh.
    """
    profile = await resume_collection.find_one(
        {"user_id": user_id},
        {"_id": 0}     # exclude MongoDB internal _id field
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return profile