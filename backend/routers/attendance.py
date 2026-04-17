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
    FaceResult, recognize_faces, annotate_frame
)
from fastapi.responses import StreamingResponse
import base64
import time
import pickle
import face_recognition

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

        # Fetch the student from the database bypassing legacy integer bindings
        student = db.query(models.Student).filter(models.Student.index_number == result.label).first()
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
blink_state = {}

def generate_frames(cam_id: int, current_class_id: str = None):
    """
    Independently polls the specific hardware ID (0, 1, 2) utilizing OpenCV.
    Seamlessly processes Deep Learning face recognition and streams the annotated MJPEG.
    """
    if cam_id in active_cameras:
        if active_cameras[cam_id] is not None:
            active_cameras[cam_id].release()
            
    # Force native Windows DirectShow (DSHOW) backend to circumvent buggy Obsensor and MSMF DLLs
    cap = cv2.VideoCapture(cam_id, cv2.CAP_DSHOW)
    
    # Primary interface fallback
    if not cap.isOpened() and cam_id == 0:
        cap = cv2.VideoCapture(-1, cv2.CAP_DSHOW)

    if not cap.isOpened():
        print(f"[Video Feed] Warning: Camera {cam_id} unavailable. Yielding standby placeholder.")
        # Graceful handling so FastAPI/browser doesn't abort connections crashing the layout
        import numpy as np
        placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(placeholder, f"Camera {cam_id} Offline", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        ret, buffer = cv2.imencode('.jpg', placeholder)
        frame_bytes = buffer.tobytes()
        while True:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(1)
        return
        
    active_cameras[cam_id] = cap

    local_eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye_tree_eyeglasses.xml')

    known_encodings = []
    known_names = []
    try:
        with open('encodings.pkl', 'rb') as f:
            data = pickle.load(f)
            known_encodings = data["encodings"]
            known_names = data["names"]
    except Exception as e:
        print(f"Could not load encodings.pkl: {e}")

    db = SessionLocal()
    try:
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
                
            # Downscale frame for ultra-fast FaceNet inference
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small_frame = small_frame[:, :, ::-1]
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) # Keep original resolution for Liveness
            
            face_locations = face_recognition.face_locations(rgb_small_frame)
            face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

            for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                # Scale up predictions to match full-resolution frame
                top *= 4
                right *= 4
                bottom *= 4
                left *= 4
                
                x = left
                y = top
                w = right - left
                h = bottom - top
                
                roi_gray = gray[y:y+h, x:x+w]
                
                display_name = "Unknown"
                box_color = (0, 255, 255) # Yellow
                string_index = "Unknown"
                
                try:
                    face_distances = face_recognition.face_distance(known_encodings, face_encoding)
                    id_ = "Unknown"
                    
                    if len(face_distances) > 0:
                        best_match_index = np.argmin(face_distances)
                        # Strict 0.5 distance threshold (lower is better)
                        if face_distances[best_match_index] <= 0.5:
                            string_index = known_names[best_match_index]
                            id_ = string_index
                        
                    if string_index.lower() == "unknown":
                        box_color = (0, 255, 255)
                        display_name = "Unknown"
                        if id_ in blink_state:
                            blink_state[id_]['verified'] = False
                    else:
                        current_time = time.time()
                        
                        if id_ not in blink_state:
                            blink_state[id_] = {'eyes_closed_frames': 0, 'verified': False, 'verified_time': 0}
                            
                        state = blink_state[id_]
                        
                        if state['verified'] and (current_time - state['verified_time'] > 5):
                            state['verified'] = False
                            state['eyes_closed_frames'] = 0
                        
                        if not state['verified']:
                            if h > 0 and w > 0:
                                eyes = local_eye_cascade.detectMultiScale(roi_gray[0:h//2, 0:w], scaleFactor=1.1, minNeighbors=5)
                                if len(eyes) == 0:
                                    state['eyes_closed_frames'] += 1
                                else:
                                    if 3 <= state['eyes_closed_frames'] <= 20: 
                                        state['verified'] = True
                                        state['verified_time'] = current_time
                                        print(f"Liveness Passed for {string_index}!")
                                    state['eyes_closed_frames'] = 0
                        
                        if state['verified']:
                            box_color = (0, 255, 0)
                            display_name = f"{string_index} (Verified)"
                            
                            if id_ not in last_seen_times or (current_time - last_seen_times.get(id_, 0) > 5):
                                last_seen_times[id_] = current_time
                                print(f"[DEBUG] Detected ID: {string_index}")
                                
                                try:
                                    student = db.query(models.Student).filter(models.Student.index_number == string_index).first()
                                    if student:
                                        display_name = str(student.index_number)
                                        # TODO: Trigger Mark Attendance logic here!
                                    else:
                                        display_name = string_index
                                except Exception as db_err:
                                    print(f"[DB ERROR]: {db_err}")
                                    display_name = string_index
                        else:
                            box_color = (0, 165, 255)
                            display_name = f"{string_index} - Please Blink!"
                            
                except Exception as e:
                    pass
                    
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
    """Mounts continuous MJPEG for exit Camera 1 gracefully"""
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
