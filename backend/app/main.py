from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import SessionLocal
from app.services.seed import seed_db
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.audit_logs import router as audit_router
from app.api.documents import router as doc_router
from app.api.notifications import router as notif_router
from app.api.challenges import router as challenges_router
from app.api.startups import router as startups_router
from app.api.applications import router as applications_router
from app.api.evaluation import router as evaluation_router
from app.api.pilots import router as pilots_router
from app.api.decisions import router as decisions_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed DB on startup
    from app.models.models import Base
    from app.core.database import engine
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_db(db)
    except Exception as e:
        print(f"Failed to seed database during startup: {e}")
    finally:
        db.close()
    yield


app = FastAPI(
    title="Procurement Foundation Platform (Module 1)",
    description="Module 1 - Auth, RBAC, Audit logging and Cross-cutting generic services.",
    version="1.0.0",
    lifespan=lifespan
)

from app.core.config import settings

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(audit_router)
app.include_router(doc_router)
app.include_router(notif_router)
app.include_router(challenges_router)
app.include_router(startups_router)
app.include_router(applications_router)
app.include_router(evaluation_router)
app.include_router(pilots_router)
app.include_router(decisions_router)




@app.get("/")
def read_root():
    return {"status": "healthy", "service": "procurement-backend"}
