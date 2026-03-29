"""
routers/admin.py
────────────────
Admin-only API endpoints powering the dashboard UI.

  GET  /api/admin/dashboard-stats   – live counts + today attendance %
  GET  /api/admin/recent-activity   – 5 most recent attendance log entries
  GET  /api/admin/system-status     – camera / face-recognition system health
  POST /api/admin/capture-face      – save one Base64 frame to dataset folder
  POST /api/admin/register-student  – persist full student record + user account
"""

from __future__ import annotations

import string
import smtplib
import ssl
import shutil
import base64
import secrets
from email.message import EmailMessage
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import hash_password, get_current_user
from database import get_db, check_db_connection
import models

router = APIRouter(prefix="/api/admin", tags=["Admin"])

DATASET_DIR = Path(__file__).resolve().parent.parent / "dataset"


def send_student_credentials_email(email: str, name: str, password: str):
    SENDER_EMAIL = "ydmaxx43@gmail.com"
    SENDER_PASSWORD = "zucytjngeujifxgl"
    
    msg = EmailMessage()
    msg['Subject'] = "Welcome to University Portal - Student Account Credentials"
    msg['From'] = "Uni Portal Admin"
    msg['To'] = email
    
    content = f"""Dear {name},

Welcome to the University Face Recognition Attendance Portal!
Your student account has been successfully created, and your face data has been registered in our attendance system.

You can now access the student portal to view your attendance and timetable.
Here are your temporary login credentials:

Username: {email}
Temporary Password: {password}
Access Portal: [http://localhost:3000/login]

⚠️ Important Security Step:
For your security, please log in using the temporary password above, navigate to your Profile, and update your password immediately.

If you face any issues logging in or need to request a face re-training, please contact the IT Administration.

Best Regards,
University Portal Admin Team
"""
    msg.set_content(content)
    
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            print(f"Student credentials successfully emailed to {email}")
    except Exception as e:
        print(f"Failed to email student credentials to {email}. Error: {e}")

def send_lecturer_credentials_email(email: str, name: str, password: str):
    SENDER_EMAIL = "ydmaxx43@gmail.com"
    SENDER_PASSWORD = "zucytjngeujifxgl"
    
    msg = EmailMessage()
    msg['Subject'] = "Welcome to University Portal - Lecturer Account Credentials"
    msg['From'] = "Uni Portal Admin"
    msg['To'] = email
    
    content = f"""Dear {name},

Welcome to the Academic Portal of the University. 
Your Lecturer credentials have been successfully updated in our system.

Username: {email}hjbn
Temporary Password: {password}
Access Portal: [http://localhost:3000/login]

⚠️ Security Reminder:
Please log in and change this password immediately in your Profile settings for security purposes.

Best Regards,
University Portal Admin Team
"""
    msg.set_content(content)
    
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            print(f"Lecturer credentials successfully emailed to {email}")
    except Exception as e:
        print(f"Failed to email lecturer credentials to {email}. Error: {e}")

def generate_temp_password(name: str) -> str:
    """Generate an 8-character password: 3 letters + 1 special + 4 alphanumeric."""
    prefix = name.split()[0][:3].capitalize() if name.strip() else "User"
    if len(prefix) < 3: prefix = prefix.ljust(3, "x")
    special = secrets.choice("!@#$%^&*")
    charset = string.ascii_lowercase + string.digits
    suffix = "".join(secrets.choice(charset) for _ in range(4))
    return f"{prefix}{special}{suffix}"


#  Response schemas 

class DashboardStats(BaseModel):
    total_students:           int
    total_lecturers:          int
    todays_attendance_pct:    float   # 0–100
    pending_manual_requests:  int
    pending_retrains:         int
    low_attendance_alerts:    int
    active_modules_today:     int


class ActivityItem(BaseModel):
    id:           int
    action_type:  str
    description:  str
    timestamp:    str          


