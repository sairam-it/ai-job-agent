# api/server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import resume, companies, jobs

app = FastAPI(
    title       = "AI Job Agent API",
    description = "Backend API for AI-powered job discovery",
    version     = "1.0.0"
)

# CORS — allows your Next.js frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:3000", "https://yourapp.vercel.app"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"]
)

# Register all route files
app.include_router(resume.router,    prefix="/api", tags=["Resume"])
app.include_router(companies.router, prefix="/api", tags=["Companies"])
app.include_router(jobs.router,      prefix="/api", tags=["Jobs"])


@app.get("/")
async def root():
    return {
        "message": "AI Job Agent API is running",
        "docs"   : "/docs"
    }