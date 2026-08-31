import hashlib
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    get_current_user,
    oauth2_scheme,
)
from app.models.models import User, RefreshToken, Role, Sector, Startup
from app.schemas.schemas import LoginRequest, TokenResponse, RefreshRequest, UserResponse, StartupRegister
from app.services.audit import log_audit
from app.services.gemini import generate_embedding


router = APIRouter(prefix="/auth", tags=["auth"])

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

@router.post("/login", response_model=TokenResponse)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    ip_addr = request.client.host if request.client else None
    user = db.query(User).filter(User.email == payload.email).first()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        # Audit login failure
        if user:
            log_audit(
                db=db,
                actor_user_id=user.id,
                action="LOGIN_FAILURE",
                entity_type="users",
                entity_id=user.id,
                ip_address=ip_addr
            )
        else:
            # actor_user_id is None since user doesn't exist
            log_audit(
                db=db,
                actor_user_id=None,
                action="LOGIN_FAILURE",
                entity_type="users",
                entity_id=uuid.UUID(int=0), # dummy UUID for system/anon
                ip_address=ip_addr
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    # Generate tokens
    user_id = user.id
    roles = [r.name for r in user.roles]
    access_token = create_access_token(data={"sub": str(user_id), "roles": roles})
    refresh_token = create_refresh_token(data={"sub": str(user_id)})

    # Save refresh token hash in DB
    token_hash = hash_token(refresh_token)
    db_refresh_token = RefreshToken(
        id=uuid.uuid4(),
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_refresh_token)
    db.commit()

    # Audit login success
    log_audit(
        db=db,
        actor_user_id=user_id,
        action="LOGIN",
        entity_type="users",
        entity_id=user_id,
        ip_address=ip_addr
    )


    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    # Find matching refresh token
    token_hash = hash_token(payload.refresh_token)
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked_at.is_(None),
        RefreshToken.expires_at > datetime.utcnow()
    ).first()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user = db_token.user
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    # Generate new tokens
    roles = [r.name for r in user.roles]
    new_access_token = create_access_token(data={"sub": str(user.id), "roles": roles})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Revoke old refresh token and insert new one
    db_token.revoked_at = datetime.utcnow()
    
    new_token_hash = hash_token(new_refresh_token)
    db_new_refresh_token = RefreshToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_new_refresh_token)
    db.commit()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
def logout(request: Request, payload: RefreshRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ip_addr = request.client.host if request.client else None
    token_hash = hash_token(payload.refresh_token)
    
    # Locate and revoke the refresh token
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.user_id == current_user.id
    ).first()

    if db_token and db_token.revoked_at is None:
        db_token.revoked_at = datetime.utcnow()
        db.commit()

    # Log audit logout
    log_audit(
        db=db,
        actor_user_id=current_user.id,
        action="LOGOUT",
        entity_type="users",
        entity_id=current_user.id,
        ip_address=ip_addr
    )

    return {"detail": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/register-startup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_startup(
    request: Request,
    payload: StartupRegister,
    db: Session = Depends(get_db)
):
    ip_addr = request.client.host if request.client else None

    # 1. Validate registration number uniqueness
    existing_reg = db.query(Startup).filter(Startup.registration_number == payload.registration_number).first()
    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration number already registered."
        )

    # 2. Validate email uniqueness
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered."
        )

    # 3. Validate sector existence
    sector = db.query(Sector).filter(Sector.id == payload.sector_id).first()
    if not sector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified tech sector not found."
        )

    # 4. Fetch STARTUP_USER role
    startup_role = db.query(Role).filter(Role.name == "STARTUP_USER").first()
    if not startup_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="STARTUP_USER role not found in system database."
        )

    # 5. Create user
    user = User(
        id=uuid.uuid4(),
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        department_id=None,
        is_active=True
    )
    user.roles.append(startup_role)
    db.add(user)
    db.commit()
    db.refresh(user)

    # 6. Create startup
    is_profile_complete = bool(payload.description and payload.description.strip())
    embedding = None
    if is_profile_complete:
        embedding = generate_embedding(payload.description)

    startup = Startup(
        id=uuid.uuid4(),
        name=payload.startup_name,
        registration_number=payload.registration_number,
        dpiit_recognition_number=payload.dpiit_recognition_number,
        sector_id=payload.sector_id,
        description=payload.description,
        contact_user_id=user.id,
        embedding=embedding,
        profile_complete=is_profile_complete
    )
    db.add(startup)
    db.commit()
    db.refresh(startup)

    # 7. Generate tokens immediately
    roles = [r.name for r in user.roles]
    access_token = create_access_token(data={"sub": str(user.id), "roles": roles})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    token_hash = hash_token(refresh_token)
    db_refresh_token = RefreshToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_refresh_token)
    db.commit()

    # 8. Log audit event
    log_audit(
        db=db,
        actor_user_id=user.id,
        action="startup.register",
        entity_type="startups",
        entity_id=startup.id,
        after_state={
            "name": startup.name,
            "registration_number": startup.registration_number,
            "contact_email": user.email
        },
        ip_address=ip_addr
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

