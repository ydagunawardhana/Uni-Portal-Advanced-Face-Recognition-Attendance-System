"""
routers/attendance.py
──────────────────────
All routes under /api/attendance.
"""

from __future__ import annotations

from datetime import datetime, date
from typing import Optional

import cv2
import numpy as np

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

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
    limit: int = 50, offset: int = 0, student_id: Optional[int] = None,
    date: Optional[str] = None, db: Session = Depends(get_db)
):
    total, records = crud.get_attendance_history(db, limit=limit, offset=offset, student_id=student_id, date=date)
    return schemas.AttendanceHistoryResponse(total=total, records=records)


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
                color = (0, 255, 255)
                label = name
                if name != "Unknown":
                    detected_ids.add(name)
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
                        color = (0, 255, 0)
                        label = f"{name} (Verified)"
                        
                        # Strict IN/OUT Logic & Debounce Execution
                        current_status = mode # "entered" or "exited"
                        current_time = time.time()
                        student_id = name
                        
                        # 1. Debounce check based on Time Dictionary (prevent spam)
                        if student_id not in last_marked_time:
                            last_marked_time[student_id] = {}
                            
                        # If the student was recently marked for this specific status, skip
                        if current_status in last_marked_time[student_id]:
                            if (current_time - last_marked_time[student_id][current_status]) < COOLDOWN_SECONDS:
                                pass # Skip entirely, they were just marked
                            else:
                                should_log = True
                        else:
                            should_log = True

                        # 2. Strike DB only if perfectly verified and past cooldown
                        if 'should_log' in locals() and should_log:
                            try:
                                student = db.query(models.Student).filter(models.Student.index_number == name).first()
                                if student and session_id:
                                    # 1. Fetch ONLY the most recent log for this student in this session
                                    latest_record = db.query(models.AttendanceLog).filter_by(
                                        session_id=session_id,
                                        student_id=student.id
                                    ).order_by(models.AttendanceLog.timestamp.desc()).first()

                                    # 2. Block ONLY if the consecutive status is exactly the same
                                    latest_status = latest_record.status if latest_record else None
                                    
                                    if latest_status == current_status:
                                        last_marked_time[student_id][current_status] = current_time # Re-sync memory quietly
                                    else:
                                        # 3. Normal Insertion (Safe)
                                        new_log = models.AttendanceLog(
                                            student_id=student.id,
                                            session_id=session_id,
                                            timestamp=datetime.utcnow(),
                                            status=current_status
                                        )
                                        db.add(new_log)
                                        db.commit()
                                        
                                        # Update Cooldown Timer instantly
                                        last_marked_time[student_id][current_status] = current_time
                                        print(f"[DB] Logged {student.index_number} as {current_status}")
                            except Exception as e:
                                print(f"[DB ERROR]: {e}")
                            
                            # Clean up the variable for the next loop
                            del should_log
                    else:
                        color = (0, 165, 255)
                        label = f"{name} - Blink!"

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

@router.post("/end_session/{session_id}")
def end_session_endpoint(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.ClassSession).filter(models.ClassSession.id == session_id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    session.status = 'Closed'
    session.end_time = datetime.utcnow()
    db.commit()
    return {"message": "Session closed", "session_id": session_id}

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
    entered_count = db.query(models.AttendanceLog.student_id).filter(
        models.AttendanceLog.session_id == session_id, 
        models.AttendanceLog.status == "entered"
    ).distinct().count()
    
    exited_count = db.query(models.AttendanceLog.student_id).filter(
        models.AttendanceLog.session_id == session_id, 
        models.AttendanceLog.status == "exited"
    ).distinct().count()
    
    return {
        "total_entered": entered_count,
        "left_early": exited_count,
        "currently_inside": entered_count - exited_count
    }
@router.post("/manual-override")
def manual_override_attendance(
    data: schemas.ManualOverride,
    db: Session = Depends(get_db)
):
    """Manually mark a student as present for a given session by index number."""
    # Look up student by index number
    student = db.query(models.Student).filter(models.Student.index_number == data.student_index).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student with index {data.student_index} not found.")

    # Check if session exists
    session = db.query(models.ClassSession).filter(models.ClassSession.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Create AttendanceLog entry
    new_log = models.AttendanceLog(
        student_id=student.id,
        session_id=data.session_id,
        timestamp=datetime.utcnow(),
        status="Present",  # Categorized as Present for manual marking
        remarks="Admin/Manual"
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return {
        "success": True, 
        "message": f"Successfully marked {student.name} ({student.index_number}) as present.",
        "log_id": new_log.id
    }
