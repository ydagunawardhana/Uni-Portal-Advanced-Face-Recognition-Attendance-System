from contextlib import asynccontextmanager
from datetime import datetime
# auth system active

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import config
import models
from auth import hash_password
from database import engine, check_db_connection, SessionLocal
from routers import attendance as attendance_router
from routers import auth_router


# ──────────────────────────────────────────────
# Admin seeder
# ──────────────────────────────────────────────
def seed_admin() -> None:
    """
    Create the default Admin account if no Admin user exists yet.
    Runs once at startup — idempotent and safe to re-run.
    """
    db: Session = SessionLocal()
    try:
        exists = db.query(models.User).filter(
            models.User.role == "Admin"
        ).first()
        if not exists:
            admin = models.User(
                email           = "admin@gmail.com",
                hashed_password = hash_password("admin123"),
                role            = "Admin",
                is_active       = True,
            )
            db.add(admin)
            db.commit()
            print("[Seeder] ✅  Default Admin created  →  admin@gmail.com / admin123")
        else:
            print("[Seeder]    Admin account already exists — skipping.")
    finally:
        db.close()


# ──────────────────────────────────────────────
# Lifespan: startup & shutdown logic
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    print("🚀  Starting up Face Recognition Attendance System API...")
    models.Base.metadata.create_all(bind=engine)
    print("✅  Database tables created / verified.")
    seed_admin()                          # ← auto-seed default admin
    yield
    # SHUTDOWN
    print("🛑  Shutting down...")


# ──────────────────────────────────────────────
# App initialisation
# ──────────────────────────────────────────────
app = FastAPI(
    title=config.APP_TITLE,
    description=config.APP_DESCRIPTION,
    version=config.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ──────────────────────────────────────────────
# CORS
# ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,   # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(attendance_router.router)


# ══════════════════════════════════════════════
# Routes
# ══════════════════════════════════════════════

@app.get("/", tags=["General"])
def root():
    """Root endpoint – confirms the API is running."""
    return {
        "status": "Backend is running successfully",
        "app": config.APP_TITLE,
        "version": config.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["General"])
def health_check():
    """
    Health-check endpoint.
    Returns the API status and whether the database is reachable.
    """
    db_ok = check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/test", tags=["General"])
def test_route():
    """
    Basic test route to verify routing, CORS, and JSON serialisation work.
    """
    return {
        "message": "Test route is working!",
        "hint": "If you can read this from your React app, CORS is configured correctly.",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
