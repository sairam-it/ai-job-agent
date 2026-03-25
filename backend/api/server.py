# api/server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import resume, companies, jobs
from api.database import client, MONGODB_DB_NAME

app = FastAPI(
    title       = "AI Job Agent API",
    description = "Backend API for AI-powered job discovery",
    version     = "1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:3000", "https://yourapp.vercel.app"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"]
)

app.include_router(resume.router,    prefix="/api", tags=["Resume"])
app.include_router(companies.router, prefix="/api", tags=["Companies"])
app.include_router(jobs.router,      prefix="/api", tags=["Jobs"])


@app.on_event("startup")
async def check_db_connection():
    """
    Runs when server starts.
    Pings MongoDB — if connection fails you'll see the error immediately
    instead of discovering it later during an API call.
    """
    try:
        await client.admin.command("ping")
        print(f"[✓] MongoDB connected → database: {MONGODB_DB_NAME}")
    except Exception as e:
        print(f"[✗] MongoDB connection FAILED → {e}")


@app.get("/")
async def root():
    return {
        "message": "AI Job Agent API is running",
        "docs"   : "/docs"
    }

@app.get("/test-db")
async def test_db():
    from api.database import resume_collection
    result = await resume_collection.insert_one({"test": "hello"})
    doc    = await resume_collection.find_one({"test": "hello"}, {"_id": 0})
    await resume_collection.delete_one({"test": "hello"})
    return {"status": "MongoDB write/read working", "doc": doc}