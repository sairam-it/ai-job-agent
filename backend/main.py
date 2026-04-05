# main.py
import os
from phase1_matching.pdf_extractor import extract_text
from phase1_matching.resume_parser import build_profile
from phase1_matching.job_scraper import scrape_jobs
from phase1_matching.skill_matcher import run_matcher

DATA_DIR  = "data"
SUPPORTED = (".pdf", ".docx")

def find_resume():
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(SUPPORTED)]
    if not files:
        raise FileNotFoundError(f"No PDF or DOCX found in '{DATA_DIR}/' folder.")
    return os.path.join(DATA_DIR, files[0])

if __name__ == "__main__":
    # print("=" * 55)
    # print("  PHASE 1 — TASK 1: Resume Parsing")
    # print("=" * 55)
    resume_path = find_resume()
    # print(f"[✓] Resume found : {resume_path}")
    raw_text = extract_text(resume_path)
    build_profile(raw_text)

    # print("\n" + "=" * 55)
    # print("  PHASE 1 — TASK 2: Job Scraping")
    # print("=" * 55)
    scrape_jobs()

    # print("\n" + "=" * 55)
    # print("  PHASE 1 — TASK 3: Skill Matching")
    # print("=" * 55)
    run_matcher()
