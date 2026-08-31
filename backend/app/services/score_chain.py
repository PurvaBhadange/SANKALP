import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.models import EvaluationScore


def compute_score_hash(
    application_id: uuid.UUID,
    evaluator_id: uuid.UUID,
    criteria_id: uuid.UUID,
    score: float | int | str | Decimal,
    comments: Optional[str],
    submitted_at: datetime,
    prev_hash: str
) -> str:
    """
    Computes SHA-256 hash of:
    application_id + evaluator_id + criteria_id + str(score) + (comments or '') + submitted_at + prev_hash
    """
    # Quantize score to 2 decimal places to ensure consistent string representation regardless of Decimal/float/str
    score_str = str(Decimal(str(score)).quantize(Decimal('0.01')))
    comments_str = comments if comments else ""
    
    if submitted_at.tzinfo is None:
        dt_utc = submitted_at.replace(tzinfo=timezone.utc)
    else:
        dt_utc = submitted_at.astimezone(timezone.utc)
    
    iso_time = dt_utc.strftime("%Y-%m-%dT%H:%M:%S.%f") + "+00:00"
    
    payload = f"{application_id}{evaluator_id}{criteria_id}{score_str}{comments_str}{iso_time}{prev_hash}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get_previous_score_hash(db: Session, application_id: uuid.UUID) -> str:
    """
    Finds the most recent score row hash for this application, or returns 'GENESIS'.
    """
    last_score = db.query(EvaluationScore).filter(
        EvaluationScore.application_id == application_id
    ).order_by(
        EvaluationScore.submitted_at.desc(),
        EvaluationScore.id.desc()
    ).first()

    if last_score:
        return last_score.row_hash
    return "GENESIS"


def verify_score_chain(db: Session, application_id: uuid.UUID) -> Dict[str, Any]:
    """
    Independently verifies:
    1. Content integrity: recomputes hash fresh from current column values and compares with stored row_hash.
    2. Chain linkage: verifies each row's prev_hash matches the prior row's row_hash.
    Returns {
        "valid": bool,
        "content_tampered_rows": List[dict],
        "chain_broken_at": str | None,
        "total_scores": int,
        "reason": str
    }
    """
    scores = db.query(EvaluationScore).filter(
        EvaluationScore.application_id == application_id
    ).order_by(
        EvaluationScore.submitted_at.asc(),
        EvaluationScore.id.asc()
    ).all()

    if not scores:
        return {
            "valid": True,
            "content_tampered_rows": [],
            "chain_broken_at": None,
            "total_scores": 0,
            "reason": "No scores submitted for this application yet."
        }

    content_tampered_rows: List[dict] = []
    chain_broken_at: Optional[str] = None
    expected_prev_hash = "GENESIS"

    for i, score_row in enumerate(scores):
        row_id_str = str(score_row.id)

        # 1. Independent Content Integrity Check: Recompute hash fresh from current column values
        recomputed_hash = compute_score_hash(
            application_id=score_row.application_id,
            evaluator_id=score_row.evaluator_id,
            criteria_id=score_row.criteria_id,
            score=score_row.score,
            comments=score_row.comments,
            submitted_at=score_row.submitted_at,
            prev_hash=score_row.prev_hash
        )

        if recomputed_hash != score_row.row_hash:
            content_tampered_rows.append({
                "row_id": row_id_str,
                "criteria_id": str(score_row.criteria_id),
                "evaluator_id": str(score_row.evaluator_id),
                "current_score": float(score_row.score),
                "stored_row_hash": score_row.row_hash,
                "recomputed_row_hash": recomputed_hash,
                "reason": "Content tampered: stored row_hash does not match hash recomputed from current row columns."
            })

        # 2. Independent Chain Linkage Check
        if score_row.prev_hash != expected_prev_hash and chain_broken_at is None:
            chain_broken_at = row_id_str

        # Advance expected prev_hash to current row's STORED row_hash for chain linkage verification
        expected_prev_hash = score_row.row_hash

    is_valid = (len(content_tampered_rows) == 0) and (chain_broken_at is None)

    reasons = []
    if content_tampered_rows:
        reasons.append(f"Content tampering detected in {len(content_tampered_rows)} row(s).")
    if chain_broken_at:
        reasons.append(f"Hash chain broken at row ID '{chain_broken_at}'.")
    if is_valid:
        reasons.append(f"All {len(scores)} score entries verified successfully. Content integrity and hash chain intact.")

    return {
        "valid": is_valid,
        "content_tampered_rows": content_tampered_rows,
        "chain_broken_at": chain_broken_at,
        "total_scores": len(scores),
        "reason": " ".join(reasons)
    }

