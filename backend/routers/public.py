from fastapi import APIRouter, Depends, HTTPException, status # type: ignore
from pydantic import BaseModel, EmailStr # type: ignore
from sqlalchemy.orm import Session # type: ignore
from typing import Optional
from database import get_db
import models

router = APIRouter(prefix="/api/public", tags=["Public"])

class PreRegisterRequest(BaseModel):
    name: str
    personal_email: str
    mobile: Optional[str] = None
    nic_number: Optional[str] = None
    gender: Optional[str] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    degree_program: Optional[str] = None
    intake: Optional[str] = None
    academic_year: Optional[str] = None

@router.post("/pre-register")
def pre_register_student(payload: PreRegisterRequest, db: Session = Depends(get_db)):
    """
    Public endpoint for students to submit their preliminary information.
    This helps reduce administrative overhead during official registration.
    """
    # Check if a pre-registration with this email already exists
    existing = db.query(models.PreRegistration).filter(
        models.PreRegistration.personal_email == payload.personal_email
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pre-registration request with this email already exists."
        )

    new_pre_reg = models.PreRegistration(
        name=payload.name,
        personal_email=payload.personal_email,
        mobile=payload.mobile,
        nic_number=payload.nic_number,
        gender=payload.gender,
        faculty=payload.faculty,
        department=payload.department,
        degree_program=payload.degree_program,
        intake=payload.intake,
        academic_year=payload.academic_year
    )
    
    db.add(new_pre_reg)
    db.commit()
    db.refresh(new_pre_reg)
    
    return {
        "success": True, 
        "message": "Pre-registration submitted successfully. Please visit the administration office to finalize your registration.",
        "pre_registration_id": new_pre_reg.id
    }
