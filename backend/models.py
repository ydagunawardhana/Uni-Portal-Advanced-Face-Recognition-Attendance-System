from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """Portal user account – managed by Admin."""
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True, nullable=False)
    personal_email  = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role            = Column(String, nullable=False)   # 'Admin' | 'Lecturer' | 'Student'
    is_active       = Column(Boolean, default=True, nullable=False)


class Student(Base):
    __tablename__ = "students"

    id           = Column(Integer, primary_key=True, index=True)
    index_number = Column(String, unique=True, index=True, nullable=False)
    name         = Column(String, nullable=False)

    # Extended registration fields
    email           = Column(String, nullable=True)
    personal_email  = Column(String, nullable=True)
    mobile          = Column(String, nullable=True)
    faculty         = Column(String, nullable=True)
    department      = Column(String, nullable=True)
    degree_program  = Column(String, nullable=True)
    nic_number      = Column(String, nullable=True)
    gender          = Column(String, nullable=True)
    academic_year   = Column(String, nullable=True)
    intake          = Column(String, nullable=True)
    face_dataset_path = Column(String, nullable=True)   
    requires_password_change = Column(Boolean, default=True)
    profile_picture = Column(String, nullable=True)
    retrain_requested = Column(Boolean, default=False)
    last_trained_date = Column(Date, nullable=True)
    is_active         = Column(Boolean, default=True, nullable=False)

    # Relationship: one student can have many attendance logs
    attendance_logs = relationship("AttendanceLog", back_populates="student", cascade="all, delete-orphan")
    notifications   = relationship("Notification", back_populates="student", cascade="all, delete-orphan")
    appointments    = relationship("Appointment", back_populates="student", cascade="all, delete-orphan")


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("class_sessions.id"), nullable=True)
    timestamp = Column(DateTime, nullable=False)
    status = Column(String, nullable=False)  # 'entered', 'exited', or 'Present'
    remarks = Column(String, nullable=True)   # e.g., 'Admin/Manual'

    # Relationship: each log belongs to one student and optionally a session
    student = relationship("Student", back_populates="attendance_logs")
    session = relationship("ClassSession", back_populates="attendance_logs")


class ClassSession(Base):
    """Specific lecture/lab session tracked by the system."""
    __tablename__ = "class_sessions"

    id           = Column(Integer, primary_key=True, index=True)
    lecturer_id  = Column(Integer, ForeignKey("lecturers.id"), nullable=False)
    subject_id   = Column(String, nullable=False)   # e.g., 'CS-101'
    batch_id     = Column(String, nullable=False)   # e.g., 'Year 2 Semester 1'
    session_type = Column(String, nullable=False)   # 'Lecture', 'Lab', etc.
    location     = Column(String, nullable=False)   # 'Hall A', etc.
    start_time   = Column(DateTime, default=func.now(), nullable=False)
    end_time     = Column(DateTime, nullable=True)
    status       = Column(String, default="Active", nullable=False)  # 'Active' | 'Closed'
    cover_requested = Column(Boolean, default=False, nullable=False)
    cover_reason    = Column(String, nullable=True)

    lecturer     = relationship("Lecturer")
    attendance_logs = relationship("AttendanceLog", back_populates="session")


class DeviceSession(Base):
    __tablename__ = "device_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=False)
    device_name = Column(String, nullable=False)
    browser = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    last_active = Column(DateTime, default=func.now())
    is_current_session = Column(Boolean, default=False)

class AuditLog(Base):
    """System-level actions trackable for Admin dashboard."""
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    action_type = Column(String, nullable=False, index=True) # e.g. 'Login Activity', 'Updates'
    description = Column(String, nullable=False)
    timestamp   = Column(DateTime, default=func.now(), nullable=False)


class Notification(Base):
    """Real-time system notifications for students."""
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True, index=True)
    student_id  = Column(Integer, ForeignKey("students.id"), nullable=False)
    type        = Column(String, nullable=False) # 'success', 'warning', 'info'
    title       = Column(String, nullable=False)
    message     = Column(String, nullable=False)
    is_read     = Column(Boolean, default=False, nullable=False)
    timestamp   = Column(DateTime, default=func.now(), nullable=False)

    student     = relationship("Student", back_populates="notifications")



