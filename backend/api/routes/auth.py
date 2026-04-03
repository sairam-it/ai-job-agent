# api/routes/auth.py
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from api.database import db
from api.auth_utils import hash_password, verify_password, create_token

router = APIRouter()
users_collection = db["users"]


from typing import Optional


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
    # Check if email already exists
    existing = await users_collection.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    password_bytes = body.password.encode('utf-8')
    if len(password_bytes) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer (bcrypt limit).")

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
        "message": "Account created successfully.",
        "token"  : token,
        "user_id": user_id,
        "name"   : body.name
    }


@router.post("/auth/signin")
async def signin(body: SigninBody):
    user = await users_collection.find_one({"email": body.email.lower().strip()})

    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token(user["user_id"])

    return {
        "message": "Signed in successfully.",
        "token"  : token,
        "user_id": user["user_id"],
        "name"   : user["name"]
    }


@router.get("/auth/me")
async def get_me(user_id: str):
    """Returns basic user info. Frontend calls this on app load to restore session."""
    user = await users_collection.find_one(
        {"user_id": user_id},
        {"_id": 0, "password": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user