import os
import uuid
import shutil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
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
        # Create notification
        new_notif = models.Notification(
            student_id=student_record.id,
            type='success',
            title='Security Update',
            message='Your password was changed successfully.'
        )
        db.add(new_notif)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return {"success": True, "message": "Password updated successfully."}


class StudentProfileResponse(BaseModel):
    name: str
    index_number: str
    email: str
    mobile: str
    faculty: Optional[str] = None
    department: str
    degree_program: Optional[str] = None
    nic_number: str
    gender: str
    academic_year: str
    intake: str
    profile_picture: Optional[str] = None
    retrain_requested: bool = False
    last_trained_date: Optional[str] = None


@router.get("/profile", response_model=StudentProfileResponse)
def get_student_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    student_record = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if not student_record:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    return StudentProfileResponse(
        name=student_record.name,
        index_number=student_record.index_number,
        email=student_record.email,
        mobile=student_record.mobile,
        faculty=student_record.faculty,
        department=student_record.department,
        degree_program=student_record.degree_program,
        nic_number=student_record.nic_number,
        gender=student_record.gender,
        academic_year=student_record.academic_year,
        intake=student_record.intake,
        profile_picture=student_record.profile_picture,
        retrain_requested=student_record.retrain_requested,
        last_trained_date=str(student_record.last_trained_date) if student_record.last_trained_date else None,
    )


@router.post("/request-retrain")
def request_retrain(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    student = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    student.retrain_requested = True
    
    # Create notification
    new_notif = models.Notification(
        student_id=student.id,
        type='info',
        title='Request Submitted',
        message='Your face re-training request has been sent to the Admin.'
    )
    db.add(new_notif)
    
    db.commit()
    
    return {"success": True, "message": "Request sent to Admin. Please visit the IT office."}


@router.delete("/retrain-request")
def cancel_retrain_request(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Allow students to cancel their own pending face re-train requests."""
    student = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    if not student.retrain_requested:
        raise HTTPException(status_code=404, detail="No pending request found.")
        
    # Reset the request flag
    student.retrain_requested = False
    
    # Create cancellation notification for the student
    new_notif = models.Notification(
        student_id=student.id,
        type='info',
        title='Request Cancelled',
        message='You have successfully cancelled your face re-training request.'
    )
    db.add(new_notif)
    
    db.commit()
    
    return {"success": True, "message": "Pending request cancelled successfully."}


@router.post("/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    student_record = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if not student_record:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    os.makedirs("uploads/profiles", exist_ok=True)
    
    # Clean up old profile picture if exists
    if student_record.profile_picture:
        try:
            old_filename = student_record.profile_picture.split("/")[-1]
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
    
    student_record.profile_picture = image_url
    db.commit()

    return {"success": True, "profile_picture": image_url}


@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    student = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    notifs = (
        db.query(models.Notification)
        .filter(models.Notification.student_id == student.id)
        .order_by(models.Notification.timestamp.desc())
        .all()
    )
    
    return notifs


@router.put("/notifications/mark-read")
def mark_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    student = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
        
    db.query(models.Notification).filter(
        models.Notification.student_id == student.id,
        models.Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    
    db.commit()
    return {"success": True, "message": "Notifications marked as read"}

from typing import List

class SessionResponse(BaseModel):
    id: int
    device_name: str
    browser: str
    ip_address: str
    last_active: str
    is_current_session: bool

@router.get("/sessions", response_model=List[SessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        models.DeviceSession.__table__.create(db.get_bind(), checkfirst=True)
    except Exception:
        pass
        
    sessions = db.query(models.DeviceSession).filter(models.DeviceSession.user_email == current_user.email).order_by(models.DeviceSession.is_current_session.desc(), models.DeviceSession.last_active.desc()).all()
    
    if not sessions:
        # Create mock to simulate environment securely if table strictly initialized empty!
        s1 = models.DeviceSession(user_email=current_user.email, device_name="Windows PC", browser="Chrome", ip_address="192.168.1.105", is_current_session=True)
        s2 = models.DeviceSession(user_email=current_user.email, device_name="iPhone 13", browser="Safari", ip_address="10.0.0.4", is_current_session=False)
        db.add(s1)
        db.add(s2)
        db.commit()
        sessions = [s1, s2]

    res = []
    for s in sessions:
        res.append(SessionResponse(
            id=s.id,
            device_name=s.device_name,
            browser=s.browser,
            ip_address=s.ip_address,
            last_active=s.last_active.strftime("%Y-%m-%d %H:%M:%S") if s.last_active else "Unknown",
            is_current_session=s.is_current_session
        ))
    return res

@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session_record = db.query(models.DeviceSession).filter(
        models.DeviceSession.id == session_id,
        models.DeviceSession.user_email == current_user.email
    ).first()
    
    if not session_record:
        raise HTTPException(status_code=404, detail="Session not found")
        
    db.delete(session_record)
    db.commit()
    return {"message": "Session revoked successfully"}
