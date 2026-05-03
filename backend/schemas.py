"""
schemas.py
──────────
Pydantic models used as FastAPI request / response bodies.
Keeping these separate from SQLAlchemy models avoids tight coupling.
"""

from datetime import datetime
from typing import Optional, List
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
    annotated_frame_base64: Optional[str] = None



class AttendanceRecordOut(BaseModel):
    id: int
    date: str
    studentName: str
    indexNumber: str
    subject: str
    module_code: Optional[str] = None
    timeIn: Optional[str]
    timeOut: Optional[str]
    status: str
    photoUrl: Optional[str] = None

    model_config = {"from_attributes": True}


# History endpoint

class AttendanceHistoryResponse(BaseModel):
    total: int
    records: list[AttendanceRecordOut]



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



# Class Session

class SessionCreate(BaseModel):
    lecturer_id: int
    subject_id: str
    batch_id: str
    session_type: str
    location: str


class SessionOut(SessionCreate):
    id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    cover_requested: bool = False
    cover_reason: Optional[str] = None

    model_config = {"from_attributes": True}
    

# Modules

class ModuleBase(BaseModel):
    module_code: str
    module_name: str
    faculty: str
    department: str
    level: Optional[str] = None
    degree: Optional[str] = None

class ModuleCreate(ModuleBase):
    pass

class ModuleOut(ModuleBase):
    id: int
    model_config = {"from_attributes": True}

class ModuleUpdate(BaseModel):
    module_code: Optional[str] = None
    module_name: Optional[str] = None
    faculty: Optional[str] = None
    department: Optional[str] = None
    level: Optional[str] = None
    degree: Optional[str] = None


class ManualOverride(BaseModel):
    session_id: int
    student_index: str
    action_type: str # 'IN' or 'OUT'

class ManualAttendanceSchema(BaseModel):
    session_id: int
    student_index: str    # Index number, e.g. CS202601
    action_type: str      # 'IN' or 'OUT'


class ManualOverrideRecord(BaseModel):
    student_id: int
    session_id: int
    status: str
    reason: Optional[str] = None

class ManualOverridePayload(BaseModel):
    records: List[ManualOverrideRecord]

class CoverRequestUpdate(BaseModel):
    reason: str

# Correction Requests

class CorrectionRequestCreate(BaseModel):
    session_id: int
    reason_type: str
    description: str
    evidence_url: Optional[str] = None

class CorrectionRequestUpdate(BaseModel):
    status: str # 'Approved' or 'Rejected'
    rejection_reason: Optional[str] = None

class CorrectionRequestResponse(BaseModel):
    id: int
    student_id: str
    session_id: int
    reason_type: str
    description: str
    evidence_url: Optional[str]
    status: str
    rejection_reason: Optional[str] = None
    submitted_at: datetime

    model_config = {"from_attributes": True}

class SubjectRequestsSummary(BaseModel):
    subject_id: str
    subject_code: str
    subject_name: str
    batch: str
    degree: str
    semester: str
    pending_count: int
    requests: List[CorrectionRequestResponse]

    model_config = {"from_attributes": True}