class UpdateStudentRequest(BaseModel):
    name: str
    mobile: Optional[str] = None
    department: Optional[str] = None
    academic_year: Optional[str] = None
    intake: Optional[str] = None
    nic_number: Optional[str] = None
    gender: Optional[str] = None


class RecaptureRequest(BaseModel):
    images: List[str]


class SystemStatus(BaseModel):
    camera_status:  str        
    database_status: str      
    face_model_loaded: bool
    checked_at:     str        


#  Helper 

def _today_range():
    """Return (start_of_today, now) as naive UTC datetimes."""
    now   = datetime.now(timezone.utc).replace(tzinfo=None)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, now


def _check_face_model() -> bool:
    """Try to import the engine and verify the recognizer is loaded."""
    try:
        from face_recognition_engine import recognizer, face_cascade
        return recognizer is not None and face_cascade is not None
    except Exception:
        return False


#  Endpoints 

@router.get(
    "/dashboard-stats",
    response_model=DashboardStats,
    summary="Live dashboard stats for the Admin home page",
)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns:
    - **total_students**: count of rows in `students` table
    - **total_lecturers**: count of `users` where role = 'Lecturer'
    - **todays_attendance_pct**: unique students who entered today / total students × 100
    - **pending_manual_requests**: placeholder (always 0 until a requests table exists)
    """
    total_students  = db.query(models.Student).count()
    total_lecturers = db.query(models.User).filter(
        models.User.role == "Lecturer"
    ).count()

    start, now = _today_range()
    students_today = (
        db.query(models.AttendanceLog.student_id)
        .filter(
            models.AttendanceLog.timestamp >= start,
            models.AttendanceLog.timestamp <= now,
            models.AttendanceLog.status == "entered",
        )
        .distinct()
        .count()
    )

    pct = (
        round((students_today / total_students) * 100, 1)
        if total_students > 0 else 0.0
    )

    # Calculate real pending re-train requests from student records
    pending_retrains = db.query(models.Student).filter(models.Student.retrain_requested == True).count()
    
    # TODO: Once ClassSession models are implemented, calculate students with < 80% attendance
    low_attendance = 0 
    
    # TODO: Once Module/Schedule models are implemented, calculate active sessions today
    active_modules = 0

    pending_manual = 0

    return DashboardStats(
        total_students=total_students,
        total_lecturers=total_lecturers,
        todays_attendance_pct=pct,
        pending_manual_requests=pending_manual,
        pending_retrains=pending_retrains,
        low_attendance_alerts=low_attendance,
        active_modules_today=active_modules,
    )


def log_system_action(db: Session, action_type: str, description: str):
    """Simple global helper to log system actions to the Audit table."""
    new_log = models.AuditLog(action_type=action_type, description=description)
    db.add(new_log)
    db.commit()


@router.get(
    "/recent-activity",
    response_model=List[ActivityItem],
    summary="5 most recent administrative system audit logs",
)
def get_recent_activity(db: Session = Depends(get_db)):
    """
    Fetches the 5 latest Admin Audit actions. Filters for system level events.
    """
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(5).all()

    return [
        ActivityItem(
            id=log.id,
            action_type=log.action_type,
            description=log.description,
            timestamp=log.timestamp.isoformat(),
        )
        for log in logs
    ]


@router.get(
    "/system-status",
    response_model=SystemStatus,
    summary="Current face-recognition system and camera health",
)
def get_system_status():
    """
    Performs a lightweight health probe:
    - Checks whether the face-recognition model files are loaded.
    - Checks whether the database is reachable.
    Camera is reported 'Online' when the face model is loaded successfully.
    """
    db_ok    = check_db_connection()
    model_ok = _check_face_model()

    return SystemStatus(
        camera_status    = "Online"      if model_ok else "Offline",
        database_status  = "Connected"   if db_ok    else "Unreachable",
        face_model_loaded = model_ok,
        checked_at       = datetime.now(timezone.utc).isoformat(),
    )


#  Validate Face 

# Singleton face cascade for validation endpoint
face_cascade_path = str(DATASET_DIR.parent / "haarcascade_frontalface_default.xml")
validation_face_cascade = cv2.CascadeClassifier(face_cascade_path)

class ValidateFaceRequest(BaseModel):
    frame_b64: str

class ValidateFaceResponse(BaseModel):
    face_detected: bool
    reason: Optional[str] = None
    bbox: Optional[list[int]] = None

@router.post(
    "/validate-face",
    response_model=ValidateFaceResponse,
    summary="Validate that exactly one face appears in the webcam frame"
)
def validate_face(payload: ValidateFaceRequest):
    try:
        # Handle potential Data URI prefix
        clean_b64 = payload.frame_b64.split(",")[-1]
        img_bytes = base64.b64decode(clean_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            return ValidateFaceResponse(face_detected=False, reason="Invalid image data")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = validation_face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.2,
            minNeighbors=5,
            minSize=(50, 50)
        )

        if len(faces) == 0:
            return ValidateFaceResponse(face_detected=False, reason="No face found")
        elif len(faces) > 1:
            return ValidateFaceResponse(face_detected=False, reason="Multiple faces found")
        
        x, y, w, h = [int(v) for v in faces[0]]
        img_h, img_w = img.shape[:2]
        
        # 1. Size Check
        if w < img_w * 0.25 or h < img_h * 0.25:
            return ValidateFaceResponse(face_detected=False, reason="Please move closer")
            
        # 2. Position Check (Center of the face)
        cx, cy = x + w / 2, y + h / 2
        safe_x_min, safe_x_max = img_w * 0.3, img_w * 0.7
        safe_y_min, safe_y_max = img_h * 0.2, img_h * 0.8
        
        if not (safe_x_min <= cx <= safe_x_max and safe_y_min <= cy <= safe_y_max):
            return ValidateFaceResponse(face_detected=False, reason="Please center your face")

        return ValidateFaceResponse(face_detected=True, bbox=[x, y, w, h])

    except Exception as exc:
        return ValidateFaceResponse(face_detected=False, reason=f"Decoding error: {exc}")


#  Register Student 

class RegisterStudentRequest(BaseModel):
    name:               str
    index_number:       str
    email:              str
    mobile:             str
    department:         str
    nic_number:         str
    gender:             str
    academic_year:      str
    intake:             str
    face_frames:        list[str]     # 50 base64 strings
    auto_gen_password:  bool          = False
    password:           Optional[str] = None   


class RegisterStudentResponse(BaseModel):
    success:            bool
    message:            str
    student_id:         int
    generated_password: Optional[str] = None   

class LecturerCreateRequest(BaseModel):
    name: str
    employee_id: str
    email: str
    department: str
    assigned_subjects: Optional[str] = None
    auto_generate_password: bool = True
    password: Optional[str] = None

class LecturerUpdateRequest(BaseModel):
    name: str
    email: Optional[str] = None
    department: str
    assigned_subjects: Optional[str] = None
    is_active: bool


@router.post(
    "/register-student",
    response_model=RegisterStudentResponse,
    summary="Persist student record and create login account",
)
def register_student(
    payload: RegisterStudentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    1. Checks that the index_number is not already registered.
    2. Saves a new row in `students` (with all extended fields).
    3. Creates a matching row in `users` (role='Student') with a hashed password.
       - If `auto_gen_password` is True, a 12-char random password is generated
         and returned in the response so the admin can share it with the student.
       - Otherwise, the provided `password` field is used.
    """
    #  Guard: duplicate index number 
    existing = db.query(models.Student).filter(
        models.Student.index_number == payload.index_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A student with index number '{payload.index_number}' already exists.",
        )

    #  Guard: duplicate email in users table 
    existing_user = db.query(models.User).filter(
        models.User.email == payload.email
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{payload.email}' is already registered.",
        )

    #  Guard: Exactly 50 frames 
    if len(payload.face_frames) != 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exactly 50 face frames are required. Received {len(payload.face_frames)}.",
        )

    # Password 
    plain_password     = None
    generated_password = None

    if payload.auto_gen_password:
        plain_password     = generate_temp_password(payload.name)
        generated_password = plain_password      # returned to admin
    else:
        if not payload.password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A password must be provided when auto_gen_password is False.",
            )
        plain_password = payload.password

    hashed = hash_password(plain_password)

    #  Save Face Dataset 
    safe_name    = payload.index_number.replace("/", "_").replace(" ", "_")
    dataset_path = f"dataset/{safe_name}"
    folder       = DATASET_DIR / safe_name
    folder.mkdir(parents=True, exist_ok=True)

    for i, b64_frame in enumerate(payload.face_frames):
        filename = folder / f"img_{i:03d}.jpg"
        try:
            # Handle potential Data URI prefix
            clean_b64 = b64_frame.split(",")[-1]
            img_bytes = base64.b64decode(clean_b64)
            filename.write_bytes(img_bytes)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Could not decode / save frame {i}: {exc}",
            )

    #  Create Student row 
    student = models.Student(
        index_number      = payload.index_number,
        name              = payload.name,
        email             = payload.email,
        mobile            = payload.mobile,
        department        = payload.department,
        nic_number        = payload.nic_number,
        gender            = payload.gender,
        academic_year     = payload.academic_year,
        intake            = payload.intake,
        face_dataset_path = dataset_path,
    )
    db.add(student)
    db.flush()   # get the auto-generated student.id before committing

    #  Create User login account 
    user = models.User(
        email           = payload.email,
        hashed_password = hashed,
        role            = "Student",
        is_active       = True,
    )
    db.add(user)
    db.commit()
    db.refresh(student)

    if payload.auto_gen_password and generated_password:
        background_tasks.add_task(send_student_credentials_email, payload.email, payload.name, generated_password)

    return RegisterStudentResponse(
        success            = True,
        message            = f"Student '{payload.name}' registered successfully.",
        student_id         = student.id,
        generated_password = generated_password,
    )

