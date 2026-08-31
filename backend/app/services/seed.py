from sqlalchemy.orm import Session
from app.models.models import Role, Department, User, Sector
from app.core.security import get_password_hash
from app.core.config import settings
import uuid

def seed_db(db: Session):
    # 1. Seed Roles
    roles_to_seed = [
        "SUPER_ADMIN",
        "DEPARTMENT_OFFICER",
        "EVALUATOR",
        "PROCUREMENT_OFFICER",
        "STARTUP_USER",
    ]
    
    role_map = {}
    for r_name in roles_to_seed:
        existing_role = db.query(Role).filter(Role.name == r_name).first()
        if not existing_role:
            new_role = Role(id=uuid.uuid4(), name=r_name)
            db.add(new_role)
            db.commit()
            db.refresh(new_role)
            role_map[r_name] = new_role
        else:
            role_map[r_name] = existing_role

    # 2. Seed Department
    dept_name = "Skills, Employment, Entrepreneurship and Innovation Dept"
    dept_code = "SEEID"
    existing_dept = db.query(Department).filter(Department.code == dept_code).first()
    if not existing_dept:
        dept = Department(
            id=uuid.uuid4(),
            name=dept_name,
            code=dept_code
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
    else:
        dept = existing_dept

    # 3. Seed Super Admin User
    admin_email = "admin@test.gov.in"
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    if not existing_admin:
        admin_pass = settings.SEED_ADMIN_PASSWORD
        hashed_pass = get_password_hash(admin_pass)
        admin_user = User(
            id=uuid.uuid4(),
            email=admin_email,
            hashed_password=hashed_pass,
            full_name="System Super Admin",
            department_id=dept.id,
            is_active=True
        )
        admin_user.roles.append(role_map["SUPER_ADMIN"])
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print(f"Super Admin seeded successfully: {admin_email}")
        
        # Log audit for seed creation
        from app.services.audit import log_audit
        log_audit(
            db=db,
            actor_user_id=None,
            action="USER_CREATE",
            entity_type="users",
            entity_id=admin_user.id,
            after_state={"email": admin_email, "full_name": admin_user.full_name, "roles": ["SUPER_ADMIN"]},
            ip_address="127.0.0.1"
        )
    else:
        print(f"Super Admin already exists: {admin_email}")
        try:
            if not existing_admin.roles and "SUPER_ADMIN" in role_map:
                existing_admin.roles.append(role_map["SUPER_ADMIN"])
                db.commit()
        except Exception:
            db.rollback()


    # 4. Seed Sectors
    sectors_to_seed = [
        "HealthTech",
        "AgriTech",
        "FinTech",
        "GovTech",
        "CleanTech",
        "EdTech",
        "Mobility",
        "Other"
    ]
    for s_name in sectors_to_seed:
        existing_sector = db.query(Sector).filter(Sector.name == s_name).first()
        if not existing_sector:
            sec = Sector(id=uuid.uuid4(), name=s_name)
            db.add(sec)
    db.commit()