class Lecturer(Base):
    """Lecturer profile - manages subjects and attendance logs."""
    __tablename__ = "lecturers"

    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(String, nullable=False)
    employee_id       = Column(String, unique=True, index=True, nullable=False)
    email             = Column(String, unique=True, index=True, nullable=False)
    personal_email    = Column(String, nullable=True)
    faculty           = Column(String, nullable=True)
    department        = Column(String, nullable=False)
    assigned_subjects = Column(String, nullable=True) # Comma-separated or JSON
    is_active         = Column(Boolean, default=True, nullable=False)
    profile_picture   = Column(String, nullable=True)
    office_hours      = Column(Text, nullable=True) # JSON array of {day, startTime, endTime, location}
    is_visiting       = Column(Boolean, default=False, nullable=False)
    requires_password_change = Column(Boolean, default=True, nullable=False)

    appointments      = relationship("Appointment", back_populates="lecturer")


class PasswordReset(Base):
    """Stores temporary 6-digit OTPs for account recovery."""
    __tablename__ = "password_resets"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, index=True, nullable=False)
    otp        = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)


class PreRegistration(Base):
    """Temporary storage for student applications before official registration."""
    __tablename__ = "pre_registrations"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    personal_email  = Column(String, nullable=False)
    mobile          = Column(String, nullable=True)
    nic_number      = Column(String, nullable=True)
    gender          = Column(String, nullable=True)
    faculty         = Column(String, nullable=True)
    department      = Column(String, nullable=True)
    degree_program  = Column(String, nullable=True)
    intake          = Column(String, nullable=True)
    academic_year   = Column(String, nullable=True)
    created_at      = Column(DateTime, server_default=func.now())


class Appointment(Base):
    """Student-Lecturer Consultation Appointments."""
    __tablename__ = "appointments"

    id               = Column(Integer, primary_key=True, index=True)
    student_id       = Column(Integer, ForeignKey("students.id"), nullable=False)
    lecturer_id      = Column(Integer, ForeignKey("lecturers.id"), nullable=False)
    appointment_date = Column(String, nullable=False) # e.g., 'Monday' or '2026-04-15'
    time_slot        = Column(String, nullable=False) # e.g., '10:00 AM - 12:00 PM'
    reason           = Column(Text, nullable=True)
    decline_reason   = Column(Text, nullable=True)
    status           = Column(String, default="Pending") # 'Pending', 'Approved', 'Rejected'
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    student          = relationship("Student", back_populates="appointments")
    lecturer         = relationship("Lecturer", back_populates="appointments")


class Enrollment(Base):
    """Links students to specific class sessions to authorize attendance tracking."""
    __tablename__ = "enrollments"

    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id   = Column(String, index=True, nullable=False) # Maps to session1, session2, etc.

    student    = relationship("Student")


class Timetable(Base):
    """University Timetable entries."""
    __tablename__ = "timetable"

    id          = Column(Integer, primary_key=True, index=True)
    batch_id    = Column(String, index=True, nullable=False)
    module_code = Column(String, nullable=False)
    module_name = Column(String, nullable=True)
    date        = Column(String, nullable=False)
    start_time  = Column(String, nullable=False)
    end_time    = Column(String, nullable=False)
    lecturer    = Column(String, nullable=True)
    location    = Column(String, nullable=True)
    faculty     = Column(String, nullable=True)
    department  = Column(String, nullable=True)
    semester    = Column(String, nullable=True)
    is_live     = Column(Boolean, default=False, nullable=False)
    file_name   = Column(String, nullable=True)
    cover_requested = Column(Boolean, default=False, nullable=False)
    cover_reason    = Column(String, nullable=True)
    created_at  = Column(DateTime, server_default=func.now())


class Module(Base):
    """Database-driven subjects/modules management."""
    __tablename__ = "modules"

    id          = Column(Integer, primary_key=True, index=True)
    module_code = Column(String, unique=True, index=True, nullable=False) # e.g. "PUSL2022"
    module_name = Column(String, nullable=False) # e.g. "Introduction to IOT"
    faculty     = Column(String, nullable=False)
    department  = Column(String, nullable=False, index=True)
    level       = Column(String, nullable=True) # e.g. "Year 1", "Level 4"
    degree      = Column(String, nullable=True) # Optional link to specific degree
