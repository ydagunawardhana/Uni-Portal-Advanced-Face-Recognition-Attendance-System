from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import get_db
from auth import create_access_token, verify_password, hash_password, get_current_user

router = APIRouter(prefix="/api/student", tags=["Student"])

class StudentLoginRequest(BaseModel):
    email: str
    password: str
    role: str

class StudentLoginResponse(BaseModel):
    token: str
    role: str
    requires_password_change: bool
    message: str

@router.post("/login", response_model=StudentLoginResponse)
def student_login(payload: StudentLoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.email == payload.email, models.User.role == "Student")
        .first()
    )

    dummy_hash = "$2b$12$7ryRNQTK6CWEUzp5qkV6x.hCCID8yGXbTxlU12lWDUgQWY/JGDl2i"
    password_ok = verify_password(
        payload.password,
        user.hashed_password if user else dummy_hash,
    )

    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid student credentials"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact your administrator."
        )

    student = db.query(models.Student).filter(models.Student.email == payload.email).first()
    requires_change = student.requires_password_change if student else False

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})

    return StudentLoginResponse(
        token=token,
        role=user.role,
        requires_password_change=requires_change,
        message="Login successful"
    )

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/update-password")
def update_password(
    payload: UpdatePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify current password matches DB hash
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

    # Apply new password
    hashed_pw = hash_password(payload.new_password)
    
    user_to_update = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user_to_update.hashed_password = hashed_pw

    # Lookup and purge profile change requirement effectively silently
    student_record = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if student_record:
        student_record.requires_password_change = False

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {"success": True, "message": "Password updated successfully."}
