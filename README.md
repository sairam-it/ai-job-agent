# AI Job Agent 🚀

An end-to-end AI agent for personalized job discovery — automatically extracts skills from your resume, scrapes relevant job listings from your target companies, and ranks them by skill match percentage.

---

## What It Does

- Parses your resume (PDF or DOCX) and extracts skills, tools, and experience level
- Scrapes job listings from your selected companies via the Adzuna API
- Matches your skills against each job's requirements
- Ranks all jobs by match percentage and saves a structured shortlist

---

## Project Structure

```
ai-job-agent/
├── main.py
├── .env                        ← your API credentials (never commit)
├── .env.example
├── data/
│   ├── your_resume.pdf         ← place resume here
│   ├── companies.json          ← your target companies
│   ├── profile.json            ← auto-generated: extracted skills
│   ├── job_listings.json       ← auto-generated: scraped jobs
│   └── shortlist.json          ← auto-generated: ranked matches
└── phase1_matching/
    ├── __init__.py
    ├── pdf_extractor.py
    ├── skill_extractor.py
    ├── experience_estimator.py
    ├── resume_parser.py
    ├── job_scraper.py
    └── skill_matcher.py
```

---

## Prerequisites

- Python 3.9 or higher
- A free [Adzuna API account](https://developer.adzuna.com/) — get your App ID and App Key

---

## Python Libraries

Install all dependencies:

```bash
pip install pymupdf python-docx python-dateutil requests \
            python-dotenv beautifulsoup4
```

| Library | Purpose |
|---|---|
| `pymupdf` | Extract text from PDF resumes |
| `python-docx` | Extract text from DOCX resumes |
| `python-dateutil` | Calculate experience from date ranges |
| `requests` | Fetch job listings from Adzuna API |
| `python-dotenv` | Load credentials from `.env` file |
| `beautifulsoup4` | Parse job description HTML |

---

## Setup

**1. Clone the repository**
```bash
git clone https://github.com/sairam-it/ai-job-agent.git
cd ai-job-agent
```

**2. Create your `.env` file**
```bash
cp .env.example .env
```
Open `.env` and add your Adzuna credentials:
```
ADZUNA_APP_ID=your_app_id_here
ADZUNA_APP_KEY=your_app_key_here
```

**3. Add your resume**

Place your resume PDF or DOCX inside the `data/` folder. Any filename works.

**4. Set your target companies**

Edit `data/companies.json`:
```json
[
  { "name": "Google" },
  { "name": "Microsoft" },
  { "name": "TCS" }
]
```

---

## Running Locally (VS Code)

**1. Open the project in VS Code**
```bash
code .
```

**2. Open the integrated terminal**

Press `` Ctrl + ` `` (backtick)

**3. Run the pipeline**
```bash
python3 main.py
```

The pipeline runs three tasks in sequence:

```
Task 1 → Resume parsed   → data/profile.json
Task 2 → Jobs scraped    → data/job_listings.json
Task 3 → Jobs ranked     → data/shortlist.json
```

## Notes

- Adzuna free tier allows 500 API calls/month — sufficient for regular use
- Jobs are deduplicated across companies by URL
- Match grades: **A** = 80%+, **B** = 60%+, **C** = 40%+, **D** = below 40%
