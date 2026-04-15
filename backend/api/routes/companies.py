# api/routes/companies.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.database import db

router = APIRouter()

companies_collection = db["companies"]


class CompanySelection(BaseModel):
    user_id  : str
    companies: list[str]


class CustomCompany(BaseModel):
    name    : str
    industry: Optional[str] = "Technology"


# ── GET /api/companies/{user_id} ──────────────────────────

@router.get("/companies/{user_id}")
async def get_companies(user_id: str):
    """
    Returns the user's selected companies, custom companies list,
    and hidden companies list from MongoDB.

    Frontend calls this on mount to restore previous state.
    """
    doc = await companies_collection.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )

    if not doc:
        return {
            "selected_companies"   : [],
            "custom_companies_list": [],
            "hidden_companies"     : []
        }

    return {
        "selected_companies"   : doc.get("selected_companies", []),
        "custom_companies_list": doc.get("custom_companies_list", []),
        "hidden_companies"     : doc.get("hidden_companies", [])
    }


# ── POST /api/companies/select ────────────────────────────

@router.post("/companies/select")
async def select_companies(body: CompanySelection):
    """
    Saves selected_companies array for this user.

    Auto-detects custom companies: any name not in the hardcoded
    KNOWN_COMPANIES set is added to custom_companies_list as well.
    Uses upsert so first-time users are handled automatically.
    """
    KNOWN_COMPANIES = {
        "Google", "Microsoft", "Amazon", "TCS", "Infosys", "Meta",
        "Wipro", "HCL Technologies", "Accenture", "IBM", "Adobe",
        "Oracle", "SAP", "Salesforce", "Cisco Systems",
        "Intel Corporation", "Dell Technologies", "Uber", "Airbnb",
        "Freshworks", "Zoho"
    }

    # Detect which selected companies are custom (not in hardcoded list)
    custom_names = [
        name for name in body.companies
        if name not in KNOWN_COMPANIES
    ]

    # Fetch existing custom list to avoid duplicates
    existing_doc = await companies_collection.find_one({"user_id": body.user_id})
    existing_custom = existing_doc.get("custom_companies_list", []) if existing_doc else []
    existing_names  = {c["name"] for c in existing_custom}

    # Build new custom entries for names not already stored
    new_custom_entries = [
        {"name": name, "industry": "Custom"}
        for name in custom_names
        if name not in existing_names
    ]

    update = {
        "$set": {
            "user_id"           : body.user_id,
            "selected_companies": body.companies,
        }
    }

    # Only push new custom entries if there are any
    if new_custom_entries:
        update["$push"] = {
            "custom_companies_list": {"$each": new_custom_entries}
        }

    await companies_collection.update_one(
        {"user_id": body.user_id},
        update,
        upsert=True
    )

    return {
        "message"  : f"{len(body.companies)} companies saved.",
        "companies": body.companies
    }


# ── DELETE /api/companies/{user_id}/{company_name} ────────

@router.delete("/companies/{user_id}/{company_name}")
async def delete_company(user_id: str, company_name: str):
    """
    Adds company_name to the user's hidden_companies array.
    Also removes it from selected_companies and custom_companies_list.

    The GET endpoint filters out hidden companies so the card
    never appears again for this user.
    """
    result = await companies_collection.update_one(
        {"user_id": user_id},
        {
            "$addToSet": {
                "hidden_companies": company_name
            },
            "$pull": {
                "selected_companies"   : company_name,
                "custom_companies_list": {"name": company_name}
            }
        },
        upsert=True
    )

    if result.matched_count == 0 and result.upserted_id is None:
        raise HTTPException(status_code=404, detail="User not found.")

    return {"message": f"{company_name} hidden successfully."}