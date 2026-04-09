# api/routes/auth.py
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from api.database import db
from api.auth_utils import hash_password, verify_password, create_token

router = APIRouter()

users_collection    = db["users"]
resume_collection   = db["resumes"]
companies_collection= db["companies"]


class SignupBody(BaseModel):
    name    : str
    email   : str
    phone   : Optional[str] = None
    password: str


class SigninBody(BaseModel):
    email   : str
    password: str


@router.post("/auth/signup")
async def signup(body: SignupBody):
    existing = await users_collection.find_one({"email": body.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    if len(body.password.encode('utf-8')) > 72:
        raise HTTPException(status_code=400, detail="Password too long.")

    user_id = str(uuid.uuid4())
    user    = {
        "user_id"   : user_id,
        "name"      : body.name.strip(),
        "email"     : body.email.lower().strip(),
        "phone"     : (body.phone or "").strip(),
        "password"  : hash_password(body.password),
        "created_at": datetime.utcnow().isoformat()
    }

    await users_collection.insert_one(user)
    token = create_token(user_id)

    return {
        "message"  : "Account created successfully.",
        "token"    : token,
        "user_id"  : user_id,
        "name"     : body.name,
        "profile"  : None,
        "companies": []
    }


@router.post("/auth/signin")
async def signin(body: SigninBody):
    """
    Returns existing profile + companies on signin so frontend
    can skip upload step for returning users.
    """
    user = await users_collection.find_one(
        {"email": body.email.lower().strip()}
    )

    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_id = user["user_id"]
    token   = create_token(user_id)

    # ── Fetch existing profile if any ────────────────────
    profile_doc = await resume_collection.find_one(
        {"user_id": user_id},
        {"_id": 0, "raw_text": 0}     # exclude heavy fields
    )

    # ── Fetch selected companies if any ──────────────────
    companies_doc = await companies_collection.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    company_names = []
    if companies_doc:
        company_names = [
            c["name"] for c in companies_doc.get("companies", [])
        ]

    # ── Build clean profile for frontend ─────────────────
    profile_response = None
    if profile_doc:
        profile_response = {
            "skills"            : profile_doc.get("skills", []),
            "experience_level"  : profile_doc.get("experience_level"),
            "years"             : (
                profile_doc.get("years") or
                profile_doc.get("years_of_experience") or
                0
            ),
            "name"              : profile_doc.get("name", ""),
            "education"         : profile_doc.get("education", []),
            "work_experience"   : profile_doc.get("work_experience", []),
        }

    return {
        "message"  : "Signed in successfully.",
        "token"    : token,
        "user_id"  : user_id,
        "name"     : user["name"],
        "profile"  : profile_response,
        "companies": company_names
    }


@router.get("/auth/me")
async def get_me(user_id: str):
    user = await users_collection.find_one(
        {"user_id": user_id},
        {"_id": 0, "password": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user