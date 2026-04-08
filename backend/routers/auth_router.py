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
from utils.audit_logger import log_audit_action
import models
import random
import smtplib
import ssl
from email.message import EmailMessage
from datetime import datetime, timedelta
from config import SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
from auth import hash_password

router = APIRouter(prefix="/api", tags=["Auth"])


#  Request / Response schemas 
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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp:   str


class ResetPasswordRequest(BaseModel):
    email:        EmailStr
    otp:          str
    new_password: str


#  Route 
@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Authenticate a portal user and receive a JWT",
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Validates email, password, **and** role against the `users` table.
    Returns a signed JWT on success.
    """
    user: models.User | None = (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    )

    #  run verify_password even on not-found to prevent timing attacks.
    dummy_hash = "$2b$12$7ryRNQTK6CWEUzp5qkV6x.hCCID8yGXbTxlU12lWDUgQWY/JGDl2i"
    password_ok = verify_password(
        payload.password,
        user.hashed_password if user else dummy_hash,
    )

    if not user or not password_ok:
        # Log failed login attempt
        log_audit_action(
            db=db,
            action_type="Login Activity",
            description=f"Failed login attempt for email '{payload.email}' as {payload.role}.",
            status="Failed",
            severity="Critical",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        log_audit_action(
            db=db,
            action_type="Login Activity",
            description=f"Login blocked for deactivated account '{payload.email}'.",
            status="Failed",
            severity="Warning",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact your administrator.",
        )

    if user.role.lower() != payload.role.lower():
        log_audit_action(
            db=db,
            action_type="Login Activity",
            description=f"Role mismatch for '{payload.email}' – attempted as '{payload.role}' but registered as '{user.role}'.",
            status="Failed",
            severity="Warning",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is not registered as '{payload.role}'.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})

    # Log successful login
    log_audit_action(
        db=db,
        action_type="Login Activity",
        description=f"{user.role} '{user.email}' logged into the portal.",
    )

    return LoginResponse(
        access_token=token,
        role=user.role,
        email=user.email,
        message=f"Login successful! Welcome back.",
    )


def send_otp_email(to_email: str, otp: str):
    """Sends a real email with the 6-digit OTP using a beautiful HTML template."""
    SENDER_EMAIL = "ydmaxx43@gmail.com"
    SENDER_PASSWORD = "zucytjngeujifxgl"

    msg = EmailMessage()
    msg['Subject'] = "University Portal - Password Reset Verification Code"
    msg['From'] = "Uni Portal Admin"
    msg['To'] = to_email

    # 1. Plain text fallback (for email clients that don't support HTML)
    text_fallback = f"Hello,\n\nWe received a request to reset your password. Your 6-digit verification code is: {otp}\n\nThis code is valid for 10 minutes. Do not share it with anyone. If you did not request this, ignore this email.\n\nBest Regards,\nUniversity Portal Admin Team"
    msg.set_content(text_fallback)

    # 2. Simple & Clean HTML Version (Dark Theme)
    html_content = f"""
    <html>
      <body style="background-color: #121212; padding: 40px 10px; margin: 0; font-family: Arial, sans-serif;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #1e1e1e; padding: 30px 40px; border-radius: 8px; color: #e5e7eb;">
          
          <h2 style="color: #3b82f6; text-align: center; margin-top: 0; padding-bottom: 20px; border-bottom: 1px solid #333333;">Password Reset</h2>
          
          <p style="font-size: 16px; margin-top: 30px;">Hello,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">
            We received a request to reset the password for your University Portal account. To complete the process, please use the One-Time Password (OTP) below:
          </p>
          
          <div style="background-color: #334155; border: 2px dashed #3b82f6; padding: 20px; text-align: center; border-radius: 8px; margin: 35px 0;">
            <span style="font-size: 34px; font-weight: bold; letter-spacing: 10px; color: #ffffff;">{otp}</span>
          </div>
          
          <p style="font-size: 14px; color: #9ca3af; line-height: 1.5;">
            This OTP is valid for <strong style="color: #e5e7eb;">10 minutes</strong>. If you did not request this verification, please ignore this email.
          </p>
          
          <p style="font-size: 15px; margin-top: 40px; color: #d1d5db;">
            Best Regards,<br>
            The University Portal Team
          </p>
          
          <hr style="border: none; border-top: 1px solid #333333; margin: 40px 0 20px 0;">
          <p style="text-align: center; font-size: 12px; color: #6b7280; margin: 0;">
            © 2026 University Portal. All rights reserved.
          </p>
          
        </div>
      </body>
    </html>
    """
    
    # Attach the HTML version
    msg.add_alternative(html_content, subtype='html')

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            print(f"[Email Success] Styled OTP sent to {to_email}")
    except Exception as e:
        print(f"[Email Error] Failed to send OTP to {to_email}: {str(e)}")


@router.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # 1. Check user exists
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found for this email.")
        
    if not user.personal_email:
        raise HTTPException(status_code=400, detail="No personal recovery email is linked to this account. Please contact admin.")

    # 2. Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.now() + timedelta(minutes=10)

    # 3. Store OTP (Cleanup existing for same email)
    db.query(models.PasswordReset).filter(models.PasswordReset.email == payload.email).delete()
    reset_entry = models.PasswordReset(
        email=payload.email,
        otp=otp,
        expires_at=expires_at
    )
    db.add(reset_entry)
    db.commit()

    # 4. Send Email
    send_otp_email(user.personal_email, otp)

    log_audit_action(
        db=db,
        action_type="Login Activity",
        description=f"Requested password reset OTP for {payload.email}.",
        status="Success",
        severity="Info",
        target_id=payload.email,
    )

    return {"message": "Verification code sent to your email.", "recovery_email": user.personal_email}


@router.post("/auth/verify-otp")
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    reset_entry = db.query(models.PasswordReset).filter(
        models.PasswordReset.email == payload.email,
        models.PasswordReset.otp == payload.otp,
        models.PasswordReset.used == False,
        models.PasswordReset.expires_at > datetime.now()
    ).first()

    if not reset_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired code.")

    return {"message": "OTP verified successfully."}


@router.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Final OTP validation
    reset_entry = db.query(models.PasswordReset).filter(
        models.PasswordReset.email == payload.email,
        models.PasswordReset.otp == payload.otp,
        models.PasswordReset.used == False,
        models.PasswordReset.expires_at > datetime.now()
    ).first()

    if not reset_entry:
        raise HTTPException(status_code=400, detail="Security check failed: code is invalid or expired.")

    # Update User Password
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = hash_password(payload.new_password)
    reset_entry.used = True
    db.commit()

    log_audit_action(
        db=db,
        action_type="Login Activity",
        description=f"Successfully reset password for {payload.email}.",
        status="Success",
        severity="Info",
        target_id=payload.email,
    )

    return {"message": "Password reset successfully."}
