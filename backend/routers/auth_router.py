"""
routers/auth_router.py
──────────────────────
POST /api/login  – verify email + password + role, return JWT
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from auth import create_access_token, verify_password
from database import get_db
import models

router = APIRouter(prefix="/api", tags=["Auth"])


# ── Request / Response schemas ────────────────────────────────────
class LoginRequest(BaseModel):
    email:    EmailStr
    password: str
    role:     str          # 'Admin' | 'Lecturer' | 'Student'


class LoginResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    email:        str
    message:      str


# ── Route ─────────────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Authenticate a portal user and receive a JWT",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Validates email, password, **and** role against the `users` table.
    Returns a signed JWT on success.

    | Scenario                         | HTTP status |
    |----------------------------------|-------------|
    | Email not found                  | 401         |
    | Wrong password                   | 401         |
    | Role mismatch                    | 403         |
    | Account inactive                 | 403         |
    | Success                          | 200         |
    """
    user: models.User | None = (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    )

    # Always run verify_password even on not-found to prevent timing attacks.
    # This is a genuine bcrypt hash of "NOT_A_REAL_PASSWORD" (pre-generated).
    dummy_hash = "$2b$12$7ryRNQTK6CWEUzp5qkV6x.hCCID8yGXbTxlU12lWDUgQWY/JGDl2i"
    password_ok = verify_password(
        payload.password,
        user.hashed_password if user else dummy_hash,
    )

    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact your administrator.",
        )

    if user.role.lower() != payload.role.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is not registered as '{payload.role}'.",
        )

    token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})

    return LoginResponse(
        access_token=token,
        role=user.role,
        email=user.email,
        message=f"Login successful! Welcome back.",
    )
