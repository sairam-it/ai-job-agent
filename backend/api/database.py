# api/database.py
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL     = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "ai_job_agent")

# Note: tlsAllowInvalidCertificates=True is used to bypass SSL certificate verification
# This is insecure for production. For production, ensure your system's CA certificates are up to date
# or provide the correct ssl_ca_certs path.
client = AsyncIOMotorClient(MONGODB_URL, tlsAllowInvalidCertificates=True)
db     = client[MONGODB_DB_NAME]

# Collections (equivalent to tables in SQL)
resume_collection    = db["resumes"]
companies_collection = db["companies"]
jobs_collection      = db["jobs"]
shortlist_collection = db["shortlist"]
scraped_jobs_collection = db["scraped_jobs"]   # ← new