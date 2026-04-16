"""
routers/attendance.py
──────────────────────
All routes under /api/attendance.

POST /api/attendance
    Accepts a JPEG/PNG frame uploaded as multipart form data.
    Runs face detection + recognition, logs known identities to the DB,
    and returns a structured JSON response.

GET  /api/attendance/history
    Returns paginated attendance logs with optional filters.

GET  /api/attendance/today
    Returns all logs recorded today (server local date).
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
    FaceResult, recognize_faces, annotate_frame, 
    CASCADE_PATH, TRAINER_PATH, _load_recognizer
)
from fastapi.responses import StreamingResponse
import base64
import time

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


#  Helpers 

def _decode_image(raw: bytes) -> np.ndarray:
    """Decode raw bytes (JPEG / PNG / BMP / WebP) into a BGR NumPy array."""
    arr = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not decode the uploaded image. "
                "Ensure it is a valid JPEG, PNG, BMP, or WebP file."
            ),
        )
    return frame



#  POST /api/attendance 

@router.post(
    "",
    response_model=schemas.AttendanceResponse,
    summary="Process a frame and log attendance",
    status_code=status.HTTP_200_OK,
)
async def process_attendance_frame(
    file:         UploadFile = File(...,  description="Camera frame (JPEG / PNG / WebP)"),
    debounce_min: int        = Form(1,   description="Debounce window in minutes (default 1)"),
    db:           Session    = Depends(get_db),
):
    """
    **Main attendance endpoint.**

    1. Accepts a single camera frame uploaded as `multipart/form-data`.
    2. Runs Haar Cascade face detection on the frame.
    3. Runs LBPH face recognition on each detected face.
    4. For every *known* face:
       - Auto-creates the Student record if it does not exist yet.
       - Determines the correct status (`entered` / `exited`).
       - Writes an `AttendanceLog` (skipped if a log already exists within
         `debounce_min` minutes to prevent flooding from video streams).
    5. Returns detection metadata **and** the DB log entries.

    ### How to call from JavaScript / React
    ```js
    const form = new FormData();
    form.append("file", blob, "frame.jpg");   // blob from canvas.toBlob()
    const res = await fetch("/api/attendance", { method: "POST", body: form });
    const data = await res.json();
    ```
    """
    raw   = await file.read()
    frame = _decode_image(raw)

    #  Face detection + recognition 
    face_results: list[FaceResult] = recognize_faces(frame)

    logs_created: list = []
    detection_out: list[schemas.FaceDetectionResult] = []

    for result in face_results:
        detection_out.append(
            schemas.FaceDetectionResult(
                label      = result.label,
                user_id    = result.user_id,
                confidence = round(result.confidence, 2),
                is_known   = result.is_known,
                bbox       = result.bbox,
            )
        )

        if not result.is_known:
            continue  

        # Fetch the student from the database to ensure they are fully registered
        student = db.query(models.Student).filter(models.Student.id == result.user_id).first()
        if not student:
            result.is_known = False
            result.label = "Unknown"
            # Update the detection out object since we just invalidated it
            detection_out[-1].is_known = False
            detection_out[-1].label = "Unknown"
            continue

        result.label = student.name
        detection_out[-1].label = student.name

        #  Write to DB (with debounce) 
        log_entry, created = crud.log_attendance_for_recognised_face(
            db           = db,
            student_id   = student.id,
            debounce_min = debounce_min,
        )
        
        # Populate relationship for fast-path JSON serialization back to frontend
        log_entry.student = student

        logs_created.append(log_entry)

        status_word = "logged" if created else "skipped (debounce)"
        print(
            f"[Attendance]  {student.name:<30} "
            f"conf={result.confidence:.1f}  "
            f"→ {log_entry.status:<8}  {status_word}"
        )

    # Encode annotated frame to Base64
    annotated_img = annotate_frame(frame, face_results)
    _, buffer = cv2.imencode('.jpg', annotated_img)
    base64_str = base64.b64encode(buffer).decode('utf-8')
    base64_frame = f"data:image/jpeg;base64,{base64_str}"

    known_count = sum(1 for r in face_results if r.is_known)

    return schemas.AttendanceResponse(
        message          = (
            f"{len(face_results)} face(s) detected, "
            f"{known_count} recognised."
        ),
        faces_detected   = len(face_results),
        faces_recognised = known_count,
        results          = detection_out,
        logs             = logs_created,
        timestamp        = datetime.utcnow().isoformat() + "Z",
        annotated_frame_base64 = base64_frame,
    )


#  GET /api/attendance/history 

@router.get(
    "/history",
    response_model=schemas.AttendanceHistoryResponse,
    summary="Paginated attendance history with optional filters",
)
def get_attendance_history(
    limit:      int            = 50,
    offset:     int            = 0,
    student_id: Optional[int]  = None,
    date:       Optional[str]  = None,   # "YYYY-MM-DD"
    db:         Session        = Depends(get_db),
):
    """
    Returns paginated attendance logs.

    - **limit** / **offset** — pagination controls  
    - **student_id** — filter to a single student  
    - **date** — filter to a specific day (`YYYY-MM-DD`)
    """
    total, records = crud.get_attendance_history(
        db, limit=limit, offset=offset,
        student_id=student_id, date=date,
    )
    return schemas.AttendanceHistoryResponse(total=total, records=records)


#  GET /api/attendance/today 

@router.get(
    "/today",
    response_model=schemas.AttendanceHistoryResponse,
    summary="All attendance records for today",
)
def get_today_attendance(db: Session = Depends(get_db)):
    """Returns every attendance log recorded on the server's current calendar date."""
    today_str = date.today().strftime("%Y-%m-%d")
    total, records = crud.get_attendance_history(db, limit=1000, date=today_str)
    return schemas.AttendanceHistoryResponse(total=total, records=records)


