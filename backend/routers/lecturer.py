import os
import uuid
import shutil
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import get_db
from auth import verify_password, hash_password, get_current_user

router = APIRouter(prefix="/api/lecturer", tags=["Lecturer"])

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class LecturerProfileResponse(BaseModel):
    id: int
    name: str
    employee_id: str
    email: str
    personal_email: Optional[str] = None
    faculty: Optional[str] = None
    department: str
    assigned_subjects: Optional[str] = None
    profile_picture: Optional[str] = None
    office_hours: Optional[Any] = None

    class Config:
        from_attributes = True

class LecturerListOut(BaseModel):
    id: int
    name: str
    department: str
    email: str
    profile_picture: Optional[str] = None
    office_hours: Optional[Any] = None

    class Config:
        from_attributes = True

@router.get("/profile", response_model=LecturerProfileResponse)
def get_lecturer_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    lecturer = db.query(models.Lecturer).filter(models.Lecturer.email == current_user.email).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer profile not found.")
        
    return LecturerProfileResponse(
        id=lecturer.id,
        name=lecturer.name,
        employee_id=lecturer.employee_id,
        email=lecturer.email,
        personal_email=lecturer.personal_email,
        faculty=lecturer.faculty,
        department=lecturer.department,
        assigned_subjects=lecturer.assigned_subjects,
        profile_picture=lecturer.profile_picture,
        office_hours=lecturer.office_hours
    )

@router.get("/list", response_model=List[LecturerListOut])
def list_lecturers(db: Session = Depends(get_db)):
    """Fetch all active lecturers for students to book consultations."""
    return db.query(models.Lecturer).filter(models.Lecturer.is_active == True).all()

@router.post("/update-password")
def update_password(
    payload: UpdatePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

    current_user.hashed_password = hash_password(payload.new_password)
    
    # Also clear the forced password change requirement
    lecturer = db.query(models.Lecturer).filter(models.Lecturer.email == current_user.email).first()
    if lecturer:
        lecturer.requires_password_change = False
        
    db.commit()

    return {"success": True, "message": "Password updated successfully."}

@router.post("/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    lecturer = db.query(models.Lecturer).filter(models.Lecturer.email == current_user.email).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer profile not found.")

    os.makedirs("uploads/profiles", exist_ok=True)
    
    if lecturer.profile_picture:
        try:
            old_filename = lecturer.profile_picture.split("/")[-1]
            old_path = os.path.join("uploads", "profiles", old_filename)
            if os.path.exists(old_path):
                os.remove(old_path)
        except Exception as e:
            print(f"Warning: Failed to delete old profile picture. Error: {e}")

    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    file_path = f"uploads/profiles/{unique_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/uploads/profiles/{unique_filename}"
    lecturer.profile_picture = image_url
    db.commit()

    return {"success": True, "profile_picture": image_url}

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    personal_email: Optional[str] = None
    office_hours: Optional[Any] = None

@router.post("/update-profile")
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    lecturer = db.query(models.Lecturer).filter(models.Lecturer.email == current_user.email).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer profile not found.")
        
    if payload.name is not None:
        lecturer.name = payload.name
        
    if payload.personal_email is not None:
        lecturer.personal_email = payload.personal_email
        # Also sync to user model if necessary (auth_router uses it for reset)
        current_user.personal_email = payload.personal_email
    
    if payload.office_hours is not None:
        import json
        if isinstance(payload.office_hours, (list, dict)):
            lecturer.office_hours = json.dumps(payload.office_hours)
        else:
            lecturer.office_hours = payload.office_hours
        
    db.commit()
    return {"success": True, "message": "Profile updated successfully."}
