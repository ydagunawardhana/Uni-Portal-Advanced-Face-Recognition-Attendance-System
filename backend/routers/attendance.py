"""
routers/attendance.py
──────────────────────
All routes under /api/attendance.
"""

from __future__ import annotations

from datetime import datetime, date, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel

import cv2
import numpy as np

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import cast, String, func, and_

import crud
import models
import schemas
from database import get_db, SessionLocal
from face_recognition_engine import (
    FaceResult, recognize_faces, annotate_frame
)
from fastapi.responses import StreamingResponse
import base64
import time
import pickle
import face_recognition

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

# Strict biometric threshold
FACE_MATCH_THRESHOLD = 0.42

# Global Encodings Cache
global_known_encodings = []
global_known_names = []

def load_global_encodings():
    global global_known_encodings, global_known_names
    try:
        import pickle
        with open('encodings.pkl', 'rb') as f:
            data = pickle.load(f)
            global_known_encodings = data.get("encodings", [])
            global_known_names = data.get("names", [])
        print(f"[Attendance Stream] Globally loaded {len(global_known_encodings)} FaceNet vector maps.")
    except Exception as e:
        print(f"[Attendance Stream] WARNING: encodings.pkl not found or empty. ({e})")

load_global_encodings()


def _decode_image(raw: bytes) -> np.ndarray:
    arr = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")
    return frame


@router.post("", response_model=schemas.AttendanceResponse)
async def process_attendance_frame(
    file: UploadFile = File(...),
    debounce_min: int = Form(1),
    db: Session = Depends(get_db),
):
    raw = await file.read()
    frame = _decode_image(raw)
    face_results: list[FaceResult] = recognize_faces(frame)
    logs_created = []
    detection_out = []

    for result in face_results:
        detection_out.append(
            schemas.FaceDetectionResult(
                label=result.label,
                user_id=result.user_id,
                confidence=round(result.confidence, 2),
                is_known=result.is_known,
                bbox=result.bbox,
            )
        )

        if not result.is_known: continue

        student = db.query(models.Student).filter(models.Student.index_number == result.label).first()
        if not student:
            result.is_known = False
            result.label = "Unknown"
            detection_out[-1].is_known = False
            detection_out[-1].label = "Unknown"
            continue

        result.label = student.name
        detection_out[-1].label = student.name

        log_entry, created = crud.log_attendance_for_recognised_face(
            db=db,
            student_id=student.id,
            debounce_min=debounce_min,
        )
        log_entry.student = student
        logs_created.append(log_entry)

    annotated_img = annotate_frame(frame, face_results)
    _, buffer = cv2.imencode('.jpg', annotated_img)
    base64_str = base64.b64encode(buffer).decode('utf-8')
    base64_frame = f"data:image/jpeg;base64,{base64_str}"

    return schemas.AttendanceResponse(
        message=f"{len(face_results)} faces detected.",
        faces_detected=len(face_results),
        faces_recognised=sum(1 for r in face_results if r.is_known),
        results=detection_out,
        logs=logs_created,
        timestamp=datetime.utcnow().isoformat() + "Z",
        annotated_frame_base64=base64_frame,
    )


@router.get("/history", response_model=schemas.AttendanceHistoryResponse)
def get_attendance_history(
    limit: int = 50, 
    offset: int = 0, 
    degree: Optional[str] = None,
    semester: Optional[str] = None,
    module: Optional[str] = None,
    batch: Optional[str] = None,
    date: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Base query joining Records with Metadata
    query = db.query(
        models.AttendanceRecord,
        models.Student,
        models.ClassSession,
        models.Module
    ).join(
        models.Student, models.AttendanceRecord.student_id == models.Student.id
    ).join(
        models.ClassSession, models.AttendanceRecord.session_id == models.ClassSession.id
    ).outerjoin(
        models.Timetable, models.ClassSession.batch_id == cast(models.Timetable.id, String)
    ).outerjoin(
        models.Module, models.ClassSession.subject_id == models.Module.module_name
    )

    # Apply Filters
    if degree:
        query = query.filter(func.trim(models.Module.degree) == degree.strip())
    if semester:
        query = query.filter(func.trim(models.Module.level) == semester.strip())
    if module:
        query = query.filter(func.trim(models.Module.module_code) == module.strip())
    if batch:
        query = query.filter(func.trim(models.Timetable.batch_id) == batch.strip())
    if date:
        # Check date part of start_time
        query = query.filter(cast(models.ClassSession.start_time, String).like(f"{date}%"))
    if search:
        query = query.filter(
            models.Student.name.ilike(f"%{search}%") | 
            models.Student.index_number.ilike(f"%{search}%")
        )

    total = query.count()
    results = query.offset(offset).limit(limit).all()

    records_out = []
    tz_lk = timezone(timedelta(hours=5, minutes=30))
    for r, s, cs, m in results:
        # Get Time In / Time Out from logs for this specific session
        first_in = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.session_id == cs.id,
            models.AttendanceLog.student_id == s.id,
            models.AttendanceLog.status.in_(['entered', 'late', 'present'])
        ).order_by(models.AttendanceLog.timestamp.asc()).first()
        
        last_out = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.session_id == cs.id,
            models.AttendanceLog.student_id == s.id,
            models.AttendanceLog.status.in_(['exited'])
        ).order_by(models.AttendanceLog.timestamp.desc()).first()

        time_in_str = "--"
        if first_in:
            time_in_str = first_in.timestamp.replace(tzinfo=timezone.utc).astimezone(tz_lk).strftime("%I:%M %p")
            
        time_out_str = "--"
        if last_out:
            time_out_str = last_out.timestamp.replace(tzinfo=timezone.utc).astimezone(tz_lk).strftime("%I:%M %p")

        records_out.append({
            "id": r.id,
            "date": cs.start_time.strftime("%Y-%m-%d"),
            "studentName": s.name,
            "indexNumber": s.index_number,
            "subject": m.module_name if m else cs.subject_id,
            "module_code": m.module_code if m else None,
            "timeIn": time_in_str,
            "timeOut": time_out_str,
            "status": r.status,
            "photoUrl": s.profile_picture
        })

    return {"total": total, "records": records_out}


