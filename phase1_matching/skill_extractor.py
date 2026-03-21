# skill_extractor.py
import re

KNOWN_SKILLS = [
    "Python", "Java", "SQL", "JavaScript", "C++",
    "Machine Learning", "Deep Learning", "NLP",
    "TensorFlow", "PyTorch", "Docker", "Git",
    "React", "Flask", "FastAPI", "MongoDB", "PostgreSQL"
]

def extract_skills(raw_text):
    return [
        skill for skill in KNOWN_SKILLS
        if re.search(r'\b' + re.escape(skill) + r'\b', raw_text, re.IGNORECASE)
    ]