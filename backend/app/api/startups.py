import uuid
import hashlib
import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.core.config import settings
from app.models.models import User, Role, Sector, Startup, Document, Challenge
from app.schemas.schemas import (
    StartupResponse, StartupUpdate, DocumentResponse, SemanticMatchResponse
)
from app.services.audit import log_audit
from app.services.gemini import generate_embedding

router = APIRouter(prefix="/startups", tags=["startups"])


@router.get("/me", response_model=StartupResponse)
def get_my_startup(
    current_user: User = Depends(require_role("STARTUP_USER")),
    db: Session = Depends(get_db)
):
    startup = db.query(Startup).filter(Startup.contact_user_id == current_user.id).first()
    if not startup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Startup profile not found for current user."
        )
    return startup


@router.patch("/me", response_model=StartupResponse)
def update_my_startup(
    payload: StartupUpdate,
    request: Request,
    current_user: User = Depends(require_role("STARTUP_USER")),
    db: Session = Depends(get_db)
):
    ip_addr = request.client.host if request.client else None

    startup = db.query(Startup).filter(Startup.contact_user_id == current_user.id).first()
    if not startup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Startup profile not found."
        )

    before_state = {
        "name": startup.name,
        "description": startup.description,
        "sector_id": str(startup.sector_id),
        "profile_complete": startup.profile_complete
    }

    update_data = payload.model_dump(exclude_unset=True)

    if "sector_id" in update_data and update_data["sector_id"]:
        sector = db.query(Sector).filter(Sector.id == update_data["sector_id"]).first()
        if not sector:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sector not found.")

    for key, val in update_data.items():
        setattr(startup, key, val)

    # Check embedding generation trigger rules
    if startup.description and startup.description.strip() and startup.registration_number and startup.sector_id:
        try:
            vec = generate_embedding(startup.description)
            if vec and isinstance(vec, list):
                startup.embedding = vec
                startup.profile_complete = True
            else:
                print("WARNING: Gemini embedding returned None, preserving profile state.")
        except Exception as e:
            print(f"WARNING: Exception during startup embedding generation: {e}")

    db.commit()
    db.refresh(startup)

    after_state = {
        "name": startup.name,
        "description": startup.description,
        "sector_id": str(startup.sector_id),
        "profile_complete": startup.profile_complete
    }

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="startup.profile_update",
        entity_type="startups",
        entity_id=startup.id,
        before_state=before_state,
        after_state=after_state,
        ip_address=ip_addr
    )

    return startup


@router.post("/me/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_startup_document(
    request: Request,
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("STARTUP_USER")),
    db: Session = Depends(get_db)
):
    ip_addr = request.client.host if request.client else None

    ALLOWED_DOC_TYPES = ["incorporation_certificate", "dpiit_certificate", "pan_card", "pitch_deck"]
    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type '{doc_type}'. Allowed types: {ALLOWED_DOC_TYPES}"
        )

    startup = db.query(Startup).filter(Startup.contact_user_id == current_user.id).first()
    if not startup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Startup profile not found.")

    contents = await file.read()
    file_hash = hashlib.sha256(contents).hexdigest()

    # Ensure uploads dir exists
    upload_dir = settings.UPLOAD_DIR
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, exist_ok=True)

    filename = f"startup_{startup.id}_{uuid.uuid4().hex[:8]}_{file.filename}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    doc = Document(
        id=uuid.uuid4(),
        owner_type="startup",
        owner_id=startup.id,
        doc_type=doc_type,
        file_url=filepath,
        file_hash=file_hash,
        uploaded_by=current_user.id,
        verification_status="pending"
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="DOCUMENT_UPLOAD",
        entity_type="documents",
        entity_id=doc.id,
        after_state={
            "owner_type": "startup",
            "owner_id": str(startup.id),
            "doc_type": doc_type,
            "filename": file.filename
        },
        ip_address=ip_addr
    )

    return doc


@router.get("/me/matching-challenges", response_model=List[SemanticMatchResponse])
def get_matching_challenges_for_startup(
    top_k: int = Query(5, ge=1, le=20),
    current_user: User = Depends(require_role("STARTUP_USER")),
    db: Session = Depends(get_db)
):
    startup = db.query(Startup).filter(Startup.contact_user_id == current_user.id).first()
    if not startup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Startup profile not found.")

    if not startup.profile_complete or startup.embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Matching unavailable — embedding not yet generated"
        )

    if db.bind.dialect.name == "sqlite":
        def cosine_dist(v1, v2):
            if not v1 or not v2: return 2.0
            dot = sum(a * b for a, b in zip(v1, v2))
            n1 = sum(a * a for a in v1) ** 0.5
            n2 = sum(b * b for b in v2) ** 0.5
            return 2.0 - (dot / (n1 * n2)) if (n1 * n2) else 2.0

        all_challenges = db.query(Challenge).filter(
            Challenge.status == "published",
            Challenge.embedding.isnot(None)
        ).all()
        results = [(c, cosine_dist(c.embedding, startup.embedding)) for c in all_challenges]
        results.sort(key=lambda x: x[1])
        results = results[:top_k]
    else:
        distance_expr = Challenge.embedding.cosine_distance(startup.embedding)
        results = db.query(Challenge, distance_expr.label("distance"))\
            .filter(
                Challenge.status == "published",
                Challenge.embedding.isnot(None)
            )\
            .order_by("distance")\
            .limit(top_k)\
            .all()


    matches = []
    for challenge, dist in results:
        # Cosine distance = 1 - cosine similarity
        score = max(0.0, min(1.0, 1.0 - (float(dist) / 2.0)))
        matches.append({
            "id": challenge.id,
            "title_or_name": challenge.title,
            "similarity_score": round(score, 4),
            "sector_name": challenge.sector.name if challenge.sector else None,
            "description_or_summary": challenge.raw_problem_text,
            "item_type": "challenge",
            "details": {
                "budget_ceiling": float(challenge.budget_ceiling) if challenge.budget_ceiling else None,
                "currency": challenge.currency,
                "status": challenge.status
            }
        })

    return matches


@router.get("", response_model=List[StartupResponse])
def list_startups(
    sector_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    query = db.query(Startup)
    if sector_id:
        query = query.filter(Startup.sector_id == sector_id)

    return query.order_by(Startup.created_at.desc()).all()


@router.get("/{id}", response_model=StartupResponse)
def get_startup_by_id(
    id: uuid.UUID,
    current_user: User = Depends(require_role("DEPARTMENT_OFFICER", "SUPER_ADMIN")),
    db: Session = Depends(get_db)
):
    startup = db.query(Startup).filter(Startup.id == id).first()
    if not startup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Startup not found.")
    return startup
