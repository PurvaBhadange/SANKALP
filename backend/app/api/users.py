import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role, get_password_hash
from app.models.models import User, Role, Department
from app.schemas.schemas import UserCreate, UserResponse
from app.services.audit import log_audit

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: Request,
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPER_ADMIN"))
):
    ip_addr = request.client.host if request.client else None

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check department
    dept = None
    if payload.department_id:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department with ID {payload.department_id} not found"
            )

    # Check roles
    roles = []
    for role_name in payload.role_names:
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role '{role_name}' not found"
            )
        roles.append(role)

    # Hash password
    hashed_pwd = get_password_hash(payload.password)

    # Create user
    new_user = User(
        id=uuid.uuid4(),
        email=payload.email,
        hashed_password=hashed_pwd,
        full_name=payload.full_name,
        department_id=dept.id if dept else None,
        is_active=True
    )
    # Add roles
    new_user.roles = roles
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit logging for user creation
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="USER_CREATE",
        entity_type="users",
        entity_id=new_user.id,
        after_state={
            "email": new_user.email,
            "full_name": new_user.full_name,
            "department_id": str(new_user.department_id) if new_user.department_id else None
        },
        ip_address=ip_addr
    )

    # Audit logging for role assignment
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="ROLE_ASSIGN",
        entity_type="users",
        entity_id=new_user.id,
        after_state={
            "roles": [r.name for r in new_user.roles]
        },
        ip_address=ip_addr
    )

    return new_user

@router.get("", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("SUPER_ADMIN"))
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users