@router.get("/students")
def get_all_students(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized access.")
    students = db.query(models.Student).all()
    return students

@router.get("/pending-retrains")
def get_pending_retrains(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized access.")
    pending = db.query(models.Student).filter(models.Student.retrain_requested == True).all()
    return pending


@router.put("/students/{student_id}")
def update_student(
    student_id: int,
    payload: UpdateStudentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Update Student record
    student.name = payload.name
    student.mobile = payload.mobile
    student.department = payload.department
    student.academic_year = payload.academic_year
    student.intake = payload.intake
    student.nic_number = payload.nic_number
    student.gender = payload.gender

    db.commit()
    db.refresh(student)
    return student


@router.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Physically delete face dataset folder
    safe_name = student.index_number.replace("/", "_").replace(" ", "_")
    folder = DATASET_DIR / safe_name
    if folder.exists():
        try:
            shutil.rmtree(folder)
        except Exception as e:
            print(f"Warning: Failed to delete dataset folder for student {student.index_number}: {e}")

    # Delete associated child records to prevent child constraint violations (SQLAlchemy IntegrityError)
    db.query(models.AttendanceLog).filter(models.AttendanceLog.student_id == student_id).delete()
    db.query(models.Notification).filter(models.Notification.student_id == student_id).delete()

    # Also find and delete corresponding User record to keep data synced
    user_record = db.query(models.User).filter(models.User.email == student.email).first()

    db.delete(student)
    if user_record:
        db.delete(user_record)

    db.commit()
    return {"success": True, "message": "Student, user account, attendance logs, and face dataset deleted successfully."}


@router.post("/students/{student_id}/recapture")
def recapture_face(
    student_id: int,
    payload: RecaptureRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if len(payload.images) != 50:
        raise HTTPException(status_code=400, detail="Exactly 50 face frames are required.")

    # Dataset path logic
    safe_name = student.index_number.replace("/", "_").replace(" ", "_")
    folder = DATASET_DIR / safe_name
    
    # Safely clear and recreate directory
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True, exist_ok=True)
    
    # Save new frames
    for i, b64_frame in enumerate(payload.images):
        filename = folder / f"img_{i:03d}.jpg"
        try:
            clean_b64 = b64_frame.split(",")[-1]
            img_bytes = base64.b64decode(clean_b64)
            filename.write_bytes(img_bytes)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to save frame {i}: {e}")
            
    # Update student record
    student.retrain_requested = False
    student.last_trained_date = datetime.now().date()
    
    # Send Notification to Student
    new_notif = models.Notification(
        student_id=student.id,
        type='success',
        title='Face Data Updated',
        message='Admin has successfully updated your face dataset.'
    )
    db.add(new_notif)
    
    db.commit()
    return {"success": True, "message": "Face dataset updated successfully"}


# --- LECTURER CRUD ---

@router.get("/lecturers")
def get_lecturers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    return db.query(models.Lecturer).all()


@router.post("/lecturers")
async def create_lecturer(
    payload: LecturerCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized.")

    # Check for duplicate Employee ID
    if db.query(models.Lecturer).filter(models.Lecturer.employee_id == payload.employee_id).first():
        raise HTTPException(status_code=400, detail="A lecturer with this Employee ID already exists.")

    # Check for duplicate Email (in Users table where they log in)
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="This Email Address is already registered in the system.")

    # Password Logic
    temp_pw = None
    if payload.auto_generate_password:
        temp_pw = generate_temp_password(payload.name)
    else:
        temp_pw = payload.password or "Welcome123"

    hashed_pw = hash_password(temp_pw)

    # Create Lecturer Record
    new_lecturer = models.Lecturer(
        name=payload.name,
        employee_id=payload.employee_id,
        email=payload.email,
        department=payload.department,
        assigned_subjects=payload.assigned_subjects,
        is_active=True
    )
    db.add(new_lecturer)
    db.flush()

    # Create User Record
    new_user = models.User(
        email=payload.email,
        hashed_password=hashed_pw,
        role="Lecturer",
        is_active=True
    )
    db.add(new_user)
    db.commit()

    if payload.auto_generate_password and temp_pw:
        background_tasks.add_task(send_lecturer_credentials_email, payload.email, payload.name, temp_pw)
        return {"success": True, "message": f"Lecturer {payload.name} registered and credentials emailed successfully."}

    return {"success": True, "message": f"Lecturer {payload.name} registered successfully."}


@router.put("/lecturers/{lecturer_id}")
def update_lecturer(
    lecturer_id: int,
    payload: LecturerUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized.")

    lecturer = db.query(models.Lecturer).filter(models.Lecturer.id == lecturer_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found.")

    # Update Lecturer fields
    lecturer.name = payload.name
    lecturer.department = payload.department
    lecturer.assigned_subjects = payload.assigned_subjects
    lecturer.is_active = payload.is_active

    # Sync with User Account
    user = db.query(models.User).filter(models.User.email == lecturer.email).first()
    if user:
        user.is_active = payload.is_active

    db.commit()
    return {"success": True, "message": "Lecturer profile updated successfully."}


@router.delete("/lecturers/{lecturer_id}")
def delete_lecturer(
    lecturer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized.")

    lecturer = db.query(models.Lecturer).filter(models.Lecturer.id == lecturer_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found.")

    # Find and delete matching User login
    user = db.query(models.User).filter(models.User.email == lecturer.email).first()
    
    db.delete(lecturer)
    if user:
        db.delete(user)
        
    db.commit()
    return {"success": True, "message": "Lecturer profile and user account deleted successfully."}

