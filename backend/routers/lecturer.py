import os
import uuid
import shutil
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File # type: ignore
from pydantic import BaseModel # type: ignore
from sqlalchemy.orm import Session # type: ignore
from sqlalchemy import func, cast, String # type: ignore

import models
import schemas
from database import get_db
from auth import verify_password, hash_password, get_current_user

router = APIRouter(prefix="/api/lecturer", tags=["Lecturer"])

class FilterOptionsResponse(BaseModel):
    degrees: List[Any]
    semesters: List[Any]
    modules: List[Any]
    batches: List[Any]

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

@router.get("/filter-options", response_model=FilterOptionsResponse)
def get_lecturer_filter_options(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns unique degree, semester, module, and batch options 
    for the specific lecturer based on their assigned subjects and conduct history.
    """
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Unauthorized")

    lecturer = db.query(models.Lecturer).filter(models.Lecturer.email == current_user.email).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer profile not found.")

    assigned_subjects_raw = lecturer.assigned_subjects or ""
    subject_codes = [s.strip() for s in assigned_subjects_raw.split(",") if s.strip()]

    # 1. Degrees and Semesters (Global distinct options for the system)
    degrees = db.query(models.Module.degree).filter(models.Module.degree.isnot(None)).distinct().all()
    semesters = db.query(models.Module.level).filter(models.Module.level.isnot(None)).distinct().all()

    # 2. Modules — two reliable sources, merged and deduplicated:

    # Source A: Directly from the lecturer's assigned_subjects codes
    module_map: dict = {}
    if subject_codes:
        assigned_modules = db.query(models.Module).filter(
            models.Module.module_code.in_(subject_codes)
        ).all()
        for m in assigned_modules:
            module_map[m.module_code] = m.module_name

    # Source B: Any module_code appearing in Timetable entries for this lecturer
    timetable_module_codes = db.query(models.Timetable.module_code).filter(
        models.Timetable.lecturer == lecturer.name
    ).distinct().all()
    extra_codes = [row[0] for row in timetable_module_codes if row[0] and row[0] not in module_map]
    if extra_codes:
        extra_modules = db.query(models.Module).filter(
            models.Module.module_code.in_(extra_codes)
        ).all()
        for m in extra_modules:
            module_map[m.module_code] = m.module_name
        # Also handle codes that exist in timetable but not yet in the modules table
        for code in extra_codes:
            if code not in module_map:
                module_map[code] = code  # Fall back to showing the code itself

    # 3. Batches (Human-readable mapping from Timetable)
    # We find batches where this lecturer actually has scheduled classes
    timetable_batches = db.query(models.Timetable.batch_id).filter(
        models.Timetable.lecturer == lecturer.name
    ).distinct().all()

    return {
        "degrees": [{"name": d[0]} for d in degrees],
        "semesters": [{"name": s[0]} for s in semesters],
        "modules": [{"code": code, "name": name} for code, name in module_map.items()],
        "batches": [{"name": b[0]} for b in timetable_batches]
    }



# Dashboard Summary — single unified endpoint for the Lecturer Dashboard

@router.get("/dashboard_summary/{lecturer_id}")
def get_dashboard_summary(lecturer_id: int, db: Session = Depends(get_db)):
    """
    Returns a comprehensive JSON object containing all data needed
    to render the Lecturer Dashboard in a single network call.
    """
    from sqlalchemy import func, distinct # type: ignore

    # 1. Lecturer identity
    lecturer = db.query(models.Lecturer).filter(models.Lecturer.id == lecturer_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    # 2. Aggregate stats 

    # 2a. Total class sessions conducted by this lecturer
    total_classes = db.query(func.count(models.ClassSession.id)).filter(
        models.ClassSession.lecturer_id == lecturer_id
    ).scalar() or 0

    assigned_subjects_raw = lecturer.assigned_subjects or ""
    subject_list = [s.strip() for s in assigned_subjects_raw.split(",") if s.strip()]

    # 2b. Total unique students assigned to this lecturer's modules/batches
    # We find all distinct batches this lecturer teaches from the timetable
    lecturer_batches = db.query(models.Timetable.batch_id).filter(
        models.Timetable.lecturer == lecturer.name
    ).distinct().all()
    batch_ids = [b[0] for b in lecturer_batches]

    total_students = 0
    if batch_ids:
        # We assume students are mapped to batches via the 'intake' field
        total_students = db.query(func.count(distinct(models.Student.id))).filter(
            models.Student.intake.in_(batch_ids)
        ).scalar() or 0
        print(f"DEBUG: Lecturer {lecturer.name} has batches {batch_ids}. Total students found: {total_students}")
    else:
        # Fallback to Enrollment table if timetable is empty (unlikely but safe)
        total_students = db.query(func.count(distinct(models.Enrollment.student_id))).filter(
            models.Enrollment.class_id.in_(subject_list)
        ).scalar() or 0
        print(f"DEBUG: No batches found in timetable. Fallback total students: {total_students}")

    # Formula: (Count of 'Present' or 'Excused' records) / (Total attendance records) * 100
    avg_attendance = 0.0
    
    # Query all attendance records for this lecturer's sessions
    attendance_query = db.query(models.AttendanceRecord).join(
        models.ClassSession, models.AttendanceRecord.session_id == models.ClassSession.id
    ).filter(
        models.ClassSession.lecturer_id == lecturer_id
    )
    
    total_records = attendance_query.count()
    if total_records > 0:
        # Count both 'Present' and 'Excused' (approved medical/correction requests) as attended
        present_count = attendance_query.filter(
            models.AttendanceRecord.status.in_(["Present", "Excused"])
        ).count()
        avg_attendance = round((present_count / total_records) * 100, 1)

    # 3. Recent classes (last 5 closed sessions) 
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

    # 4. Upcoming appointments (next 5, Pending or Approved)
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

    # 5. Pending Actions
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

    # 6. At-Risk Students (attendance < 70% across this lecturer's sessions)
    at_risk_students = []
    at_risk_count = 0
    
    # Get all students in batches taught by this lecturer
    target_student_ids = []
    if batch_ids:
        rows = db.query(models.Student.id).filter(models.Student.intake.in_(batch_ids)).all()
        target_student_ids = [r[0] for r in rows]
    
    if target_student_ids and total_classes > 0:
        session_ids = [s.id for s in db.query(models.ClassSession.id).filter(models.ClassSession.lecturer_id == lecturer_id).all()]
        
        for sid in target_student_ids:
            # Count records for this student in this lecturer's sessions
            stu_records = db.query(models.AttendanceRecord).filter(
                models.AttendanceRecord.student_id == sid,
                models.AttendanceRecord.session_id.in_(session_ids)
            ).all()
            
            if not stu_records:
                pct = 0.0
            else:
                # Count both 'Present' and 'Excused' (approved medical leave) as attended
                present = len([r for r in stu_records if r.status in ("Present", "Excused")])
                pct = round((present / len(stu_records)) * 100, 1)
            
            if pct < 70:
                at_risk_count += 1
                stu = db.query(models.Student).filter(models.Student.id == sid).first()
                if stu:
                    at_risk_students.append({
                        "id": stu.id,
                        "name": stu.name,
                        "index_number": stu.index_number,
                        "attendance_percentage": pct,
                        "sessions_attended": len([r for r in stu_records if r.status in ("Present", "Excused")]),
                        "total_sessions": len(stu_records),
                    })

        # Sort by lowest attendance first, cap at 5
        at_risk_students.sort(key=lambda x: x["attendance_percentage"])
        at_risk_students = at_risk_students[:5]

    # 7. Today's Schedule
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

    # 7.5. Weekly Goal
    from datetime import timedelta
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    
    weekly_sessions = db.query(models.Timetable).filter(
        models.Timetable.lecturer == lecturer.name,
        models.Timetable.date >= start_of_week.strftime("%Y-%m-%d"),
        models.Timetable.date <= end_of_week.strftime("%Y-%m-%d"),
    ).all()
    
    total_weekly_sessions = len(weekly_sessions)
    weekly_completed = 0
    
    if total_weekly_sessions > 0:
        week_start_dt = datetime(start_of_week.year, start_of_week.month, start_of_week.day)
        week_end_dt = datetime(end_of_week.year, end_of_week.month, end_of_week.day, 23, 59, 59)
        weekly_completed = db.query(models.ClassSession).filter(
            models.ClassSession.lecturer_id == lecturer_id,
            models.ClassSession.start_time >= week_start_dt,
            models.ClassSession.start_time <= week_end_dt,
            models.ClassSession.status == "Closed"
        ).count()

    weekly_goal = {
        "completed": weekly_completed,
        "total": total_weekly_sessions
    }

    # 8. Assemble response
    return {
        "lecturer_name": lecturer.name,
        "department": lecturer.department,
        "employee_id": lecturer.employee_id,
        "stats": {
            "totalClassesConducted": total_classes,
            "averageAttendance": avg_attendance,
            "totalStudentsAssigned": total_students,
            "atRiskStudents": at_risk_count,
        },
        "recent_classes": recent_classes,
        "upcoming_appointments": upcoming_appointments,
        "pending_actions": pending_actions,
        "at_risk_students": at_risk_students,
        "todays_schedule": todays_schedule,
        "weekly_goal": weekly_goal,
    }

@router.get("/subjects")
def get_lecturer_subjects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch detailed information for all subjects assigned to the logged-in lecturer, grouped by batch."""
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

    from sqlalchemy import func # type: ignore
    
    # 2. Get all distinct (module_code, batch_id) combinations from Timetable for this lecturer
    timetable_entries = db.query(
        models.Timetable.module_code,
        models.Timetable.batch_id
    ).filter(
        models.Timetable.lecturer == lecturer.name,
        models.Timetable.module_code.in_(subject_codes)
    ).distinct().all()
    
    # 3. For each combination, fetch module details and count students
    detailed_subjects = []
    
    # Fetch all relevant modules
    modules = db.query(models.Module).filter(models.Module.module_code.in_(subject_codes)).all()
    module_details = {m.module_code: m for m in modules}

    for t_mod_code, t_batch in timetable_entries:
        mod = module_details.get(t_mod_code)
        if not mod:
            continue
            
        # Count enrolled students based purely on batch since enrollments table may be empty
        # Using Student.intake as the batch mapping
        enrolled_count = db.query(func.count(models.Student.id)).filter(
            models.Student.intake == t_batch
        ).scalar() or 0

        detailed_subjects.append({
            "module_code": t_mod_code,
            "module_name": mod.module_name,
            "semester": mod.level or "Semester 1",
            "degree": mod.degree,
            "batch": t_batch,
            "enrolled_students": enrolled_count
        })

    return detailed_subjects


@router.get("/attendance/{subject_id}")
def get_subject_attendance(
    subject_id: str,
    date: Optional[str] = None, # "YYYY-MM-DD"
    batch: Optional[str] = None,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Calculates overall attendance percentage for each student in the subject
    and returns their status for a specific date.
    """
    if current_user.role not in ["Lecturer", "Admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 1. Subject Details: Total sessions held (sessions that are 'Closed')
    sessions_query = db.query(models.ClassSession).join(
        models.Timetable, models.ClassSession.batch_id == cast(models.Timetable.id, String)
    ).filter(
        func.trim(models.Timetable.module_code) == func.trim(subject_id)
    )
    if batch:
        sessions_query = sessions_query.filter(func.trim(models.Timetable.batch_id) == func.trim(batch))
    total_sessions_held = sessions_query.count()

    # 2. Get all enrolled student IDs for this subject
    # Find all batches taking this subject from Timetable
    timetable_batches = db.query(models.Timetable.batch_id).filter(
        func.trim(models.Timetable.module_code) == func.trim(subject_id)
    ).distinct().all()
    batch_list = [str(b[0]).strip() for b in timetable_batches]
    
    enrolled_query = db.query(models.Student.id).filter(
        func.trim(models.Student.intake).in_(batch_list)
    )
    if batch:
        enrolled_query = enrolled_query.filter(func.trim(models.Student.intake) == func.trim(batch))
        
    enrolled_rows = enrolled_query.distinct().all()
    enrolled_student_ids = [r[0] for r in enrolled_rows]

    total_enrolled = len(enrolled_student_ids)

    # 3. Handle Date or Session Filtering
    session_today = None
    is_overall_summary = False

    if session_id:
        session_today = db.query(models.ClassSession).filter(
            models.ClassSession.id == session_id
        ).first()
    elif date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
            day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            session_today_query = db.query(models.ClassSession).join(
                models.Timetable, models.ClassSession.batch_id == cast(models.Timetable.id, String)
            ).filter(
                func.trim(models.Timetable.module_code) == func.trim(subject_id),
                models.ClassSession.start_time >= day_start,
                models.ClassSession.start_time < day_end
            )
            if batch:
                session_today_query = session_today_query.filter(func.trim(models.Timetable.batch_id) == func.trim(batch))
            session_today = session_today_query.first()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        # If neither date nor session_id is provided, it's the "All Sessions" overall view
        is_overall_summary = True

    # Only return empty students array if a specific date/session was requested but not found
    if not is_overall_summary and not session_today:
        return {
            "subject_details": {
                "total_students": total_enrolled,
                "total_sessions_held": total_sessions_held
            },
            "students": []
        }

    # Get closed session IDs for this subject to calculate percentage efficiently
    closed_sessions_query = db.query(models.ClassSession.id).join(
        models.Timetable, models.ClassSession.batch_id == cast(models.Timetable.id, String)
    ).filter(
        func.trim(models.Timetable.module_code) == func.trim(subject_id)
    )
    if batch:
        closed_sessions_query = closed_sessions_query.filter(func.trim(models.Timetable.batch_id) == func.trim(batch))
    closed_sessions = closed_sessions_query.all()
    closed_session_ids = [s[0] for s in closed_sessions]

    # Fetch students and their calculated analytics
    students_data = []
    for sid in enrolled_student_ids:
        student = db.query(models.Student).filter(models.Student.id == sid).first()
        if not student: continue

        # A. Attendance Status and Details for the specific session/date
        status = "No Session"
        in_time_str = None
        out_time_str = None
        reason_str = None
        tz_lk = timezone(timedelta(hours=5, minutes=30))

        if session_today:
            status = "Absent"
            ar_today = db.query(models.AttendanceRecord).filter(
                models.AttendanceRecord.student_id == student.id,
                models.AttendanceRecord.session_id == session_today.id
            ).first()
            if ar_today:
                if ar_today.status:
                    status = ar_today.status
                if hasattr(ar_today, 'reason') and ar_today.reason:
                    reason_str = ar_today.reason

            # Fetch the first 'entered' log as in_time
            in_log = db.query(models.AttendanceLog).filter(
                models.AttendanceLog.student_id == student.id,
                models.AttendanceLog.session_id == session_today.id,
                models.AttendanceLog.status.in_(["entered", "Present"])
            ).order_by(models.AttendanceLog.timestamp.asc()).first()
            
            if in_log:
                local_in_time = in_log.timestamp.replace(tzinfo=timezone.utc).astimezone(tz_lk)
                in_time_str = local_in_time.strftime("%I:%M %p")
                if not reason_str and in_log.remarks:
                    reason_str = in_log.remarks

            # Fetch the last 'exited' log as out_time
            out_log = db.query(models.AttendanceLog).filter(
                models.AttendanceLog.student_id == student.id,
                models.AttendanceLog.session_id == session_today.id,
                models.AttendanceLog.status == "exited"
            ).order_by(models.AttendanceLog.timestamp.desc()).first()

            if out_log:
                local_out_time = out_log.timestamp.replace(tzinfo=timezone.utc).astimezone(tz_lk)
                out_time_str = local_out_time.strftime("%I:%M %p")

        # B. Longitudinal Attendance Percentage — count Present OR Excused as attended
        attended_count = 0
        if total_sessions_held > 0 and closed_session_ids:
            attended_count = db.query(models.AttendanceRecord).filter(
                models.AttendanceRecord.student_id == student.id,
                models.AttendanceRecord.session_id.in_(closed_session_ids),
                models.AttendanceRecord.status.in_(["Present", "Excused"])
            ).distinct(models.AttendanceRecord.session_id).count()

        # Calculation logic: return 0.0 if no classes held yet
        percentage = round((attended_count / total_sessions_held) * 100, 1) if total_sessions_held > 0 else 0.0

        students_data.append({
            "id": student.id,
            "index_number": student.index_number,
            "name": student.name,
            "status": status,
            "attendance_percentage": percentage,
            "total_sessions": total_sessions_held,
            "attended_sessions": attended_count,
            "in_time": in_time_str,
            "out_time": out_time_str,
            "reason": reason_str
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

    # Missing department guard — return descriptive warning instead of empty list
    missing = []
    if not lecturer.faculty:
        missing.append("Faculty")
    if not lecturer.department:
        missing.append("Department")

    if missing:
        from fastapi.responses import JSONResponse # type: ignore
        return JSONResponse(
            status_code=206,
            content={
                "warning": True,
                "missing_fields": missing,
                "message": (
                    f"Your timetable cannot be displayed because the following "
                    f"profile fields are not set: {', '.join(missing)}. "
                    "Please contact the Academic Administrator to update your profile."
                ),
            },
        )

    # Match based on lecturer name (Timetable.lecturer is a string field)
    # Filter: Window includes past 7 days (current week) to 14 days future (cover requests)
    from datetime import date as date_type, timedelta
    today_dt = date_type.today()
    start_date = today_dt - timedelta(days=7)
    end_date = today_dt + timedelta(days=14)

    # Join with Module to get degree and level/semester
    query = (
        db.query(models.Timetable, models.Module.degree, models.Module.level)
        .outerjoin(models.Module, models.Timetable.module_code == models.Module.module_code)
        .filter(
            models.Timetable.lecturer == lecturer.name,
            models.Timetable.date >= start_date.strftime("%Y-%m-%d"),
            models.Timetable.date <= end_date.strftime("%Y-%m-%d"),
        )
    )
    # Secondary scope: faculty + department — prevents cross-dept name collisions
    if lecturer.faculty:
        query = query.filter(
            models.Timetable.faculty.ilike(lecturer.faculty.strip())
        )
    if lecturer.department:
        query = query.filter(
            models.Timetable.department.ilike(lecturer.department.strip())
        )

    results = (
        query
        .order_by(models.Timetable.date.asc(), models.Timetable.start_time.asc())
        .all()
    )

    # Calculate exact student counts dynamically based on session batch and department
    # Using a dictionary to cache counts and prevent duplicate queries for identical batch/dept pairs
    enrollment_counts = {}
    for r in results:
        batch = r.Timetable.batch_id
        dept = r.Timetable.department
        key = f"{batch}_{dept}"
        if key not in enrollment_counts:
            student_count = db.query(models.Student).filter(
                models.Student.intake == batch,
                models.Student.department == dept
            ).count()
            enrollment_counts[key] = student_count

    from datetime import datetime as dt_class
    now_time = dt_class.now().time()

    def _parse(t_str):
        try:
            return dt_class.strptime(t_str, "%I:%M %p").time()
        except Exception:
            return None

    def _resolve(tt):
        """Hybrid status resolution: manual action > live flag > date/time."""
        db_st = getattr(tt, 'status', None)
        # Check for both 'completed' and 'closed' since the DB may use either string
        is_manually_completed = bool(db_st and db_st.lower() in ["completed", "closed", "ended"])
        s = _parse(tt.start_time)
        e = _parse(tt.end_time)
        
        tt_date = dt_class.strptime(tt.date, "%Y-%m-%d").date()
        today_date = dt_class.today().date()

        is_past_session = (tt_date < today_date) or (tt_date == today_date and s and e and now_time > e)
        is_time_live = (tt_date == today_date and s and e and s <= now_time <= e)
        is_db_live = bool(tt.is_live)

        # 1. Manual Completion ALWAYS wins
        if is_manually_completed:
            return "Completed", False, True
        # 2. If it's explicitly marked Live in DB, it remains Live (Overtime support)
        elif is_db_live:
            return "Live", True, False
        # 3. Handle expired/upcoming sessions
        elif is_past_session:
            return "Missed", False, False
        elif is_time_live:
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
            "enrolled_count": enrollment_counts.get(f"{r.Timetable.batch_id}_{r.Timetable.department}", 0),
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

@router.get("/recent-sessions")
def get_recent_completed_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Fetch the last 12 completed sessions for the manual override dashboard."""
    if current_user.role not in ["Lecturer", "Admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Base query
    query = db.query(
        models.ClassSession,
        models.Timetable,
        models.Module,
        models.Lecturer
    ).outerjoin(
        models.Timetable, models.ClassSession.batch_id == cast(models.Timetable.id, String)
    ).outerjoin(
        models.Module, models.Timetable.module_code == models.Module.module_code
    ).outerjoin(
        models.Lecturer, models.ClassSession.lecturer_id == models.Lecturer.id
    ).filter(
        models.ClassSession.status.in_(["Completed", "Closed"])
    )

    # Filter by lecturer if not Admin
    if current_user.role == "Lecturer":
        lecturer_obj = db.query(models.Lecturer).filter(models.Lecturer.email == current_user.email).first()
        if not lecturer_obj:
            raise HTTPException(status_code=404, detail="Lecturer not found")
        query = query.filter(models.ClassSession.lecturer_id == lecturer_obj.id)

    sessions = query.order_by(models.ClassSession.start_time.desc()).limit(12).all()
    
    # Simple manual deduplication
    seen_ids = set()
    deduplicated_sessions = []
    for s, tt, m, l in sessions:
        if s.id not in seen_ids:
            deduplicated_sessions.append((s, tt, m, l))
            seen_ids.add(s.id)

    result = []
    for s, tt, m, l in deduplicated_sessions:
        result.append({
            "id": s.id,
            "module_name": tt.module_name if tt else s.subject_id,
            "module_code": tt.module_code if tt else "N/A",
            "batch": tt.batch_id if tt else s.batch_id,
            "date": s.start_time.strftime("%Y-%m-%d") if s.start_time else (tt.date if tt else "N/A"),
            "start_time": tt.start_time if tt else (s.start_time.strftime("%I:%M %p") if s.start_time else "N/A"),
            "end_time": tt.end_time if tt else None,
            "status": s.status,
            "degree": m.degree if m else "N/A",
            "semester": tt.semester if tt else "N/A",
            "level": m.level if m else "N/A",
            "lecturer": l.name if l else "Unknown"
        })

    return result


