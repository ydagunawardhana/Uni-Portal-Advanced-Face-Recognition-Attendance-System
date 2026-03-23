from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
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

    id = Column(Integer, primary_key=True, index=True)
    index_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)

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
