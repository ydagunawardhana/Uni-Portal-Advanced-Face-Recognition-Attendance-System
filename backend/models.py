from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Boolean
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

    # Relationship: one student can have many attendance logs
    attendance_logs = relationship("AttendanceLog", back_populates="student")
    notifications   = relationship("Notification", back_populates="student")


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    status = Column(String, nullable=False)  # 'entered' or 'exited'

    # Relationship: each log belongs to one student
    student = relationship("Student", back_populates="attendance_logs")


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


class PasswordReset(Base):
    """Stores temporary 6-digit OTPs for account recovery."""
    __tablename__ = "password_resets"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, index=True, nullable=False)
    otp        = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False)

