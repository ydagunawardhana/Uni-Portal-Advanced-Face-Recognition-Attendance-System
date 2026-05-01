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
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import Query

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Header
from utils.email_utils import send_rejection_email
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import hash_password, get_current_user
from database import get_db, check_db_connection
from utils.audit_logger import log_audit_action
import models
from services.face_trainer import update_face_model, retrain_model

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Define a quick update schema
class TimetableUpdate(BaseModel):
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    lecturer: Optional[str] = None
    location: Optional[str] = None
    module_code: Optional[str] = None
    module_name: Optional[str] = None
    batch_id: Optional[str] = None

@router.put("/timetable/{session_id}")
def update_timetable_entry(
    session_id: int, 
    update_data: TimetableUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Allows Admin to edit a session with strict validation."""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can edit the timetable.")

    entry = db.query(models.Timetable).filter(models.Timetable.id == session_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    # Time parsing helper to handle HTML <input type="time"> (HH:MM) or DB format (I:M p)
    # Robust Time parsing helper to handle various input formats seamlessly
    def parse_t(t_str):
        # Clean the string and convert to uppercase for easier AM/PM matching
        t_str = t_str.strip().upper()
        
        # List of acceptable time formats
        formats = [
            "%I:%M %p",  # 02:00 PM
            "%I:%M%p",   # 02:00PM
            "%H:%M",     # 14:00
            "%H:%M:%S"   # 14:00:00
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(t_str, fmt).time()
            except ValueError:
                continue
                
        # If none of the formats match, raise the exception to trigger the 400 error
        raise ValueError(f"Time format not recognized: {t_str}")
    
    def to_12h(t_str):
        return parse_t(t_str).strftime("%I:%M %p")

    # 1. Validate Lecturer
    new_lecturer = update_data.lecturer or entry.lecturer
    lecturer_obj = None
    if new_lecturer:
        lecturer_obj = db.query(models.Lecturer).filter(models.Lecturer.name == new_lecturer).first()
        if not lecturer_obj:
            raise HTTPException(status_code=400, detail=f"Lecturer '{new_lecturer}' is not registered in the system.")

    # 2. Validate Module & Check Match
    new_module_code = update_data.module_code or entry.module_code
    new_module_name = update_data.module_name or entry.module_name
    
    if new_module_code:
        module_obj = db.query(models.Module).filter(models.Module.module_code == new_module_code).first()
        if not module_obj:
            raise HTTPException(status_code=400, detail=f"Module Code '{new_module_code}' does not exist.")
        
        # Validation A: Module Code must match Module Name (Robust against trailing spaces and case differences)
        if new_module_name and module_obj.module_name.strip().lower() != new_module_name.strip().lower():
            raise HTTPException(
                status_code=400, 
                detail=f"Module mismatch! The name for '{new_module_code}' is '{module_obj.module_name.strip()}', not '{new_module_name.strip()}'."
            )
            
        # Validation B: Lecturer must be assigned to this Module
        if lecturer_obj:
            assigned = lecturer_obj.assigned_subjects or ""
            # Assuming assigned_subjects is a comma-separated string of module codes
            assigned_list = [m.strip().lower() for m in assigned.split(",")]
            if new_module_code.lower() not in assigned_list:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Lecturer '{new_lecturer}' is not assigned to teach module '{new_module_code}'."
                )

    # 3. Validate Time Logic
    new_start = update_data.start_time or entry.start_time
    new_end = update_data.end_time or entry.end_time
    new_date = update_data.date or entry.date
    
    try:
        t_start = parse_t(new_start)
        t_end = parse_t(new_end)
        if t_start >= t_end:
            raise HTTPException(status_code=400, detail="Start time must be strictly before End time.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid time format.")

    # 4. Check for Timetable Clashes
    clashing_sessions = db.query(models.Timetable).filter(
        models.Timetable.lecturer == new_lecturer,
        models.Timetable.date == new_date,
        models.Timetable.id != session_id
    ).all()

    for cl in clashing_sessions:
        try:
            c_start = parse_t(cl.start_time)
            c_end = parse_t(cl.end_time)
            # Overlap logic
            if max(t_start, c_start) < min(t_end, c_end):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Time Clash! {new_lecturer} is already scheduled for '{cl.module_code}' from {cl.start_time} to {cl.end_time} on this date."
                )
        except HTTPException:
            raise
        except Exception:
            pass

    # 5. Apply Updates (Enforcing 12-hour format for consistency)
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if key in ['start_time', 'end_time'] and value:
            setattr(entry, key, to_12h(value))
        else:
            setattr(entry, key, value)

    try:
        db.commit()
        db.refresh(entry)
        return {"message": "Timetable entry updated successfully", "id": entry.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database update error: {str(e)}")

DATASET_DIR = Path(__file__).resolve().parent.parent / "dataset"
admin_face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def send_student_credentials_email(personal_email: str, official_email: str, name: str, password: str):
    SENDER_EMAIL = "ydmaxx43@gmail.com"
    SENDER_PASSWORD = "zucytjngeujifxgl"
    
    msg = EmailMessage()
    msg['Subject'] = "Welcome to University Portal - Student Account Credentials"
    msg['From'] = "Uni Portal Admin"
    msg['To'] = personal_email
    
    # Plain text fallback
    text_fallback = f"Dear {name},\n\nWelcome to the University Face Recognition Attendance Portal!\nYour student account has been successfully created. Here are your temporary login credentials:\n\nYour official login username is: {official_email}\nTemporary Password: {password}\nAccess Portal: http://localhost:3000/login\n\nPlease log in and change your password immediately.\n\nBest Regards,\nUniversity Portal Admin Team"
    msg.set_content(text_fallback)

    # 2. Simple & Clean HTML Version (Dark Theme)
    html_content = f"""
    <html>
      <body style="background-color: #121212; padding: 40px 10px; margin: 0; font-family: Arial, sans-serif;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #1e1e1e; padding: 30px 40px; border-radius: 8px; color: #e5e7eb;">
          
          <h2 style="color: #3b82f6; text-align: center; margin-top: 0; padding-bottom: 20px; border-bottom: 1px solid #333333;">Student Registration</h2>
          
          <p style="font-size: 16px; margin-top: 30px;">Hello <strong>{name}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">
            Welcome to the Face Recognition Attendance Portal! Your account has been successfully created. Here are your temporary login credentials:
          </p>
          
          <div style="background-color: #334155; border: 2px dashed #3b82f6; padding: 20px; text-align: center; border-radius: 8px; margin: 35px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #9ca3af;">Your official login username is:</p>
            <p style="margin: 0 0 20px 0; font-size: 20px; color: #ffffff; font-weight: bold;">{official_email}</p>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #9ca3af;">Temporary Password</p>
            <p style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold; letter-spacing: 2px; font-family: monospace;">{password}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/login" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">Login to Portal</a>
          </div>

          <p style="font-size: 14px; color: #fbbf24; line-height: 1.5; border-left: 3px solid #fbbf24; padding-left: 10px;">
            <strong>Security Step:</strong> Please log in using the temporary password above and update your password immediately.
          </p>
          
          <p style="font-size: 15px; margin-top: 40px; color: #d1d5db;">
            Best Regards,<br>
            The University Portal Team
          </p>
          
          <hr style="border: none; border-top: 1px solid #333333; margin: 40px 0 20px 0;">
          <p style="text-align: center; font-size: 12px; color: #6b7280; margin: 0;">
            &copy; 2026 University Portal. All rights reserved.
          </p>
          
        </div>
      </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            print(f"Student credentials successfully emailed to {personal_email}")
    except Exception as e:
        print(f"Failed to email student credentials to {personal_email}. Error: {e}")

def send_lecturer_credentials_email(personal_email: str, official_email: str, name: str, password: str):
    SENDER_EMAIL = "ydmaxx43@gmail.com"
    SENDER_PASSWORD = "zucytjngeujifxgl"
    
    msg = EmailMessage()
    msg['Subject'] = "Welcome to University Portal - Lecturer Account Credentials"
    msg['From'] = "Uni Portal Admin"
    msg['To'] = personal_email
    
    # Plain text fallback
    text_fallback = f"Dear {name},\n\nWelcome to the Academic Portal!\nYour Lecturer credentials have been generated.\n\nYour official login username is: {official_email}\nTemporary Password: {password}\nAccess Portal: http://localhost:3000/login\n\nPlease log in and change your password immediately.\n\nBest Regards,\nUniversity Portal Admin Team"
    msg.set_content(text_fallback)

    # 2. Simple & Clean HTML Version (Dark Theme)
    html_content = f"""
    <html>
      <body style="background-color: #121212; padding: 40px 10px; margin: 0; font-family: Arial, sans-serif;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #1e1e1e; padding: 30px 40px; border-radius: 8px; color: #e5e7eb;">
          
          <h2 style="color: #3b82f6; text-align: center; margin-top: 0; padding-bottom: 20px; border-bottom: 1px solid #333333;">Lecturer Registration</h2>
          
          <p style="font-size: 16px; margin-top: 30px;">Hello <strong>{name}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">
            Welcome to the Academic Portal of the University. Your Lecturer credentials have been successfully updated in our system. Here are your temporary login credentials:
          </p>
          
          <div style="background-color: #334155; border: 2px dashed #3b82f6; padding: 20px; text-align: center; border-radius: 8px; margin: 35px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #9ca3af;">Your official login username is:</p>
            <p style="margin: 0 0 20px 0; font-size: 20px; color: #ffffff; font-weight: bold;">{official_email}</p>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #9ca3af;">Temporary Password</p>
            <p style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold; letter-spacing: 2px; font-family: monospace;">{password}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/login" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">Access Academic Portal</a>
          </div>

          <p style="font-size: 14px; color: #fbbf24; line-height: 1.5; border-left: 3px solid #fbbf24; padding-left: 10px;">
            <strong>Security Reminder:</strong> Please log in and change this temporary password immediately for security purposes.
          </p>
          
          <p style="font-size: 15px; margin-top: 40px; color: #d1d5db;">
            Best Regards,<br>
            The University Portal Team
          </p>
          
          <hr style="border: none; border-top: 1px solid #333333; margin: 40px 0 20px 0;">
          <p style="text-align: center; font-size: 12px; color: #6b7280; margin: 0;">
            &copy; 2026 University Portal. All rights reserved.
          </p>
          
        </div>
      </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')
    
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            print(f"Lecturer credentials successfully emailed to {personal_email}")
    except Exception as e:
        print(f"Failed to email lecturer credentials to {personal_email}. Error: {e}")

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
    personal_email: Optional[str] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    degree_program: Optional[str] = None
    academic_year: Optional[str] = None
    intake: Optional[str] = None
    nic_number: Optional[str] = None
    gender: Optional[str] = None
    is_active: bool = True


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
    personal_email:     str
    mobile:             str
    faculty:            Optional[str] = None
    department:         str
    degree_program:     Optional[str] = None
    nic_number:         str
    gender:             str
    academic_year:      str
    intake:             str
    face_frames:        list[str]     # 50 base64 strings
    auto_gen_password:  bool          = False
    password:           Optional[str] = None   
    pre_registration_id: Optional[int] = None


class RegisterStudentResponse(BaseModel):
    success:            bool
    message:            str
    student_id:         int
    generated_password: Optional[str] = None   

class LecturerCreateRequest(BaseModel):
    name: str
    employee_id: str
    email: str
    personal_email: str
    faculty: Optional[str] = None
    department: str
    assigned_subjects: Optional[str] = None
    auto_generate_password: bool = True
    password: Optional[str] = None

class LecturerUpdateRequest(BaseModel):
    name: str
    email: Optional[str] = None
    personal_email: Optional[str] = None
    faculty: Optional[str] = None
    department: str
    assigned_subjects: Optional[str] = None
    is_active: bool
    
class VisitingLecturerRequest(BaseModel):
    name: str
    faculty: Optional[str] = None
    department: str


@router.post("/lecturers/visiting")
async def create_visiting_lecturer(
    payload: VisitingLecturerRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized.")

    # 1. Generate unique VIS-ID
    # Find all visiting lecturers to count
    visitor_count = db.query(models.Lecturer).filter(models.Lecturer.employee_id.like("VIS%")).count()
    new_vis_id = f"VIS-{visitor_count + 1:03d}"
    
    # Ensure uniqueness just in case
    while db.query(models.Lecturer).filter(models.Lecturer.employee_id == new_vis_id).first():
        visitor_count += 1
        new_vis_id = f"VIS-{visitor_count + 1:03d}"

    # 2. Generate dummy email and password
    dummy_email = f"visiting_{int(time.time())}@temp.edu"
    temp_pw = secrets.token_urlsafe(16)
    hashed_pw = hash_password(temp_pw)

    # 3. Create Lecturer Record
    new_lecturer = models.Lecturer(
        name=payload.name,
        employee_id=new_vis_id,
        email=dummy_email,
        faculty=payload.faculty,
        department=payload.department,
        is_active=True,
        is_visiting=True
    )
    db.add(new_lecturer)
    
    # 4. Create User Record (Required for some relationships, though login is disabled)
    # We set is_active=False here to prevent ANY login attempts for visiting lecturers
    new_user = models.User(
        email=dummy_email,
        hashed_password=hashed_pw,
        role="Lecturer",
        is_active=False 
    )
    db.add(new_user)
    
    db.commit()
    db.refresh(new_lecturer)

    # Audit log
    log_audit_action(
        db=db,
        action_type="Lecturer Management",
        description=f"Created Visiting Lecturer '{payload.name}' ({new_vis_id}).",
        target_id=new_vis_id,
    )

    return {
        "success": True, 
        "message": f"Visiting Lecturer '{payload.name}' added with ID {new_vis_id}.",
        "lecturer": {
            "id": new_lecturer.id,
            "name": new_lecturer.name,
            "employee_id": new_vis_id,
            "is_visiting": True
        }
    }



@router.get("/pre-registrations", response_model=List[dict])
def get_pre_registrations(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Fetch all pending pre-registration records for admin review."""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Filter for 'Pending' only so rejected ones leave the queue
    pre_regs = (
        db.query(models.PreRegistration)
        .filter(models.PreRegistration.status == "Pending")
        .order_by(models.PreRegistration.created_at.desc())
        .all()
    )
    
    # Convert to dict for easier serialization if needed, though SQLAlchemy models work too
    return [
        {
            "id": pr.id,
            "name": pr.name,
            "personal_email": pr.personal_email,
            "mobile": pr.mobile,
            "nic_number": pr.nic_number,
            "gender": pr.gender,
            "faculty": pr.faculty,
            "department": pr.department,
            "degree_program": pr.degree_program,
            "intake": pr.intake,
            "created_at": pr.created_at
        } for pr in pre_regs
    ]


@router.delete("/pre-registrations/{pre_reg_id}")
def reject_pre_registration(
    pre_reg_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    x_rejection_reason: Optional[str] = Header(None),
):
    """Update status to 'Rejected' and notify the student via email."""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    record = db.query(models.PreRegistration).filter(models.PreRegistration.id == pre_reg_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Pre-registration record not found")

    # Capture details for the email
    student_email = record.personal_email
    student_name = record.name
    reason = x_rejection_reason or "Your application did not meet the required criteria."

    # Send rejection email synchronously within a try-except block to report errors
    try:
        send_rejection_email(
            student_email=student_email, 
            student_name=student_name, 
            reason=reason
        )
    except Exception as e:
        # If email fails, we stop the rejection and inform the admin
        print(f"Email failure: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Rejection aborted: Failed to send notification email. Please check SMTP settings. Error: {str(e)}"
        )

    # If email sent successfully, update DB status
    record.status = "Rejected"
    db.commit()

    return {"message": "Registration rejected and email sent successfully"}


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

    valid_count = 0
    for i, b64_frame in enumerate(payload.face_frames):
        try:
            # Handle potential Data URI prefix
            clean_b64 = b64_frame.split(",")[-1]
            img_bytes = base64.b64decode(clean_b64)
            
            # --- OpenCV Face ROI Extraction ---
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = admin_face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)
            
            if len(faces) == 1:
                filename = str(folder / f"img_{valid_count:03d}.jpg")
                cv2.imwrite(filename, frame)
                valid_count += 1
            elif len(faces) > 1:
                print(f"[Warning] Photobomb detected in frame {i}. Ignored.")
                
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
        personal_email    = payload.personal_email,
        mobile            = payload.mobile,
        faculty           = payload.faculty,
        department        = payload.department,
        degree_program    = payload.degree_program,
        nic_number        = payload.nic_number,
        gender            = payload.gender,
        academic_year     = payload.academic_year,
        intake            = payload.intake,
        face_dataset_path = dataset_path,
        is_active         = True,
    )
    db.add(student)
    db.flush()   # get the auto-generated student.id before committing

    #  Create User login account 
    user = models.User(
        email           = payload.email,
        personal_email  = payload.personal_email,
        hashed_password = hashed,
        role            = "Student",
        is_active       = True,
    )
    db.add(user)

    # 4. Clear from Pre-Registration if applicable
    if payload.pre_registration_id:
        db.query(models.PreRegistration).filter(models.PreRegistration.id == payload.pre_registration_id).delete()

    db.commit()
    db.refresh(student)

    if payload.auto_gen_password and generated_password:
        background_tasks.add_task(send_student_credentials_email, payload.personal_email, payload.email, payload.name, generated_password)

    # Auto-train face model in the background
    background_tasks.add_task(update_face_model, student.index_number, student.face_dataset_path)

    # Audit log
    log_audit_action(
        db=db,
        action_type="Student Management",
        description=f"Registered new student '{payload.name}'.",
        target_id=payload.index_number,
    )

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
    if payload.personal_email is not None:
        student.personal_email = payload.personal_email
    student.faculty = payload.faculty
    student.department = payload.department
    student.degree_program = payload.degree_program
    student.academic_year = payload.academic_year
    student.intake = payload.intake
    student.nic_number = payload.nic_number
    student.gender = payload.gender
    student.is_active = payload.is_active

    # Sync with users table
    user_record = db.query(models.User).filter(models.User.email == student.email).first()
    if user_record:
        if payload.personal_email is not None:
            user_record.personal_email = payload.personal_email
        user_record.is_active = payload.is_active

    db.commit()
    db.refresh(student)

    # Audit log
    log_audit_action(
        db=db,
        action_type="Student Management",
        description=f"Updated student profile for '{payload.name}'.",
        severity="Warning",
        target_id=student.index_number,
    )

    return student


