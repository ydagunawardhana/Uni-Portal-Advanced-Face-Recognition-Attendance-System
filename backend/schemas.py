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
