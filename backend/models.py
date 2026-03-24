from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """Portal user account – managed by Admin."""
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True, nullable=False)
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
    mobile          = Column(String, nullable=True)
    department      = Column(String, nullable=True)
    nic_number      = Column(String, nullable=True)
    gender          = Column(String, nullable=True)
    academic_year   = Column(String, nullable=True)
    intake          = Column(String, nullable=True)
    face_dataset_path = Column(String, nullable=True)   
    requires_password_change = Column(Boolean, default=True)

    # Relationship: one student can have many attendance logs
    attendance_logs = relationship("AttendanceLog", back_populates="student")


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    status = Column(String, nullable=False)  # 'entered' or 'exited'

    # Relationship: each log belongs to one student
    student = relationship("Student", back_populates="attendance_logs")


class AuditLog(Base):
    """System-level actions trackable for Admin dashboard."""
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    action_type = Column(String, nullable=False, index=True) # e.g. 'Login Activity', 'Updates'
    description = Column(String, nullable=False)
    timestamp   = Column(DateTime, default=func.now(), nullable=False)