@router.delete("/students/{student_id}")
def delete_student(
    student_id: int,
    background_tasks: BackgroundTasks,
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

    # Audit log
    log_audit_action(
        db=db,
        action_type="Student Management",
        description=f"Deleted student record '{student.name}'.",
        severity="Critical",
        target_id=student.index_number,
    )

    # Sync AI Model cleanly handling the deleted logic 
    background_tasks.add_task(retrain_model)

    return {"success": True, "message": "Student, user account, attendance logs, and face dataset deleted successfully."}


@router.post("/students/{student_id}/recapture")
def recapture_face(
    student_id: int,
    payload: RecaptureRequest,
    background_tasks: BackgroundTasks,
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
    
    # Save new frames applying strict verification
    valid_count = 0
    for i, b64_frame in enumerate(payload.images):
        try:
            clean_b64 = b64_frame.split(",")[-1]
            img_bytes = base64.b64decode(clean_b64)
            
            # --- OpenCV Face ROI Extraction ---
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = admin_face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)
            
            if len(faces) == 1:
                filename = str(folder / f"img_{valid_count:03d}.jpg")
                cv2.imwrite(filename, frame)
                valid_count += 1
            elif len(faces) > 1:
                print(f"[Warning] Photobomb detected in recapture frame {i}. Ignored.")
                
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

    # Audit log
    log_audit_action(
        db=db,
        action_type="System Operations",
        description=f"Recaptured face dataset for student '{student.name}'.",
        target_id=student.index_number,
    )

    # Sync AI Model completely pulling entirely fresh frame subsets
    background_tasks.add_task(retrain_model)

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
        personal_email=payload.personal_email,
        faculty=payload.faculty,
        department=payload.department,
        assigned_subjects=payload.assigned_subjects,
        is_active=True
    )
    db.add(new_lecturer)
    db.flush()

    # Create User Record
    new_user = models.User(
        email=payload.email,
        personal_email=payload.personal_email,
        hashed_password=hashed_pw,
        role="Lecturer",
        is_active=True
    )
    db.add(new_user)
    db.commit()

    # Audit log – must be BEFORE any early return
    log_audit_action(
        db=db,
        action_type="Lecturer Management",
        description=f"Registered new lecturer '{payload.name}'.",
        target_id=payload.employee_id,
    )

    if payload.auto_generate_password and temp_pw:
        background_tasks.add_task(send_lecturer_credentials_email, payload.personal_email, payload.email, payload.name, temp_pw)
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
    if payload.personal_email is not None:
        lecturer.personal_email = payload.personal_email
    lecturer.faculty = payload.faculty
    lecturer.department = payload.department
    lecturer.assigned_subjects = payload.assigned_subjects
    lecturer.is_active = payload.is_active

    # Sync with User Account
    user = db.query(models.User).filter(models.User.email == lecturer.email).first()
    if user:
        user.is_active = payload.is_active
        if payload.personal_email is not None:
            user.personal_email = payload.personal_email

    db.commit()

    # Audit log
    log_audit_action(
        db=db,
        action_type="Lecturer Management",
        description=f"Updated lecturer profile for '{payload.name}'.",
        severity="Warning",
        target_id=lecturer.employee_id,
    )

    return {"success": True, "message": "Lecturer profile updated successfully."}


