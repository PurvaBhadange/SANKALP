from typing import Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import ChallengeApplication, ChallengeEligibilityCriteria, Startup, Document, Challenge
from app.services.gemini import verify_document_claim

def evaluate_criteria(
    db: Session,
    application: ChallengeApplication,
    criteria: ChallengeEligibilityCriteria
) -> Tuple[bool, Optional[bool], Optional[Dict[str, Any]], Optional[bool]]:
    """
    Returns: (rules_engine_passed, ai_verification_passed, ai_verification_result, final_passed)
    """
    startup: Startup = application.startup
    challenge: Challenge = application.challenge
    key = criteria.criteria_key.strip().lower()
    val_json = criteria.criteria_value_json if isinstance(criteria.criteria_value_json, dict) else {}

    rules_passed = False
    ai_passed = None
    ai_result = None

    # Layer 1 — Rules Engine
    if key == "min_team_size":
        target = val_json.get("value") or val_json.get("min") or val_json.get("min_team_size") or 0
        try:
            target_int = int(target)
            rules_passed = (startup.team_size or 0) >= target_int
        except Exception:
            rules_passed = False

    elif key in ["dpiit_required", "dpiit_recognition"]:
        req_bool = val_json.get("required") if "required" in val_json else val_json.get("value", True)
        if req_bool:
            rules_passed = bool(startup.dpiit_recognition_number and startup.dpiit_recognition_number.strip())
        else:
            rules_passed = True

    elif key == "sector_match":
        allowed_sectors = val_json.get("allowed_sector_ids", [])
        if allowed_sectors:
            rules_passed = str(startup.sector_id) in [str(s) for s in allowed_sectors]
        else:
            rules_passed = (str(startup.sector_id) == str(challenge.sector_id))

    else:
        # Unrecognized key -> rules_passed = False, flag for human review
        rules_passed = False

    # Layer 2 — AI Document Verification
    if key in ["dpiit_required", "dpiit_recognition"]:
        # Find uploaded KYC document for startup
        doc = db.query(Document).filter(
            Document.owner_type == "startup",
            Document.owner_id == startup.id
        ).order_by(Document.uploaded_at.desc()).first()

        if not doc:
            ai_passed = False
            ai_result = {
                "extracted_value": None,
                "matches_claim": False,
                "confidence": "high",
                "note": "no document provided"
            }
        else:
            claimed_val = startup.dpiit_recognition_number or ""
            res = verify_document_claim(
                file_path=doc.file_url,
                claimed_field="dpiit_recognition_number",
                claimed_value=claimed_val
            )
            ai_result = res
            if "matches_claim" in res:
                ai_passed = bool(res["matches_claim"])
            else:
                ai_passed = None  # Could not determine / API hiccup
    else:
        ai_passed = None
        ai_result = {"not_applicable": True}

    # Combining Layers into final_passed
    if ai_result.get("not_applicable"):
        if rules_passed:
            final_passed = True
        else:
            final_passed = None
    else:
        if rules_passed and ai_passed is True:
            final_passed = True
        else:
            final_passed = None

    return rules_passed, ai_passed, ai_result, final_passed
