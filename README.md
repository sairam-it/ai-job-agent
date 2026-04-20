<div align="center">

<img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
<img src="https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi" />
<img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb" />
<img src="https://img.shields.io/badge/Groq-LLM-F55036?style=for-the-badge" />
<img src="https://img.shields.io/badge/Tailwind_CSS-3.0-38BDF8?style=for-the-badge&logo=tailwindcss" />

# ⚡ AI Job Agent

### An AI-powered job discovery and application assistant that matches your skills to real jobs — automatically.

[Live Demo](#) · [Report Bug](https://github.com/sairam-it/ai-job-agent/issues) · [GitHub](https://github.com/sairam-it/ai-job-agent)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Team](#team)

---

## Overview

AI Job Agent is an end-to-end intelligent job application platform that eliminates the repetitive, manual effort of job searching. The system parses a user's resume, extracts skills using NLP, searches target company career pages in real time using AI-driven web research, scores every job against the user's profile using semantic matching, and generates personalized application materials — all in under 30 seconds.

Unlike conventional job boards that rely on keyword search, AI Job Agent uses a **confidence-weighted semantic scoring engine** to rank jobs by true skill compatibility, not just keyword overlap.

---

## Key Features

| Feature | Description |
|---|---|
| 🧠 **Resume Intelligence** | Section-aware NLP parsing separates work experience from education to prevent date miscalculation |
| ⚡ **Parallel Job Research** | All company searches run simultaneously via `asyncio.gather`, reducing research time from minutes to seconds |
| 🎯 **Semantic Scoring** | Groq LLM compares candidate profile against job requirements and returns a 0–100 match score with reasoning |
| 📊 **A/B/C/D Grading** | Every job receives a clear grade so candidates immediately know their competitive position |
| 🔐 **Dual Authentication** | Google OAuth via NextAuth + manual email OTP via Resend, both converging to the same session architecture |
| 📋 **Smart Apply Kit** | Pre-fills all application form fields from stored profile — ATS detection routes to correct field map |
| 💾 **Favorites System** | Strict user-isolated saved jobs with MongoDB compound indexes preventing cross-user data access |
| 🛡️ **Edge Middleware** | Next.js middleware at the edge layer intercepts unauthorized requests before any page renders |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14 (App Router) | Full-stack React framework, SSR, Edge Middleware |
| React | 19 | UI component library |
| Tailwind CSS | 3.x | Utility-first styling |
| NextAuth.js | 4.x | OAuth + JWT session management |
| Lucide React | Latest | Icon library |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.110+ | Async Python API framework |
| Motor | 3.x | Async MongoDB driver |
| Groq SDK | Latest | LLM inference (llama-3.1-8b + llama-3.3-70b) |
| Tavily | Latest | Real-time web search API |
| httpx | Latest | Async HTTP client for scraping |
| BeautifulSoup4 | Latest | HTML content extraction |
| slowapi | Latest | Rate limiting |

### Infrastructure
| Technology | Purpose |
|---|---|
| MongoDB Atlas | Primary database — users, resumes, jobs, sessions |
| Resend | Transactional email for OTP verification |

---

## System Architecture

```text
User Browser
│
▼
Next.js Edge Middleware (auth guard)
│
├── /auth      → NextAuth Google OAuth + Resend OTP
├── /upload    → Resume parsing (FastAPI)
├── /companies → Company selection (MongoDB)
├── /jobs      → AI research results
└── /favorites → Saved jobs (user-isolated)
│
▼
FastAPI Backend
│
┌───────────────┼───────────────┐
▼               ▼               ▼
MongoDB Atlas   Groq LLM        Tavily Search
(persistence)   (scoring)       (web research)
```

---

## Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB Atlas account (free tier)
- Groq API key (free at console.groq.com)
- Tavily API key (free at app.tavily.com)
- Resend account (free at resend.com)
- Google OAuth credentials

### 1. Clone the repository

```bash
git clone https://github.com/sairam-it/ai-job-agent.git
cd ai-job-agent
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

### 4. Configure environment variables

See [Environment Variables](#environment-variables) section below.

### 5. Create MongoDB indexes

Run once in MongoDB Atlas shell:

```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.pending_otps.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
db.saved_jobs.createIndex(
  { user_id: 1, title: 1, company: 1 },
  { unique: true }
)
```

### 6. Run the application

```bash
# Terminal 1 — Backend
cd backend && uvicorn api.server:app --reload

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

### `backend/.env`

```env
MONGODB_URL=mongodb+srv://...
MONGODB_DB_NAME=ai_job_agent
JWT_SECRET=your_secret_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
GROQ_API_KEY=gsk_...
TAVILY_API_KEY=tvly-...
```

### `frontend/.env.local`

```env
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=ai_job_agent
JWT_SECRET=same_as_backend
OTP_SALT=your-salt-here
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## Usage

1. Sign up with Google or email OTP
2. Upload your PDF or DOCX resume
3. Select target companies from the list (or add custom ones)
4. Click "Research" — AI searches all companies simultaneously
5. Browse ranked job matches with A/B/C/D grades
6. Save interesting jobs to Favorites
7. Click "Apply Now" for any job — pre-filled application kit appears
8. Copy fields into the job portal and submit

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/signin` | Authenticate user |
| POST | `/api/resume/upload` | Upload and parse resume |
| GET | `/api/resume/{user_id}` | Get parsed profile |
| GET | `/api/companies/{user_id}` | Get user's company selections |
| POST | `/api/companies/select` | Save company selections |
| POST | `/api/jobs/scrape` | Trigger AI job research |
| GET | `/api/jobs` | Get paginated job results |
| POST | `/api/jobs/save` | Save job to favorites |
| GET | `/api/jobs/saved` | Get user's saved jobs |
| POST | `/api/jobs/apply-kit` | Generate pre-filled apply kit |

Full API docs available at `http://localhost:8000/docs` when backend is running.

---

<div align="center">
<p>Built with ⚡ at CBIT Hyderabad · 2026</p>
</div>
