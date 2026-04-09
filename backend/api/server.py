# api/server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from api.routes import resume, companies, jobs, auth
from api.database import client, MONGODB_DB_NAME

# ── Rate limiter (shared across all routes) ───────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title       = "AI Job Agent API",
    description = "Backend API for AI-powered job discovery",
    version     = "1.0.0"
)

# ── Attach limiter to app state ───────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:3000", "https://yourapp.vercel.app"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"]
)

# ── Routes ────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api", tags=["Auth"])
app.include_router(resume.router,    prefix="/api", tags=["Resume"])
app.include_router(companies.router, prefix="/api", tags=["Companies"])
app.include_router(jobs.router,      prefix="/api", tags=["Jobs"])


@app.on_event("startup")
async def check_db_connection():
    try:
        await client.admin.command("ping")
        print(f"[✓] MongoDB connected → database: {MONGODB_DB_NAME}")
    except Exception as e:
        print(f"[✗] MongoDB connection FAILED → {e}")


@app.get("/")
async def root():
    return {"message": "AI Job Agent API is running", "docs": "/docs"}