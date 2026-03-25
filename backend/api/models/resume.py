# api/models/resume.py
from pydantic import BaseModel
from typing import Optional

class Profile(BaseModel):
    skills           : list[str]
    experience_level : Optional[str] = None
    years_of_experience: float = 0.0

class ProfileResponse(BaseModel):
    message  : str
    profile  : Profile
    user_id  : str