#  Simultaneous Video Stream Endpoints & State Manager

active_cameras = {}
last_seen_times = {}

def generate_frames(cam_id: int, current_class_id: str = None):
    """
    Independently polls the specific hardware ID (0, 1, 2) utilizing OpenCV.
    Seamlessly processes LBPH recognition and streams the annotated MJPEG output securely to the UI.
    """
    # Ensure any existing camera on this ID is released first
    if cam_id in active_cameras:
        if active_cameras[cam_id] is not None:
            active_cameras[cam_id].release()
            
    cap = cv2.VideoCapture(cam_id)
    active_cameras[cam_id] = cap
    
    if not cap.isOpened():
        print(f"[Video Feed] Error: Could not open hardware camera index {cam_id}")
        return

    # Create isolated ML instances specifically for this hardware stream
    local_cascade = cv2.CascadeClassifier(CASCADE_PATH)
    local_recognizer = _load_recognizer(TRAINER_PATH)

    mapped_names = []
    try:
        with open('names.txt', 'r') as f:
            mapped_names = [line.strip() for line in f.readlines()]
    except Exception as e:
        print(f"Could not load names.txt: {e}")

    # Create an independent local session since generators cannot easily yield ContextManager scoped dependencies
    db = SessionLocal()
    try:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
                
            # EXPLICIT CLEAR: Guarantee no cross-contamination
            faces = () 
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = local_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=8, minSize=(60, 60))

            for (x, y, w, h) in faces:
                roi_gray = gray[y:y+h, x:x+w]
                
                display_name = "Unknown"
                box_color = (0, 255, 255) # Yellow
                
                try:
                    id_, confidence = local_recognizer.predict(roi_gray)
                    
                    if confidence < 85: 
                        box_color = (0, 255, 0) # Green
                        current_time = time.time()
                        
                        # 1. TRANSLATE ID TO STRING INDEX USING names.txt
                        try:
                            string_index = mapped_names[id_] 
                        except IndexError:
                            string_index = str(id_)
                        
                        # THROTTLING LOGIC (5 seconds cooldown)
                        if id_ not in last_seen_times or (current_time - last_seen_times.get(id_, 0) > 5):
                            last_seen_times[id_] = current_time
                            print(f"[DEBUG] Detected LBPH ID: {id_} -> Index: {string_index} | Conf: {confidence:.2f}")
                            
                            # 2. QUERY DATABASE USING THE STRING INDEX
                            try:
                                # Use existing SessionLocal connection from the generator
                                student = db.query(models.Student).filter(models.Student.index_number == string_index).first()
                                if student:
                                    display_name = str(student.index_number)
                                    # TODO: Trigger Mark Attendance logic here!
                                else:
                                    print(f"[WARNING] Index {string_index} found in names.txt, but not in DB!")
                                    display_name = string_index
                            except Exception as db_err:
                                print(f"[DB ERROR] Failed to fetch student: {db_err}")
                                display_name = string_index
                        else:
                            # If we are in the cooldown period, we still want to show the green box and a placeholder name
                            display_name = string_index 
                            
                except Exception as e:
                    pass # Ignore empty frames
                    
                # Draw dynamic bounding box and text
                cv2.rectangle(frame, (x, y), (x+w, y+h), box_color, 2)
                cv2.putText(frame, display_name, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, box_color, 2)
                
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    except Exception as e:
        pass
    finally:
        if cam_id in active_cameras and active_cameras[cam_id] is not None:
             active_cameras[cam_id].release()
             active_cameras[cam_id] = None
        db.close()


@router.get("/video_feed/in", summary="IN Hardware Stream")
def video_feed_in(current_class_id: str = None):
    """Mounts continuous MJPEG for entrance Camera 0"""
    return StreamingResponse(
        generate_frames(0, current_class_id), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/video_feed/out", summary="OUT Hardware Stream")
def video_feed_out(current_class_id: str = None):
    """Mounts continuous MJPEG for exit Camera 1"""
    return StreamingResponse(
        generate_frames(1, current_class_id), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.post("/stop_cameras", summary="Emergency Hardware Release")
def stop_cameras():
    """Forces closure of all active hardware connections triggered by UI Stop"""
    for cam_id, cap in active_cameras.items():
        if cap is not None:
            cap.release()
    active_cameras.clear()
    return {"message": "All cameras released effectively"}
