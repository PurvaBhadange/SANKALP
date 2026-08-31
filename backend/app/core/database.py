from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

def create_db_engine():
    db_url = settings.DATABASE_URL
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    try:
        eng = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
        with eng.connect() as conn:
            pass
        return eng
    except Exception:
        fallback_url = "sqlite:///./app.db"
        return create_engine(fallback_url, pool_pre_ping=True, connect_args={"check_same_thread": False})

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

