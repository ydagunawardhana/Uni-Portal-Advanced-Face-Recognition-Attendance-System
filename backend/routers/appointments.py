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
        models.Student.index_number.label("student_index")
    ).join(
        models.Student, models.Appointment.student_id == models.Student.id
    ).filter(
        models.Appointment.lecturer_id == lecturer_id
    ).all()
    
    result = []
    for app, name, index in appointments:
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
            "student_index": index
        }
        result.append(app_dict)
        
    return result

@router.put("/{appointment_id}/status", response_model=schemas.AppointmentOut)
def update_appointment_status(appointment_id: int, payload: schemas.AppointmentUpdateStatus, db: Session = Depends(get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    appointment.status = payload.status
    db.commit()
    db.refresh(appointment)
    
    return appointment
