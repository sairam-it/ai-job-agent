# api/routes/companies.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from api.database import companies_collection

router = APIRouter()


class CompanySelection(BaseModel):
    user_id   : str
    companies : list[str]   # ["Google", "Microsoft", "TCS"]


@router.post("/companies/select")
async def select_companies(body: CompanySelection):
    """
    Saves user's selected companies to MongoDB.
    Upserts — if user_id exists, update it. If not, create it.
    """
    if not body.companies:
        raise HTTPException(
            status_code=400,
            detail="Please select at least one company."
        )

    await companies_collection.update_one(
        {"user_id": body.user_id},
        {"$set": {
            "user_id"  : body.user_id,
            "companies": [{"name": c} for c in body.companies]
        }},
        upsert=True
    )

    return {
        "message"  : f"{len(body.companies)} companies saved.",
        "companies": body.companies
    }


@router.get("/companies/{user_id}")
async def get_companies(user_id: str):
    """Returns saved companies for a user."""
    doc = await companies_collection.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No companies found.")
    return doc