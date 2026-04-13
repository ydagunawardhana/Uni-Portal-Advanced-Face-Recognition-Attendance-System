"""
schemas.py
──────────
Pydantic models used as FastAPI request / response bodies.
Keeping these separate from SQLAlchemy models avoids tight coupling.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel



# Student

class StudentBase(BaseModel):
    index_number: str
    name: str


class StudentCreate(StudentBase):
    pass


class StudentOut(StudentBase):
    id: int

    model_config = {"from_attributes": True}



# Attendance Log

class AttendanceLogOut(BaseModel):
    id:         int
    student_id: int
    timestamp:  datetime
    status:     str                  # 'entered' | 'exited'
    student:    Optional[StudentOut] = None

    model_config = {"from_attributes": True}



# Attendance endpoint — response shapes

class FaceDetectionResult(BaseModel):
    """Per-face result returned inside the attendance response."""
    label:      str
    user_id:    int
    confidence: float
    is_known:   bool
    bbox:       dict                 # {x, y, w, h}


class AttendanceResponse(BaseModel):
    """
    Full response from POST /api/attendance.
    Contains every detected face **and** the DB log for known ones.
    """
    message:          str
    faces_detected:   int
    faces_recognised: int
    results:          list[FaceDetectionResult]
    logs:             list[AttendanceLogOut]
    timestamp:        str



# History endpoint

class AttendanceHistoryResponse(BaseModel):
    total:   int
    records: list[AttendanceLogOut]



# Appointment

class AppointmentBase(BaseModel):
    lecturer_id:      int
    appointment_date: str
    time_slot:        str
    reason:           Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdateStatus(BaseModel):
    status: str           # 'Approved' | 'Rejected'
    decline_reason: Optional[str] = None


class AppointmentOut(AppointmentBase):
    id:            int
    student_id:    int
    status:        str
    created_at:    datetime
    student_name:  Optional[str] = None
    student_index: Optional[str] = None
    lecturer_name: Optional[str] = None
    lecturer_department: Optional[str] = None
    student_faculty:    Optional[str] = None
    student_department: Optional[str] = None
    student_degree:     Optional[str] = None
    decline_reason:     Optional[str] = None

    model_config = {"from_attributes": True}

