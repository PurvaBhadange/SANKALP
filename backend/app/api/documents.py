import os
import uuid
import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.models import User, Document
from app.schemas.schemas import DocumentResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    owner_type: str = Form(...),
    owner_id: uuid.UUID = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Read file content to compute hash and save
    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty"
        )
        
    # Calculate SHA256 file hash
    file_hash = hashlib.sha256(contents).hexdigest()

    # Create destination directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Secure filename via UUID prefix to prevent collisions
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    # Write file to storage
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}"
        )

    # Save to database
    db_doc = Document(
        id=uuid.uuid4(),
        owner_type=owner_type,
        owner_id=owner_id,
        doc_type=doc_type,
        file_url=f"/uploads/{filename}",
        file_hash=file_hash,
        uploaded_by=current_user.id,
        verification_status="pending"
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    # Log audit event
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="DOCUMENT_UPLOAD",
        entity_type="documents",
        entity_id=db_doc.id,
        after_state={
            "owner_type": owner_type,
            "owner_id": str(owner_id),
            "doc_type": doc_type,
            "filename": file.filename,
            "file_hash": file_hash
        }
    )

    return db_doc

@router.get("/{owner_type}/{owner_id}", response_model=List[DocumentResponse])
def get_documents(
    owner_type: str,
    owner_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docs = db.query(Document).filter(
        Document.owner_type == owner_type,
        Document.owner_id == owner_id
    ).all()
    return docs
