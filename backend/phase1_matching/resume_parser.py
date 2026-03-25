# resume_parser.py
import json
from phase1_matching.skill_extractor import extract_skills
from phase1_matching.experience_estimator import estimate_experience

def build_profile(raw_text):
    skills = extract_skills(raw_text)
    level, years = estimate_experience(raw_text)

    profile = {
        "skills": skills,
        "experience_level": level,
        "years_of_experience": years
    }

    with open("data/profile.json", "w") as f:
        json.dump(profile, f, indent=2)

    print(f"[✓] Skills     : {skills}")
    print(f"[✓] Experience : {level} ({years} yrs)")
    return profile