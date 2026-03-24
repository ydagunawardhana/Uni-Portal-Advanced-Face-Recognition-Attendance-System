"""
crud.py
───────
All database read / write operations for the attendance system.
Route handlers call these functions — they never touch the DB directly.
"""

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

import models


# Student helpers

def get_student_by_index(db: Session, index_number: str) -> Optional[models.Student]:
    """Return a Student row by their unique index_number, or None."""
    return (
        db.query(models.Student)
        .filter(models.Student.index_number == index_number)
        .first()
    )


def get_student_by_name(db: Session, name: str) -> Optional[models.Student]:
    """Return a Student row whose name matches (case-insensitive), or None."""
    return (
        db.query(models.Student)
        .filter(models.Student.name.ilike(name))
        .first()
    )


def get_or_create_student(db: Session, index_number: str, name: str) -> models.Student:
    """
    Return the existing Student for *index_number*, or create a new one.
    This is called automatically when a recognised face is logged for
    the first time — no manual registration step is required.
    """
    student = get_student_by_index(db, index_number)
    if not student:
        student = models.Student(index_number=index_number, name=name)
        db.add(student)
        db.commit()
        db.refresh(student)
    return student


# Attendance log helpers

def get_latest_log_for_student(
    db: Session,
    student_id: int,
    within_minutes: int = 1,
) -> Optional[models.AttendanceLog]:
    """
    Return the most recent AttendanceLog for a student within the last
    *within_minutes* window. Used to prevent duplicate entries when the
    same face is recognised in back-to-back frames.
    """
    cutoff = datetime.utcnow() - timedelta(minutes=within_minutes)
    return (
        db.query(models.AttendanceLog)
        .filter(
            models.AttendanceLog.student_id == student_id,
            models.AttendanceLog.timestamp >= cutoff,
        )
        .order_by(models.AttendanceLog.timestamp.desc())
        .first()
    )


def determine_status(last_log: Optional[models.AttendanceLog]) -> str:
    """
    Toggle between 'entered' and 'exited' based on the last recorded status.
    First-time visit → 'entered'.
    """
    if last_log is None:
        return "entered"
    return "exited" if last_log.status == "entered" else "entered"


def log_attendance(
    db:         Session,
    student_id: int,
    status:     str,
    timestamp:  Optional[datetime] = None,
) -> models.AttendanceLog:
    """
    Insert a new AttendanceLog row and return it (with DB-generated id).
    """
    entry = models.AttendanceLog(
        student_id = student_id,
        timestamp  = timestamp or datetime.utcnow(),
        status     = status,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def log_attendance_for_recognised_face(
    db:           Session,
    index_number: str,
    name:         str,
    debounce_min: int = 1,
) -> tuple[models.AttendanceLog, bool]:
    """
    High-level helper called by the route handler.

    1. Get-or-create the Student.
    2. Check if a log already exists within *debounce_min* minutes (anti-spam).
    3. Determine the correct status (entered / exited).
    4. Write the AttendanceLog and return it.

    Returns
    -------
    (log, created)
        log     – the AttendanceLog ORM object
        created – False if this call was skipped due to debounce
    """
    now     = datetime.utcnow()
    student = get_or_create_student(db, index_number, name)

    # Debounce: skip if already logged within the window 
    recent = get_latest_log_for_student(db, student.id, within_minutes=debounce_min)
    if recent:
        return recent, False          # return the existing log, flag as skipped

    status = determine_status(
        # look further back (no time limit) to decide enter/exit toggle
        db.query(models.AttendanceLog)
        .filter(models.AttendanceLog.student_id == student.id)
        .order_by(models.AttendanceLog.timestamp.desc())
        .first()
    )

    new_log = log_attendance(db, student.id, status, timestamp=now)
    return new_log, True


# Query helpers

def get_attendance_history(
    db:     Session,
    limit:  int = 100,
    offset: int = 0,
    student_id: Optional[int] = None,
    date:   Optional[str]     = None,     # "YYYY-MM-DD"
) -> tuple[int, list[models.AttendanceLog]]:
    """
    Return (total_count, records) for the attendance history endpoint.
    Supports optional filtering by student and/or date.
    """
    q = db.query(models.AttendanceLog)

    if student_id:
        q = q.filter(models.AttendanceLog.student_id == student_id)

    if date:
        try:
            day_start = datetime.strptime(date, "%Y-%m-%d")
            day_end   = day_start + timedelta(days=1)
            q = q.filter(
                models.AttendanceLog.timestamp >= day_start,
                models.AttendanceLog.timestamp <  day_end,
            )
        except ValueError:
            pass   # ignore malformed date strings

    total   = q.count()
    records = (
        q.order_by(models.AttendanceLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return total, records