last_seen_times: dict = {}
blink_state: dict = {}
active_captures = {}
last_marked_time: dict = {}
COOLDOWN_SECONDS = 60

def generate_frames(cam_id: int, session_id: Optional[int] = None, mode: str = "entered"):
    print(f"[DEBUG] Starting stream. Known faces loaded: {len(global_known_encodings)}")
    
    if cam_id in active_captures:
        active_captures[cam_id].release()
        
    cap = cv2.VideoCapture(cam_id, cv2.CAP_DSHOW)
    if not cap.isOpened() and cam_id == 0:
        cap = cv2.VideoCapture(-1, cv2.CAP_DSHOW)
    
    if not cap.isOpened():
        print(f"[Video Feed] Warning: Camera {cam_id} unavailable.")
        return
        
    active_captures[cam_id] = cap
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye_tree_eyeglasses.xml')
    db = SessionLocal()
    
    # Fetch active session once for batch validation
    active_session = db.query(models.ClassSession).filter(models.ClassSession.id == session_id).first()

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.01)
                continue
                
            frame = np.ascontiguousarray(frame)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            now = time.time()
            
            results = []
            try:
                scale = 0.25
                small = cv2.resize(frame, (0,0), fx=scale, fy=scale)
                rgb_sm = np.ascontiguousarray(small[:, :, ::-1])
                locations = face_recognition.face_locations(rgb_sm)
                
                if len(locations) > 0:
                    encodings = face_recognition.face_encodings(rgb_sm, locations)
                    inv = 1.0/scale
                    for (top, right, bottom, left), enc in zip(locations, encodings):
                        name = "Unknown"
                        if len(global_known_encodings) > 0:
                            dists = face_recognition.face_distance(global_known_encodings, enc)
                            if len(dists) > 0:
                                best = np.argmin(dists)
                                if dists[best] <= FACE_MATCH_THRESHOLD:
                                    name = global_known_names[best]
                        results.append((int(left*inv), int(top*inv), int((right-left)*inv), int((bottom-top)*inv), name))
            except Exception as e:
                print(f"[FACE RECOGNITION ERROR]: {e}")
                
            detected_ids = set()
            for (x, y, w, h, name) in results:
                # Default appearance for identified but unverified faces
                color = (0, 165, 255) # Orange
                label = f"{name} - Blink!"
                
                if name == "Unknown":
                    # Unknown/Unregistered face path
                    color = (0, 255, 255) # Yellow
                    label = "Unknown"
                else:
                    detected_ids.add(name)
                    
                    # 1. Fetch Student Record to check Account Status / Enrollment
                    student_record = db.query(models.Student).filter(models.Student.index_number == name).first()
                    
                    # 2. Resolve the actual batch string (e.g., "23.2") from the Timetable entry
                    session_batch_str = "UNKNOWN"
                    if active_session:
                        tt_entry = db.query(models.Timetable).filter(models.Timetable.id == active_session.batch_id).first()
                        if tt_entry:
                            session_batch_str = str(tt_entry.batch_id).strip()
                        else:
                            # Fallback if batch_id was already a string (old system) or missing
                            session_batch_str = str(active_session.batch_id).strip()

                    student_intake = str(student_record.intake).strip() if student_record and student_record.intake else ""
                    
                    # 3. SECURITY GATE: Blocked/Inactive check OR Wrong Batch Validation
                    if student_record and not student_record.is_active:
                        color = (0, 0, 255) # Red for Blocked
                        label = f"{name} - BLOCKED!"
                        # Strict Block: By hitting this IF, we bypass the ELSE block where logging happens.

                    elif student_record and active_session and student_intake != session_batch_str:
                        color = (0, 165, 255) # Orange for Warning
                        label = f"{name} - Not Allowed!"
                        
                    else:
                        # 4. Normal Active Path - Liveness (Blink) Verification
                        if name not in blink_state: blink_state[name] = {'closed': 0, 'verified': False, 'time': 0}
                        state = blink_state[name]
                        if state['verified'] and (now - state['time'] > 10): state['verified'] = False
                        
                        if not state['verified']:
                            roi = gray[max(0,y):y+h, max(0,x):x+w]
                            if roi.shape[0] > 0 and roi.shape[1] > 0:
                                eyes = eye_cascade.detectMultiScale(roi[0:h//2, 0:w], 1.1, 5)
                                if len(eyes) == 0: state['closed'] += 1
                                else:
                                    if 2 <= state['closed'] <= 20:
                                        state['verified'] = True
                                        state['time'] = now
                                    state['closed'] = 0
                                    
                        if state['verified']:
                            color = (0, 255, 0) # Green for Verified Active Student
                            label = f"{name} ({mode.upper()})"
                            
                            # 4. Strict IN/OUT Logic & Debounce Execution
                            current_status = mode # "entered" or "exited"
                            current_time = time.time()
                            student_id = name
                            
                            if student_id not in last_marked_time:
                                last_marked_time[student_id] = {}
                                
                            should_log = False
                            if current_status not in last_marked_time[student_id]:
                                should_log = True
                            elif (current_time - last_marked_time[student_id][current_status]) >= COOLDOWN_SECONDS:
                                should_log = True

                            if should_log:
                                try:
                                    if student_record and session_id:
                                        latest_record = db.query(models.AttendanceLog).filter_by(
                                            session_id=session_id,
                                            student_id=student_record.id
                                        ).order_by(models.AttendanceLog.timestamp.desc()).first()

                                        latest_status = latest_record.status if latest_record else None
                                        
                                        if latest_status != current_status:
                                            new_log = models.AttendanceLog(
                                                student_id=student_record.id,
                                                session_id=session_id,
                                                timestamp=datetime.utcnow(),
                                                status=current_status
                                            )
                                            db.add(new_log)
                                            db.commit()
                                            last_marked_time[student_id][current_status] = current_time
                                            print(f"[DB] Logged {student_record.index_number} as {current_status}")
                                        else:
                                            # Just sync memory timer
                                            last_marked_time[student_id][current_status] = current_time
                                except Exception as e:
                                    print(f"[DB ERROR]: {e}")

                cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                cv2.putText(frame, label, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            for known_id in list(blink_state.keys()):
                if known_id not in detected_ids:
                    blink_state[known_id].update({'verified': False, 'closed': 0, 'time': 0})
            
            _, buffer = cv2.imencode('.jpg', frame)
            yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n'
    except Exception as e:
        print(f"[STREAM GENERATOR ERROR]: {e}")
    finally:
        cap.release()
        if cam_id in active_captures:
            del active_captures[cam_id]
        db.close()

@router.post("/start_session", response_model=schemas.SessionOut)
def start_session(data: schemas.SessionCreate, db: Session = Depends(get_db)):
    session_model = models.ClassSession(
        lecturer_id=data.lecturer_id, subject_id=data.subject_id, batch_id=data.batch_id,
        session_type=data.session_type, location=data.location, status="Active"
    )
    return crud.create_session(db, session_model)

def calculate_final_attendance(session_id: int, db: Session):
    """
    Runs when a session ends. Calculates total duration for each student
    and assigns final status (Present, Absent, Flagged).
    """
    # 1. Fetch Session Data
    session = db.query(models.ClassSession).filter(models.ClassSession.id == session_id).first()
    if not session:
        return
    
    # If session is still active, we take current time as end_time for calculation
    end_t = session.end_time or datetime.utcnow()
    total_scheduled_minutes = (end_t - session.start_time).total_seconds() / 60
    
    # Required threshold (75%)
    required_minutes = total_scheduled_minutes * 0.75
    
    # 2. Fetch All Logs for this Session
    logs_all = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.session_id == session_id
    ).order_by(models.AttendanceLog.timestamp.asc()).all()
    
    # 3. Get all enrolled students for this subject
    enrolled_rows = db.query(models.Enrollment.student_id).filter(
        models.Enrollment.class_id == session.subject_id
    ).distinct().all()
    enrolled_ids = [r[0] for r in enrolled_rows]
    
    # Also include students who have logs but might not be 'enrolled' in the strict sense (guest/manual)
    log_student_ids = list(set(log.student_id for log in logs_all))
    all_student_ids = list(set(enrolled_ids + log_student_ids))

    for student_id in all_student_ids:
        s_logs = [l for l in logs_all if l.student_id == student_id]
        
        total_duration = 0
        last_in_time = None
        is_flagged = False
        
        # Strict Hall-Time Accumulation (The Washroom Rule)
        total_duration_mins = 0.0
        current_in_time = None
        
        for log in s_logs:
            status = log.status.lower()
            # If student enters and we don't have an active 'IN' record
            if status in ['entered', 'in', 'late', 'present'] and current_in_time is None:
                current_in_time = log.timestamp
            # If student exits and we HAVE an active 'IN' record
            elif status in ['exited', 'out', 'absent'] and current_in_time is not None:
                chunk_duration = (log.timestamp - current_in_time).total_seconds() / 60
                total_duration_mins += chunk_duration
                current_in_time = None
            # Handle duplicates/consecutive entered or exited by doing nothing (already handled by None checks)

        # Handle Missing OUT (Penalty/Flagging)
        if current_in_time is not None:
            # They never clocked out. We assume they stayed until session end or current time
            is_flagged = True
            final_chunk = (end_t - current_in_time).total_seconds() / 60
            total_duration_mins += final_chunk
            
        total_duration = total_duration_mins
            
        # Final Status Assignment
        if is_flagged:
            final_status = 'Flagged'
        elif total_duration >= required_minutes:
            final_status = 'Present'
        elif total_duration > 0:
            final_status = 'Insufficient Time'
        else:
            final_status = 'Absent'
            
        # 6. Database Update (Update or Create)
        record = db.query(models.AttendanceRecord).filter_by(
            student_id=student_id, session_id=session_id
        ).first()
        
        if record:
            record.total_duration_minutes = int(total_duration)
            record.status = final_status
            record.calculated_at = datetime.utcnow()
        else:
            new_record = models.AttendanceRecord(
                student_id=student_id,
                session_id=session_id,
                total_duration_minutes=int(total_duration),
                status=final_status
            )
            db.add(new_record)
            
    db.commit()

@router.post("/end_session/{session_id}")
def end_session_endpoint(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.ClassSession).filter(models.ClassSession.id == session_id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    
    session.status = 'Closed'
    session.end_time = datetime.utcnow()
    db.commit()
    
    # Trigger final calculation
    try:
        calculate_final_attendance(session_id, db)
    except Exception as e:
        print(f"[Attendance Calculation Error]: {e}")
        # We don't fail the whole request if calculation fails
        
    return {"message": "Session closed and attendance calculated", "session_id": session_id}

@router.get("/video_feed/in")
def video_feed_in(session_id: Optional[int] = None, cam_id: int = 0):
    return StreamingResponse(generate_frames(cam_id, session_id, mode="entered"), media_type="multipart/x-mixed-replace; boundary=frame")

@router.get("/video_feed/out")
def video_feed_out(session_id: Optional[int] = None, cam_id: int = 0):
    return StreamingResponse(generate_frames(cam_id, session_id, mode="exited"), media_type="multipart/x-mixed-replace; boundary=frame")

@router.post("/stop_cameras")
def stop_cameras():
    for cap in list(active_captures.values()): cap.release()
    active_captures.clear()
    return {"message": "Stopped"}
    
@router.get("/live_logs/{session_id}")
def get_live_logs(session_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.session_id == session_id
    ).order_by(models.AttendanceLog.timestamp.desc()).limit(50).all()
    
    res = []
    for log in logs:
        res.append({
            "name": log.student.name if log.student else "Unknown",
            "index_number": log.student.index_number if log.student else "Unknown",
            "status": log.status,
            "timestamp": log.timestamp.strftime("%I:%M %p")
        })
    return res

@router.get("/session_stats/{session_id}")
def get_session_stats(session_id: int, db: Session = Depends(get_db)):
    # 1. Fetch session object to resolve the target batch
    session_obj = db.query(models.ClassSession).filter(models.ClassSession.id == session_id).first()
    if not session_obj:
        return {"currently_inside": 0, "left_early": 0, "total_entered": 0}

    # Resolve actual batch ID (handle Timetable pointers)
    tt_record = db.query(models.Timetable).filter(models.Timetable.id == session_obj.batch_id).first()
    target_batch = str(tt_record.batch_id).strip() if tt_record else str(session_obj.batch_id).strip()

    # 2. Fetch logs ONLY for students legitimately in the correct batch
    logs = db.query(models.AttendanceLog).join(
        models.Student, models.AttendanceLog.student_id == models.Student.id
    ).filter(
        models.AttendanceLog.session_id == session_id,
        models.Student.intake == target_batch
    ).order_by(models.AttendanceLog.timestamp.asc()).all()

    # 3. This dictionary will naturally keep ONLY the absolute LATEST status of each unique student
    latest_status_map = {}
    for log in logs:
        # Use lowercase for robust comparison with DB storage
        status = log.status.lower() if log.status else ""
        latest_status_map[log.student_id] = status
        
    currently_inside = sum(1 for status in latest_status_map.values() if status == "entered")
    total_exited = sum(1 for status in latest_status_map.values() if status == "exited")

    # 4. Total unique students who showed up at least once
    total_unique_entered = len(latest_status_map)

    return {
        "currently_inside": currently_inside,
        "left_early": total_exited, # This maps to 'Total Exited' in frontend
        "total_entered": total_unique_entered
    }
@router.post("/manual")
def mark_manual_attendance(payload: schemas.ManualAttendanceSchema, db: Session = Depends(get_db)):
    """Manually mark attendance with automatic session ID resolution (Timetable vs ClassSession)."""
    # 1. Standardize the index (Case insensitive)
    student_index = payload.student_index.strip().upper()
    
    # 2. Verify Student Exists
    student = db.query(models.Student).filter(models.Student.index_number == student_index).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student with index {student_index} not found.")

    # NEW: Check if the student's account is active
    if not student.is_active:
        raise HTTPException(
            status_code=403, 
            detail=f"Account for {student_index} is currently blocked/inactive."
        )

    # 3. Resolve the correct Class Session ID
    # The frontend might send a timetable_id instead of a class_session_id.
    active_session = db.query(models.ClassSession).filter(models.ClassSession.id == payload.session_id).first()
    
    if not active_session:
        # If not found, look up the timetable entry and find the corresponding active session
        tt_entry = db.query(models.Timetable).filter(models.Timetable.id == payload.session_id).first()
        if tt_entry:
            # Find the most recently created class_session for this specific module/subject
            active_session = db.query(models.ClassSession).filter(
                models.ClassSession.subject_id == tt_entry.module_name
            ).order_by(models.ClassSession.id.desc()).first()

    if not active_session:
        raise HTTPException(status_code=404, detail="Active class session not found. Please ensure the 'Start Session' button was clicked.")

    # NEW: Validate Batch Match for Manual Override (Block "Not Allowed" students)
    # 1. Resolve actual batch from Timetable using the session's batch_id (pointer)
    tt_record = db.query(models.Timetable).filter(models.Timetable.id == active_session.batch_id).first()
    session_batch_val = str(tt_record.batch_id).strip() if tt_record else str(active_session.batch_id).strip()
    student_intake_val = str(student.intake).strip()

    if session_batch_val and student_intake_val != session_batch_val:
        raise HTTPException(
            status_code=403, 
            detail=f"Not Allowed: Student {student_index} belongs to intake {student_intake_val}, but this is a session for {session_batch_val}."
        )

    # 4. Fetch the last attendance log for Sequence Validation
    last_record = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.session_id == active_session.id,
        models.AttendanceLog.student_id == student.id
    ).order_by(models.AttendanceLog.timestamp.desc()).first()

    # Normalize internal status for sequence check
    # Map 'entered' -> 'IN', 'exited' -> 'OUT' for comparison if necessary
    def _normalize(s):
        if not s: return "OUT"
        s = s.upper()
        if s == "ENTERED": return "IN"
        if s == "EXITED": return "OUT"
        return s

    current_status = _normalize(last_record.status) if last_record else "OUT"
    requested_status = payload.action_type.strip().upper() # "IN" or "OUT"

    # 5. Sequence Validation
    if requested_status == "IN" and current_status == "IN":
        raise HTTPException(status_code=400, detail=f"{student_index} is already marked IN. Please mark OUT first.")
    elif requested_status == "OUT" and current_status == "OUT":
        raise HTTPException(status_code=400, detail=f"Cannot mark OUT. {student_index} is not currently IN.")
    
    if requested_status not in ["IN", "OUT"]:
        raise HTTPException(status_code=400, detail="Invalid action type. Must be 'IN' or 'OUT'.")

    # 6. Save the new record
    # Mapping back to internal status for consistency with biometric logs
    db_status = "entered" if requested_status == "IN" else "exited"
    new_log = models.AttendanceLog(
        session_id=active_session.id,
        student_id=student.id,
        status=db_status,
        timestamp=datetime.utcnow(),
        remarks="Admin/Manual"
    )
    db.add(new_log)
    db.commit()
    
    return {
        "success": True,
        "message": f"Successfully marked {requested_status} for {student_index}",
        "log_id": new_log.id
    }

@router.get("/session_summary/{session_id}")
def get_session_summary(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.ClassSession).filter(models.ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Get all enrolled students for this subject
    # We use the batch_id from Timetable to ensure we get the right students
    tt_record = db.query(models.Timetable).filter(models.Timetable.id == session.batch_id).first()
    batch_str = tt_record.batch_id if tt_record else session.batch_id
    
    # Actually, the enrollment system uses class_id (module_code)
    enrolled_rows = db.query(models.Enrollment.student_id).filter(
        models.Enrollment.class_id == session.subject_id
    ).distinct().all()
    enrolled_student_ids = [r[0] for r in enrolled_rows]
    
    # Get all logs for this session
    logs = db.query(models.AttendanceLog).filter(
        models.AttendanceLog.session_id == session_id
    ).all()
    attendance_map = {}
    for log in logs:
        if log.status == 'entered':
            attendance_map[log.student_id] = 'present'
        elif log.status == 'late':
            attendance_map[log.student_id] = 'late'
    
    students_data = []
    for sid in enrolled_student_ids:
        student = db.query(models.Student).filter(models.Student.id == sid).first()
        if not student: continue
        
        # Filter by intake if it's a batch-specific session
        if tt_record and student.intake != tt_record.batch_id:
            continue

        # Map student_id to their status from AttendanceRecord if finalized
        record = db.query(models.AttendanceRecord).filter_by(
            student_id=sid, session_id=session_id
        ).first()
        
        status = record.status if record else attendance_map.get(sid, 'absent')
        reason = record.reason if record else None

        # Get logs for times
        s_logs = [l for l in logs if l.student_id == sid]
        in_log = next((l for l in s_logs if l.status in ['entered', 'Present']), None)
        out_log = next(reversed([l for l in s_logs if l.status == 'exited']), None)

        students_data.append({
            "id": student.id,
            "name": student.name,
            "indexNumber": student.index_number,
            "avatar": student.profile_picture or "https://via.placeholder.com/150",
            "status": status,
            "reason": reason,
            "in_time": in_log.timestamp.strftime("%I:%M %p") if in_log else None,
            "out_time": out_log.timestamp.strftime("%I:%M %p") if out_log else None
        })
        
    return students_data

class AttendanceOverride(BaseModel):
    student_id: int
    status: str

class BulkAttendanceSave(BaseModel):
    session_id: int
    overrides: List[AttendanceOverride]

@router.post("/bulk_save")
def bulk_save_attendance(payload: BulkAttendanceSave, db: Session = Depends(get_db)):
    session = db.query(models.ClassSession).filter(models.ClassSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    for override in payload.overrides:
        # Remove existing logs for this student in this session
        db.query(models.AttendanceLog).filter(
            models.AttendanceLog.session_id == payload.session_id,
            models.AttendanceLog.student_id == override.student_id
        ).delete()
        
        if override.status in ['present', 'late']:
            new_log = models.AttendanceLog(
                session_id=payload.session_id,
                student_id=override.student_id,
                status='entered' if override.status == 'present' else 'late',
                timestamp=datetime.now(),
                remarks="Manual Finalization"
            )
            db.add(new_log)
            
    db.commit()
    return {"message": "Attendance finalized successfully"}

@router.get("/review/{session_id}")
def get_session_review(session_id: int, db: Session = Depends(get_db)):
    """Fetch calculated attendance records for the review page."""
    # 1. Join ClassSession with Timetable (batch_id stores timetable.id)
    query = db.query(
        models.ClassSession,
        models.Timetable,
        models.Module
    ).join(
        models.Timetable, models.ClassSession.batch_id == cast(models.Timetable.id, String)
    ).outerjoin(
        models.Module, models.Timetable.module_code == models.Module.module_code
    ).filter(models.ClassSession.id == session_id).first()

    if not query:
        # Fallback if the join fails (e.g. legacy data)
        session = db.query(models.ClassSession).filter(models.ClassSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Minimal info if no timetable match
        timetable = None
        module = None
    else:
        session, timetable, module = query

    # 2. Outer Join Students with AttendanceRecords to include absent students
    target_batch = timetable.batch_id if timetable else session.batch_id
    
    results = db.query(
        models.Student,
        models.AttendanceRecord
    ).outerjoin(
        models.AttendanceRecord,
        and_(
            models.Student.id == models.AttendanceRecord.student_id,
            models.AttendanceRecord.session_id == session_id
        )
    ).filter(
        func.trim(models.Student.intake) == func.trim(target_batch)
    ).all()
    
    res = []
    for student, record in results:
        # Fetch logs for precise time tracking
        first_in = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.session_id == session_id,
            models.AttendanceLog.student_id == student.id,
            models.AttendanceLog.status.ilike("%in%") | models.AttendanceLog.status.in_(['entered', 'late', 'present'])
        ).order_by(models.AttendanceLog.timestamp.asc()).first()
        
        last_out = db.query(models.AttendanceLog).filter(
            models.AttendanceLog.session_id == session_id,
            models.AttendanceLog.student_id == student.id,
            models.AttendanceLog.status.ilike("%out%") | models.AttendanceLog.status.in_(['exited'])
        ).order_by(models.AttendanceLog.timestamp.desc()).first()
        
        time_in_str = first_in.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if first_in else None
        time_out_str = last_out.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ") if last_out else None

        res.append({
            "student_id": student.id,
            "name": student.name,
            "indexNumber": student.index_number,
            "avatar": student.profile_picture,
            "timeIn": time_in_str,
            "timeOut": time_out_str,
            "duration": record.total_duration_minutes if record else 0,
            "status": record.status if record else "Absent"
        })
        
    # Calculate total scheduled minutes from timetable
    total_session_minutes = 120 # Default
    if timetable:
        try:
            t1 = datetime.strptime(timetable.start_time, "%I:%M %p")
            t2 = datetime.strptime(timetable.end_time, "%I:%M %p")
            total_session_minutes = int((t2 - t1).total_seconds() / 60)
        except:
            pass

    return {
        "module_code": timetable.module_code if timetable else session.subject_id,
        "module_name": module.module_name if module else (timetable.module_name if timetable else session.subject_id),
        "batch": timetable.batch_id if timetable else session.batch_id,
        "semester": module.level if (module and module.level) else (timetable.semester if timetable else "N/A"),
        "date": session.start_time.strftime("%Y-%m-%d"),
        "location": session.location,
        "scheduled_time": f"{timetable.start_time} - {timetable.end_time}" if timetable else f"{session.start_time.strftime('%I:%M %p')} - —",
        "total_session_minutes": total_session_minutes,
        "session_type": session.session_type,
        "records": res
    }

class FinalizeRecord(BaseModel):
    student_id: int
    status: str
    reason: Optional[str] = None

class FinalizePayload(BaseModel):
    session_id: int
    records: List[FinalizeRecord]

@router.post("/finalize")
def finalize_attendance(payload: FinalizePayload, db: Session = Depends(get_db)):
    """Save the final verified attendance records."""
    session = db.query(models.ClassSession).filter(models.ClassSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    for item in payload.records:
        record = db.query(models.AttendanceRecord).filter_by(
            student_id=item.student_id, session_id=payload.session_id
        ).first()
        
        if record:
            record.status = item.status
            if item.reason is not None:
                record.reason = item.reason
            record.calculated_at = datetime.utcnow()
        else:
            # Should not happen if calculation ran, but handle for safety
            new_record = models.AttendanceRecord(
                student_id=item.student_id,
                session_id=payload.session_id,
                total_duration_minutes=0,
                status=item.status,
                reason=item.reason
            )
            db.add(new_record)
            
    # Mark session as fully completed/verified if needed
    session.status = "Completed"
    db.commit()
    return {"message": "Attendance records finalized successfully"}

@router.post("/manual-override")
def manual_override_attendance(payload: schemas.ManualOverridePayload, db: Session = Depends(get_db)):
    """Batch update or insert manual attendance overrides."""
    for item in payload.records:
        record = db.query(models.AttendanceRecord).filter_by(
            student_id=item.student_id, session_id=item.session_id
        ).first()
        
        if record:
            record.status = item.status
            record.reason = item.reason
            # Optional: marking_status = 'Manual Override' if you add that column
            record.calculated_at = datetime.utcnow()
        else:
            # UPSERT: If record doesn't exist (e.g. late enrollment)
            new_record = models.AttendanceRecord(
                student_id=item.student_id,
                session_id=item.session_id,
                total_duration_minutes=0, # Manual entries usually don't have log minutes
                status=item.status,
                reason=item.reason
            )
            db.add(new_record)
            
    db.commit()
    return {"message": f"Successfully updated {len(payload.records)} records."}

@router.get("/sessions")
def get_attendance_sessions(
    module_code: str,
    batch_id: str,
    db: Session = Depends(get_db)
):
    """Fetch all sessions for a specific module and batch."""
    sessions = db.query(models.ClassSession).join(
        models.Module, models.ClassSession.subject_id.ilike(func.concat('%', models.Module.module_name, '%'))
    ).join(
        models.Timetable, models.ClassSession.batch_id == cast(models.Timetable.id, String)
    ).filter(
        models.Module.module_code == module_code,
        models.Timetable.batch_id == batch_id
    ).order_by(models.ClassSession.start_time.asc()).all()

    result = []
    for idx, s in enumerate(sessions):
        date_str = s.start_time.strftime("%Y-%m-%d") if s.start_time else ""
        result.append({
            "session_id": s.id,
            "session_name": f"Session {idx + 1}",
            "session_type": s.session_type,
            "date": date_str
        })
    return {"sessions": result}

# Student Correction Requests 

from auth import get_current_user

import shutil
import uuid
import os

# Create uploads directory if it doesn't exist
os.makedirs("uploads/evidence", exist_ok=True)

@router.post("/student/requests", response_model=schemas.CorrectionRequestResponse)
async def submit_correction_request(
    session_id: int = Form(...),
    reason_type: str = Form(...),
    description: str = Form(...),
    evidence: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Allows a student to submit a correction request with optional evidence file."""
    if current_user.role != "Student":
        raise HTTPException(status_code=403, detail="Only students can submit correction requests")
        
    student = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found for this user account")

    evidence_url = None
    if evidence:
        # Generate a unique filename to prevent overwrites
        file_extension = evidence.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"uploads/evidence/{unique_filename}"
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(evidence.file, buffer)
        
        # Store the accessible URL
        evidence_url = f"/uploads/evidence/{unique_filename}"
        
    new_request = models.CorrectionRequest(
        student_id=student.index_number,
        session_id=session_id,
        reason_type=reason_type,
        description=description,
        evidence_url=evidence_url
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

@router.get("/lecturer/requests", response_model=List[schemas.SubjectRequestsSummary])
def get_correction_requests_grouped(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Allows a lecturer to view correction requests grouped by subject/batch."""
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can view correction requests")
        
    # 1. Join CorrectionRequest -> Timetable (using session_id) -> Module
    results = db.query(
        models.CorrectionRequest,
        models.Timetable, 
        models.Module     
    ).outerjoin(
        models.Timetable, models.CorrectionRequest.session_id == models.Timetable.id
    ).outerjoin(
        models.Module, models.Timetable.module_code == models.Module.module_code
    ).order_by(models.CorrectionRequest.submitted_at.desc()).all()

    # 2. Grouping Logic
    grouped_data = {}
    
    for req, timetable, module in results:
        # Extract data safely from joined tables
        mod_code = getattr(timetable, 'module_code', 'UNKNOWN')
        batch = getattr(timetable, 'batch_id', 'Unknown Batch')
        
        mod_name = getattr(module, 'module_name', 'Unknown Subject')
        degree = getattr(module, 'degree', '')
        
        # Safely try to get 'semester', if it fails, try 'level'. 
        raw_semester = getattr(module, 'semester', None)
        if not raw_semester:
             raw_level = getattr(module, 'level', '')
             semester_val = f"Level {raw_level}" if raw_level else ""
        else:
             semester_val = f"Semester {raw_semester}" if str(raw_semester).isdigit() else str(raw_semester)
        
        group_key = f"{mod_code}_{batch}"
        
        if group_key not in grouped_data:
            grouped_data[group_key] = {
                "subject_id": mod_code, 
                "subject_code": mod_code,
                "subject_name": mod_name,
                "batch": str(batch),
                "degree": str(degree),
                "semester": semester_val,
                "pending_count": 0,
                "requests": []
            }
        
        if req.status == "Pending":
            grouped_data[group_key]["pending_count"] += 1
            
        grouped_data[group_key]["requests"].append(req)

    return list(grouped_data.values())

@router.put("/lecturer/requests/{request_id}/status")
def update_request_status(
    request_id: int, 
    payload: schemas.CorrectionRequestUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Lecturer approves or rejects a request. If approved, the master AttendanceRecord is updated."""
    if current_user.role != "Lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can update request status")
        
    req = db.query(models.CorrectionRequest).filter(models.CorrectionRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if payload.status not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    req.status = payload.status
    
    # Save the rejection reason if provided
    if payload.status == "Rejected" and payload.rejection_reason:
        req.rejection_reason = payload.rejection_reason
    elif payload.status == "Approved":
        req.rejection_reason = None # Clear if it was previously rejected and now approved

    # If approved, update the master attendance record
    if payload.status == "Approved":
        # 1. MAPPING FIX: Find the correct class_session.id
        # req.session_id in correction_requests refers to the Timetable entry ID.
        # Based on the system architecture, ClassSession.batch_id stores this Timetable ID as a string.
        actual_class_session = db.query(models.ClassSession).filter(
            models.ClassSession.batch_id == str(req.session_id)
        ).first()

        if actual_class_session:
            # 2. Find the student's internal integer ID
            student = db.query(models.Student).filter(
                models.Student.index_number == req.student_id
            ).first()

            if student:
                # 3. Check if an attendance record already exists for this exact class session
                existing_att = db.query(models.AttendanceRecord).filter(
                    models.AttendanceRecord.student_id == student.id,
                    models.AttendanceRecord.session_id == actual_class_session.id
                ).first()

                if existing_att:
                    # Update existing record (e.g. from Absent to Present)
                    existing_att.status = "Present"
                    existing_att.reason = f"Excused: {req.reason_type}"
                    existing_att.calculated_at = datetime.now()
                else:
                    # Create new attendance record using the correctly mapped actual_class_session.id
                    new_att = models.AttendanceRecord(
                        student_id=student.id,
                        session_id=actual_class_session.id, # <-- Correctly mapped ID
                        total_duration_minutes=0,
                        status="Present",
                        reason=f"Excused: {req.reason_type}"
                    )
                    db.add(new_att)
            else:
                 raise HTTPException(status_code=404, detail="Student record not found for this request")
        else:
            print(f"DEBUG: No class_session found matching timetable ID {req.session_id}")
            # We don't raise 404 here yet as there might be orphan requests during testing, 
            # but in production, this should ideally be handled.

    try:
        db.commit()
        return {"message": f"Request {payload.status.lower()} successfully"}
    except Exception as e:
        db.rollback()
        print(f"DATABASE ERROR during request approval: {e}")
        raise HTTPException(status_code=500, detail="Failed to update database records")

@router.get("/student/requests", response_model=List[schemas.CorrectionRequestResponse])
def get_student_correction_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Allows a student to view their own correction requests."""
    if current_user.role != "Student":
        raise HTTPException(status_code=403, detail="Only students can view their requests here")
        
    student = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
        
    return db.query(models.CorrectionRequest).filter(
        models.CorrectionRequest.student_id == student.index_number
    ).order_by(models.CorrectionRequest.submitted_at.desc()).all()

@router.delete("/student/requests/{request_id}")
def delete_correction_request(
    request_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Allows a student to delete their own pending correction request."""
    if current_user.role != "Student":
        raise HTTPException(status_code=403, detail="Only students can delete their requests")
        
    student = db.query(models.Student).filter(models.Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    req = db.query(models.CorrectionRequest).filter(
        models.CorrectionRequest.id == request_id,
        models.CorrectionRequest.student_id == student.index_number
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found or you don't have permission to delete it")
    
    if req.status != "Pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be deleted")

    # Delete the physical file if evidence_url exists
    if req.evidence_url:
        file_path = req.evidence_url.lstrip("/") # Remove leading slash
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Failed to delete file: {e}")

    db.delete(req)
    db.commit()
    return {"message": "Request deleted successfully"}
