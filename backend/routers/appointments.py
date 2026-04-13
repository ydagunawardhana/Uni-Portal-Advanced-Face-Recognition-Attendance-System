from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

class AppointmentBookRequest(BaseModel):
    student_id: int
    lecturer_id: int
    appointment_date: str
    time_slot: str
    reason: Optional[str] = None

@router.post("/book", response_model=schemas.AppointmentOut)
def book_appointment(payload: AppointmentBookRequest, db: Session = Depends(get_db)):
    # Verify student exists
    student = db.query(models.Student).filter(models.Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Verify lecturer exists
    lecturer = db.query(models.Lecturer).filter(models.Lecturer.id == payload.lecturer_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    new_appointment = models.Appointment(
        student_id=payload.student_id,
        lecturer_id=payload.lecturer_id,
        appointment_date=payload.appointment_date,
        time_slot=payload.time_slot,
        reason=payload.reason,
        status="Pending"
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    return new_appointment

@router.get("/lecturer/{lecturer_id}", response_model=List[schemas.AppointmentOut])
def get_lecturer_appointments(lecturer_id: int, db: Session = Depends(get_db)):
    # Join with students to get name and index
    appointments = db.query(
        models.Appointment,
        models.Student.name.label("student_name"),
        models.Student.index_number.label("student_index"),
        models.Student.faculty.label("student_faculty"),
        models.Student.department.label("student_department"),
        models.Student.degree_program.label("student_degree")
    ).join(
        models.Student, models.Appointment.student_id == models.Student.id
    ).filter(
        models.Appointment.lecturer_id == lecturer_id
    ).all()
    
    result = []
    for app, name, index, fac, dept, deg in appointments:
        # Create a dict that matches schemas.AppointmentOut
        app_dict = {
            "id": app.id,
            "student_id": app.student_id,
            "lecturer_id": app.lecturer_id,
            "appointment_date": app.appointment_date,
            "time_slot": app.time_slot,
            "reason": app.reason,
            "status": app.status,
            "created_at": app.created_at,
            "student_name": name,
            "student_index": index,
            "student_faculty": fac,
            "student_department": dept,
            "student_degree": deg,
            "decline_reason": app.decline_reason
        }
        result.append(app_dict)
        
    return result

@router.put("/{appointment_id}/status", response_model=schemas.AppointmentOut)
def update_appointment_status(appointment_id: int, payload: schemas.AppointmentUpdateStatus, db: Session = Depends(get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    appointment.status = payload.status
    if payload.decline_reason is not None:
        appointment.decline_reason = payload.decline_reason
        
    db.commit()
    db.refresh(appointment)
    
    return appointment

@router.get("/student/{student_id}", response_model=List[schemas.AppointmentOut])
def get_student_appointments(student_id: int, db: Session = Depends(get_db)):
    # Join with lecturers to get name and department
    appointments = db.query(
        models.Appointment,
        models.Lecturer.name.label("lecturer_name"),
        models.Lecturer.department.label("lecturer_department")
    ).join(
        models.Lecturer, models.Appointment.lecturer_id == models.Lecturer.id
    ).filter(
        models.Appointment.student_id == student_id
    ).order_by(models.Appointment.created_at.desc()).all()
    
    result = []
    for app, name, dept in appointments:
        app_dict = {
            "id": app.id,
            "student_id": app.student_id,
            "lecturer_id": app.lecturer_id,
            "appointment_date": app.appointment_date,
            "time_slot": app.time_slot,
            "reason": app.reason,
            "status": app.status,
            "created_at": app.created_at,
            "lecturer_name": name,
            "lecturer_department": dept,
            "decline_reason": app.decline_reason
        }
        result.append(app_dict)
        
    return result

@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    db.delete(appointment)
    db.commit()
    return {"success": True, "message": "Appointment deleted successfully"}
