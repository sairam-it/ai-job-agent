# scripts/verify_mongodb.py
# Run: python3 scripts/verify_mongodb.py
# Verifies all MongoDB collections are working correctly.

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL  = os.getenv("MONGODB_URL")
DB_NAME      = os.getenv("MONGODB_DB_NAME", "ai_job_agent")

async def verify():
    print("\n" + "="*55)
    print("  MongoDB Verification Script")
    print("="*55)

    # Step 1 — connection
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        await client.admin.command("ping")
        print("[✓] MongoDB connection successful")
    except Exception as e:
        print(f"[✗] Connection FAILED → {e}")
        return

    db = client[DB_NAME]

    # Step 2 — list collections
    collections = await db.list_collection_names()
    print(f"[✓] Collections found : {collections}")
    expected = ["users","resumes","companies","jobs","shortlist"]
    for c in expected:
        status = "✓" if c in collections else "✗ MISSING"
        print(f"    {status}  {c}")

    # Step 3 — count documents in each
    print("\n  Document counts:")
    for c in expected:
        if c in collections:
            count = await db[c].count_documents({})
            print(f"    {c:<12} : {count} documents")

    # Step 4 — test write + read + delete
    print("\n  Write/Read/Delete test:")
    try:
        test_doc = {"_test": True, "value": "verification_check"}
        result   = await db["users"].insert_one(test_doc)
        print(f"    [✓] Write successful — inserted _id: {result.inserted_id}")

        fetched  = await db["users"].find_one({"_test": True}, {"_id": 0})
        print(f"    [✓] Read  successful — document: {fetched}")

        await db["users"].delete_one({"_test": True})
        print(f"    [✓] Delete successful — test doc removed")
    except Exception as e:
        print(f"    [✗] Write/Read failed → {e}")

    # Step 5 — show latest user (if any)
    print("\n  Latest registered user:")
    user = await db["users"].find_one({}, {"_id":0,"password":0}, sort=[("created_at",-1)])
    if user:
        print(f"    name     : {user.get('name')}")
        print(f"    email    : {user.get('email')}")
        print(f"    created  : {user.get('created_at')}")
    else:
        print("    No users yet — sign up first via the API.")

    # Step 6 — show latest shortlist entry
    print("\n  Latest shortlisted job:")
    job = await db["shortlist"].find_one({}, {"_id":0}, sort=[("match_score",-1)])
    if job:
        print(f"    title    : {job.get('title')}")
        print(f"    company  : {job.get('company')}")
        print(f"    match    : {job.get('raw_match')}%  grade: {job.get('grade')}")
    else:
        print("    No shortlisted jobs yet — run the pipeline first.")

    print("\n" + "="*55 + "\n")
    client.close()

asyncio.run(verify())