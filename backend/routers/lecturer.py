import os
import uuid
import shutil
from datetime import datetime, timedelta
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
import schemas
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
    assigned_subjects_detailed: Optional[List[dict]] = None
    profile_picture: Optional[str] = None
    office_hours: Optional[Any] = None
    is_visiting: bool = False

    class Config:
        from_attributes = True

class LecturerListOut(BaseModel):
    id: int
    name: str
    department: str
    email: str
    profile_picture: Optional[str] = None
    office_hours: Optional[Any] = None
    is_visiting: bool = False

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
        
    # Fetch detailed subject names
    subject_details = []
    if lecturer.assigned_subjects:
        codes = [code.strip() for code in lecturer.assigned_subjects.split(",") if code.strip()]
        modules = db.query(models.Module).filter(models.Module.module_code.in_(codes)).all()
        module_map = {m.module_code: m.module_name for m in modules}
        
        for code in codes:
            subject_details.append({
                "code": code,
                "name": module_map.get(code, "Unknown Module")
            })

    return LecturerProfileResponse(
        id=lecturer.id,
        name=lecturer.name,
        employee_id=lecturer.employee_id,
        email=lecturer.email,
        personal_email=lecturer.personal_email,
        faculty=lecturer.faculty,
        department=lecturer.department,
        assigned_subjects=lecturer.assigned_subjects,
        assigned_subjects_detailed=subject_details,
        profile_picture=lecturer.profile_picture,
        office_hours=lecturer.office_hours,
        is_visiting=lecturer.is_visiting
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


# ─────────────────────────────────────────────────────────────────────
# Dashboard Summary — single unified endpoint for the Lecturer Dashboard
# ─────────────────────────────────────────────────────────────────────

@router.get("/dashboard_summary/{lecturer_id}")
def get_dashboard_summary(lecturer_id: int, db: Session = Depends(get_db)):
    """
    Returns a comprehensive JSON object containing all data needed
    to render the Lecturer Dashboard in a single network call.
    """
    from sqlalchemy import func, distinct

    # ── 1. Lecturer identity ──
    lecturer = db.query(models.Lecturer).filter(models.Lecturer.id == lecturer_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    # ── 2. Aggregate stats ──

    # 2a. Total class sessions conducted by this lecturer
    total_classes = db.query(func.count(models.ClassSession.id)).filter(
        models.ClassSession.lecturer_id == lecturer_id
    ).scalar() or 0

    # 2b. Total unique students enrolled in this lecturer's subjects
    #     Parse assigned_subjects (comma-separated string → list)
    assigned_subjects_raw = lecturer.assigned_subjects or ""
    subject_list = [s.strip() for s in assigned_subjects_raw.split(",") if s.strip()]

    total_students = 0
    if subject_list:
        total_students = db.query(func.count(distinct(models.Enrollment.student_id))).filter(
            models.Enrollment.class_id.in_(subject_list)
        ).scalar() or 0

    # 2c. Average attendance percentage across all sessions
    #     Formula per session: (unique entered students / total enrolled students) * 100
    avg_attendance = 0.0
    if total_classes > 0 and total_students > 0:
        sessions = db.query(models.ClassSession).filter(
            models.ClassSession.lecturer_id == lecturer_id
        ).all()

        percentages = []
        for s in sessions:
            entered = db.query(func.count(distinct(models.AttendanceLog.student_id))).filter(
                models.AttendanceLog.session_id == s.id,
                models.AttendanceLog.status == "entered"
            ).scalar() or 0
            pct = (entered / total_students) * 100 if total_students > 0 else 0
            percentages.append(min(pct, 100.0))

        avg_attendance = round(sum(percentages) / len(percentages), 1) if percentages else 0.0

    # ── 3. Recent classes (last 5 closed sessions) ──
    recent_sessions = db.query(models.ClassSession).filter(
        models.ClassSession.lecturer_id == lecturer_id
    ).order_by(models.ClassSession.start_time.desc()).limit(5).all()

    recent_classes = []
    for s in recent_sessions:
        entered = db.query(func.count(distinct(models.AttendanceLog.student_id))).filter(
            models.AttendanceLog.session_id == s.id,
            models.AttendanceLog.status == "entered"
        ).scalar() or 0
        session_pct = round((entered / total_students) * 100, 1) if total_students > 0 else 0

        recent_classes.append({
            "id": s.id,
            "subject_id": s.subject_id,
            "batch_id": s.batch_id,
            "session_type": s.session_type,
            "location": s.location,
            "date": s.start_time.strftime("%Y-%m-%d") if s.start_time else None,
            "start_time": s.start_time.strftime("%I:%M %p") if s.start_time else None,
            "end_time": s.end_time.strftime("%I:%M %p") if s.end_time else None,
            "status": s.status,
            "students_present": entered,
            "attendance_percentage": session_pct,
            "cover_requested": getattr(s, 'cover_requested', False),
            "cover_reason": getattr(s, 'cover_reason', None)
        })

    # ── 4. Upcoming appointments (next 5, Pending or Approved) ──
    upcoming_appointments_raw = db.query(models.Appointment).filter(
        models.Appointment.lecturer_id == lecturer_id,
        models.Appointment.status.in_(["Pending", "Approved"])
    ).order_by(models.Appointment.created_at.desc()).limit(5).all()

    upcoming_appointments = []
    for a in upcoming_appointments_raw:
        student = db.query(models.Student).filter(models.Student.id == a.student_id).first()
        upcoming_appointments.append({
            "id": a.id,
            "student_name": student.name if student else "Unknown",
            "student_index": student.index_number if student else "N/A",
            "date": a.appointment_date,
            "time_slot": a.time_slot,
            "reason": a.reason or "No reason provided",
            "status": a.status,
        })

    # ── 5. Pending Actions ──
    pending_appts = db.query(models.Appointment).filter(
        models.Appointment.lecturer_id == lecturer_id,
        models.Appointment.status == "Pending"
    ).order_by(models.Appointment.created_at.desc()).limit(10).all()

    pending_items = []
    for a in pending_appts:
        stu = db.query(models.Student).filter(models.Student.id == a.student_id).first()
        pending_items.append({
            "id": a.id,
            "title": f"Consultation with {stu.name if stu else 'Unknown'} ({stu.index_number if stu else 'N/A'})",
            "type": "Appointment",
            "date": a.appointment_date,
            "time_slot": a.time_slot,
        })

    pending_actions = {
        "count": len(pending_items),
        "items": pending_items,
    }

    # ── 6. At-Risk Students (attendance < 80% across this lecturer's sessions) ──
    at_risk_students = []
    all_sessions = db.query(models.ClassSession).filter(
        models.ClassSession.lecturer_id == lecturer_id
    ).all()
    total_session_count = len(all_sessions)

    if total_session_count > 0 and subject_list:
        # Get all enrolled student IDs for this lecturer's subjects
        enrolled_rows = db.query(models.Enrollment.student_id).filter(
            models.Enrollment.class_id.in_(subject_list)
        ).distinct().all()
        enrolled_ids = [r[0] for r in enrolled_rows]

        session_ids = [s.id for s in all_sessions]

        for sid in enrolled_ids:
            sessions_attended = db.query(
                func.count(distinct(models.AttendanceLog.session_id))
            ).filter(
                models.AttendanceLog.student_id == sid,
                models.AttendanceLog.session_id.in_(session_ids),
                models.AttendanceLog.status == "entered"
            ).scalar() or 0

            pct = round((sessions_attended / total_session_count) * 100, 1)
            if pct < 80:
                stu = db.query(models.Student).filter(models.Student.id == sid).first()
                if stu:
                    at_risk_students.append({
                        "id": stu.id,
                        "name": stu.name,
                        "index_number": stu.index_number,
                        "attendance_percentage": pct,
                        "sessions_attended": sessions_attended,
                        "total_sessions": total_session_count,
                    })

        # Sort by lowest attendance first, cap at 5
        at_risk_students.sort(key=lambda x: x["attendance_percentage"])
        at_risk_students = at_risk_students[:5]

    # ── 7. Today's Schedule ──
    from datetime import date as date_type
    today = date_type.today()
    today_start = datetime(today.year, today.month, today.day, 0, 0, 0)
    today_end = datetime(today.year, today.month, today.day, 23, 59, 59)

    todays_sessions = db.query(models.ClassSession).filter(
        models.ClassSession.lecturer_id == lecturer_id,
        models.ClassSession.start_time >= today_start,
        models.ClassSession.start_time <= today_end,
    ).order_by(models.ClassSession.start_time.asc()).all()

    todays_schedule = []
    for s in todays_sessions:
        todays_schedule.append({
            "id": s.id,
            "time": s.start_time.strftime("%I:%M %p") if s.start_time else "TBD",
            "end_time": s.end_time.strftime("%I:%M %p") if s.end_time else None,
            "subject": s.subject_id,
            "session_type": s.session_type,
            "location": s.location,
            "status": s.status,
            "cover_requested": getattr(s, 'cover_requested', False),
            "cover_reason": getattr(s, 'cover_reason', None)
        })

    # ── 8. Assemble response ──
    return {
        "lecturer_name": lecturer.name,
        "department": lecturer.department,
        "employee_id": lecturer.employee_id,
        "stats": {
            "total_classes": total_classes,
            "average_attendance": avg_attendance,
            "total_students": total_students,
        },
        "recent_classes": recent_classes,
        "upcoming_appointments": upcoming_appointments,
        "pending_actions": pending_actions,
        "at_risk_students": at_risk_students,
        "todays_schedule": todays_schedule,
    }

@router.get("/subjects")
def get_lecturer_subjects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch detailed information for all subjects assigned to the logged-in lecturer."""
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    lecturer = db.query(models.Lecturer).filter(models.Lecturer.email == current_user.email).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer profile not found.")
        
    # 1. Parse assigned subjects
    assigned_subjects_raw = lecturer.assigned_subjects or ""
    subject_codes = [s.strip() for s in assigned_subjects_raw.split(",") if s.strip()]
    
    if not subject_codes:
        return []

    # 2. Fetch module details
    modules = db.query(models.Module).filter(models.Module.module_code.in_(subject_codes)).all()
    module_details = {m.module_code: m for m in modules}

    # 3. Fetch enrollment counts
    from sqlalchemy import func
    enrollment_counts = db.query(
        models.Enrollment.class_id, 
        func.count(models.Enrollment.student_id)
    ).filter(
        models.Enrollment.class_id.in_(subject_codes)
    ).group_by(models.Enrollment.class_id).all()
    
    enrollment_map = {class_id: count for class_id, count in enrollment_counts}

    # 4. Fetch schedules from Timetable
    schedules = db.query(models.Timetable).filter(
        models.Timetable.module_code.in_(subject_codes)
    ).all()
    
    schedule_map = {}
    for entry in schedules:
        if entry.module_code not in schedule_map:
            schedule_map[entry.module_code] = f"{entry.date} - {entry.start_time}"

    # 5. Build final response
    detailed_subjects = []
    for code in subject_codes:
        mod = module_details.get(code)
        detailed_subjects.append({
            "id": code, 
            "module_code": code,
            "module_name": mod.module_name if mod else "Unknown Module",
            "degree": mod.degree if mod else None,
            "schedule": schedule_map.get(code, "Schedule Pending"),
            "students_enrolled": enrollment_map.get(code, 0),
            "batch": mod.level if mod else None, # Falling back to level if batch is not in module
            "semester": "Semester 1" # Default or fetch from somewhere
        })

    return detailed_subjects


@router.get("/attendance/{subject_id}")
def get_subject_attendance(
    subject_id: str,
    date: Optional[str] = None, # "YYYY-MM-DD"
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Calculates overall attendance percentage for each student in the subject
    and returns their status for a specific date.
    """
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 1. Subject Details: Total sessions held (sessions that are 'Closed')
    total_sessions_held = db.query(models.ClassSession).filter(
        models.ClassSession.subject_id == subject_id,
        models.ClassSession.status == "Closed"
    ).count()

    # 2. Get all enrolled student IDs for this subject
    enrolled_rows = db.query(models.Enrollment.student_id).filter(
        models.Enrollment.class_id == subject_id
    ).distinct().all()
    enrolled_student_ids = [r[0] for r in enrolled_rows]

    total_enrolled = len(enrolled_student_ids)

    # 3. Handle Date Filtering (default to today)
    target_date_str = date or datetime.now().strftime("%Y-%m-%d")
    try:
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get closed session IDs for this subject to calculate percentage efficiently
    closed_sessions = db.query(models.ClassSession.id).filter(
        models.ClassSession.subject_id == subject_id,
        models.ClassSession.status == "Closed"
    ).all()
    closed_session_ids = [s[0] for s in closed_sessions]

    # Fetch students and their calculated analytics
    students_data = []
    for sid in enrolled_student_ids:
        student = db.query(models.Student).filter(models.Student.id == sid).first()
        if not student: continue

        # A. Attendance Status for the specific date
        # Check if there was any session on this date and if the student 'entered'
        day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        session_today = db.query(models.ClassSession).filter(
            models.ClassSession.subject_id == subject_id,
            models.ClassSession.start_time >= day_start,
            models.ClassSession.start_time < day_end
        ).first()

        status = "Absent"
        if session_today:
            log_today = db.query(models.AttendanceLog).filter(
                models.AttendanceLog.student_id == student.id,
                models.AttendanceLog.session_id == session_today.id,
                models.AttendanceLog.status == "entered"
            ).first()
            if log_today:
                status = "Present"

        # B. Longitudinal Attendance Percentage
        attended_count = 0
        if total_sessions_held > 0 and closed_session_ids:
            attended_count = db.query(models.AttendanceLog).filter(
                models.AttendanceLog.student_id == student.id,
                models.AttendanceLog.session_id.in_(closed_session_ids),
                models.AttendanceLog.status == "entered"
            ).distinct(models.AttendanceLog.session_id).count()

        # Calculation logic: return 100.0 if no classes held yet, otherwise float pct
        percentage = round((attended_count / total_sessions_held) * 100, 1) if total_sessions_held > 0 else 100.0

        students_data.append({
            "student_id": student.index_number,
            "name": student.name,
            "status": status,
            "attendance_percentage": percentage
        })

    return {
        "subject_details": {
            "total_students": total_enrolled,
            "total_sessions_held": total_sessions_held
        },
        "students": students_data
    }
@router.get("/timetable")
def get_lecturer_timetable(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch all timetable entries assigned to the logged-in lecturer."""
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")

    lecturer = (
        db.query(models.Lecturer)
        .filter(models.Lecturer.email == current_user.email)
        .first()
    )
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer profile not found.")

    # Match based on lecturer name (Timetable.lecturer is a string field)
    # Filter: Window includes past 7 days (current week) to 14 days future (cover requests)
    from datetime import date as date_type, timedelta
    today_dt = date_type.today()
    start_date = today_dt - timedelta(days=7)
    end_date = today_dt + timedelta(days=14)

    # Join with Module to get degree and level/semester
    results = (
        db.query(models.Timetable, models.Module.degree, models.Module.level)
        .outerjoin(models.Module, models.Timetable.module_code == models.Module.module_code)
        .filter(
            models.Timetable.lecturer == lecturer.name,
            models.Timetable.date >= start_date.strftime("%Y-%m-%d"),
            models.Timetable.date <= end_date.strftime("%Y-%m-%d")
        )
        .order_by(models.Timetable.date.asc(), models.Timetable.start_time.asc())
        .all()
    )

    from datetime import datetime as dt_class
    now_time = dt_class.now().time()

    def _parse(t_str):
        try:
            return dt_class.strptime(t_str, "%I:%M %p").time()
        except Exception:
            return None

    def _resolve(tt):
        """Hybrid status resolution: manual action > date/time > live flag."""
        db_st = getattr(tt, 'status', None)
        # Check for both 'completed' and 'closed' since the DB may use either string
        is_manually_completed = bool(db_st and db_st.lower() in ["completed", "closed"])
        s = _parse(tt.start_time)
        e = _parse(tt.end_time)
        
        tt_date = dt_class.strptime(tt.date, "%Y-%m-%d").date()
        today_date = dt_class.today().date()

        is_past_session = (tt_date < today_date) or (tt_date == today_date and s and e and now_time > e)
        is_time_live = (tt_date == today_date and s and e and s <= now_time <= e)
        is_db_live = bool(tt.is_live)

        if is_manually_completed:
            return "Completed", False, True
        elif is_past_session:
            return "Missed", False, False # Status = Missed, is_live = False, is_completed = False
        elif is_db_live or is_time_live:
            return "Live", True, False
        else:
            return "Pending", False, False

    return [
        {
            "id": r.Timetable.id,
            "date": r.Timetable.date,
            "start_time": r.Timetable.start_time,
            "end_time": r.Timetable.end_time,
            "module_code": r.Timetable.module_code,
            "module_name": r.Timetable.module_name,
            "location": r.Timetable.location or "TBA",
            "batch": r.Timetable.batch_id,
            "semester": r.level or r.Timetable.semester or "N/A",
            "degree": r.degree or "N/A",
            "level": r.level,
            "is_live": _resolve(r.Timetable)[1],
            "status": _resolve(r.Timetable)[0],
            "is_completed": _resolve(r.Timetable)[2],
            "cover_requested": getattr(r.Timetable, 'cover_requested', False),
            "cover_reason": getattr(r.Timetable, 'cover_reason', None),
        }
        for r in results
    ]


@router.post("/request_cover/{session_id}")
def request_admin_cover(
    session_id: int,
    request_data: schemas.CoverRequestUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Saves a lecturer's request for administrative cover to the timetable record."""
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 1. Find the timetable entry
    timetable_entry = (
        db.query(models.Timetable).filter(models.Timetable.id == session_id).first()
    )

    if not timetable_entry:
        raise HTTPException(status_code=404, detail="Session not found in timetable")

    # 2. Update the fields
    timetable_entry.cover_requested = True
    timetable_entry.cover_reason = request_data.reason

    # 3. Commit the changes
    try:
        db.commit()
        db.refresh(timetable_entry)
        return {
            "message": "Cover request saved successfully",
            "session_id": session_id,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/cancel_cover/{session_id}")
def cancel_admin_cover(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Clears a lecturer's cover request from the timetable record."""
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 1. Find the timetable entry
    timetable_entry = (
        db.query(models.Timetable).filter(models.Timetable.id == session_id).first()
    )

    if not timetable_entry:
        raise HTTPException(status_code=404, detail="Session not found in timetable")

    # 2. Clear the fields
    timetable_entry.cover_requested = False
    timetable_entry.cover_reason = None

    # 3. Commit the changes
    try:
        db.commit()
        db.refresh(timetable_entry)
        return {
            "message": "Cover request cancelled successfully",
            "session_id": session_id,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