@router.get("/timetable/today")
def get_today_timetable_admin(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch all timetable sessions scheduled for the current day with status and stats."""
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized")

    now = datetime.now()
    if date:
        try:
            today_str = datetime.strptime(date, "%Y-%m-%d").strftime("%Y-%m-%d")
        except ValueError:
            today_str = now.strftime("%Y-%m-%d")
    else:
        today_str = now.strftime("%Y-%m-%d")

    current_time = now.time()

    def parse_time_str(t_str):
        try:
            return datetime.strptime(t_str, "%I:%M %p").time()
        except:
            return None

    # Logic to fetch today's sessions and include is_visiting flag
    # Plus Degree and Level from Module table
    results = (
        db.query(
            models.Timetable, 
            models.Lecturer.is_visiting,
            models.Module.degree,
            models.Module.level,
            models.Lecturer.id.label("lecturer_id")
        )
        .outerjoin(models.Lecturer, models.Timetable.lecturer == models.Lecturer.name)
        .outerjoin(models.Module, models.Timetable.module_code == models.Module.module_code)
        .filter(models.Timetable.date == today_str)
        .all()
    )

    # Calculate exact student counts dynamically based on session batch and department
    enrollment_counts = {}
    for entry, _, _, _, _ in results:
        batch = entry.batch_id
        dept = entry.department
        key = f"{batch}_{dept}"
        if key not in enrollment_counts:
            student_count = db.query(models.Student).filter(
                models.Student.intake == batch,
                models.Student.department == dept
            ).count()
            enrollment_counts[key] = student_count

    sessions_data = []
    live_count = 0
    visiting_count = 0

    for entry, is_visiting, degree, level, lecturer_id in results:
        visiting = is_visiting if is_visiting is not None else False
        if visiting:
            visiting_count += 1

        start_t = parse_time_str(entry.start_time)
        end_t = parse_time_str(entry.end_time)
        
        # Ensure we parse the session date for comparison
        from datetime import datetime as dt_class
        try:
            session_date = dt_class.strptime(entry.date, "%Y-%m-%d").date()
        except:
            session_date = now.date()
        today_date = now.date()

        db_status = getattr(entry, 'status', None)
        is_manually_completed = bool(db_status and db_status.lower() in ["completed", "closed"])
        
        # Check if the session is entirely in the past (yesterday, or earlier today)
        is_past_session = (session_date < today_date) or (session_date == today_date and start_t and end_t and current_time > end_t)
        
        is_db_live = bool(entry.is_live)
        is_time_live = bool(session_date == today_date and start_t and end_t and start_t <= current_time <= end_t)

        if is_manually_completed:
            status = "Completed"
            resolved_live = False
        elif is_past_session:
            status = "Missed" # NEW STATUS!
            resolved_live = False
        elif is_db_live or is_time_live:
            status = "Live"
            resolved_live = True
            live_count += 1
        else:
            status = "Pending"
            resolved_live = False

        sessions_data.append({
            "id": entry.id,
            "module_code": entry.module_code,
            "module_name": entry.module_name,
            "start_time": entry.start_time,
            "end_time": entry.end_time,
            "location": entry.location,
            "batch": entry.batch_id,
            "lecturer_name": entry.lecturer,
            "lecturer_id": lecturer_id,
            "is_visiting": visiting,
            "faculty": entry.faculty,
            "department": entry.department,
            "semester": level or entry.semester,
            "degree": degree,
            "level": level,
            "is_live": resolved_live,
            "status": status,
            "is_completed": status == "Completed",
            "date": entry.date,
            "enrolled_count": enrollment_counts.get(f"{entry.batch_id}_{entry.department}", 0),
            "cover_requested": getattr(entry, 'cover_requested', False),
            "cover_reason": getattr(entry, 'cover_reason', None)
        })

    return {
        "stats": {
            "total_sessions": len(sessions_data),
            "live_now": live_count,
            "visiting_lecturers": visiting_count
        },
        "sessions": sessions_data
    }


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

    # Audit log
    log_audit_action(
        db=db,
        action_type="Lecturer Management",
        description=f"Deleted lecturer '{lecturer.name}' and user account.",
        severity="Critical",
        target_id=lecturer.employee_id,
    )

    return {"success": True, "message": "Lecturer profile and user account deleted successfully."}


# Audit Logs

@router.get("/audit-logs")
def get_audit_logs(
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    role: Optional[str] = None,
    action_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized.")

    query = db.query(models.AuditLog)

    # Text search across description
    if search:
        query = query.filter(models.AuditLog.description.ilike(f"%{search}%"))

    # Exact match on action_type column (avoids cross-category matches)
    if action_type and action_type != "All":
        query = query.filter(models.AuditLog.action_type == action_type)

    # Date range filter
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.AuditLog.timestamp >= start_dt)
        except ValueError:
            pass

    if end_date:
        try:
            from datetime import timedelta
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(models.AuditLog.timestamp < end_dt)
        except ValueError:
            pass

    logs = query.order_by(models.AuditLog.timestamp.desc()).limit(200).all()

    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "action_type": log.action_type,
            "description": log.description,
        }
        for log in logs
    ]

@router.get("/cover_requests/upcoming")
def get_upcoming_cover_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized")

    from datetime import date as datetime_date
    today = datetime_date.today()
    
    # Replicate the exact JOINs used in the main timetable endpoint
    results = (
        db.query(
            models.Timetable, 
            models.Lecturer.is_visiting,
            models.Module.degree,
            models.Module.level,
            models.Lecturer.id.label("lecturer_id")
        )
        .outerjoin(models.Lecturer, models.Timetable.lecturer == models.Lecturer.name)
        .outerjoin(models.Module, models.Timetable.module_code == models.Module.module_code)
        .filter(
            models.Timetable.cover_requested == True,
            models.Timetable.date >= today.strftime("%Y-%m-%d")
        )
        .order_by(models.Timetable.date.asc(), models.Timetable.start_time.asc())
        .all()
    )
    
    # Format and return the list of sessions, EXCLUDING completed ones
    response_data = []
    for entry, is_visiting, degree, level, lecturer_id in results:
        db_status = getattr(entry, 'status', '')
        
        # Skip this session if it is already completed or closed
        if db_status and db_status.lower() in ["completed", "closed"]:
            continue
            
        response_data.append({
            "id": entry.id,
            "module_code": entry.module_code,
            "module_name": entry.module_name,
            "start_time": entry.start_time,
            "end_time": entry.end_time,
            "location": entry.location,
            "batch": entry.batch_id,
            "lecturer_name": entry.lecturer,
            "lecturer_id": lecturer_id,
            "is_visiting": is_visiting if is_visiting is not None else False,
            "faculty": entry.faculty,
            "department": entry.department,
            "semester": level or entry.semester,
            "degree": degree,
            "level": level,
            "date": entry.date,
            "cover_requested": entry.cover_requested,
            "cover_reason": entry.cover_reason,
            "status": "Pending"
        })

    return response_data
