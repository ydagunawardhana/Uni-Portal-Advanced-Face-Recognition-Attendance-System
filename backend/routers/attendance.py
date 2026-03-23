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
import schemas
from database import get_db
from face_recognition_engine import FaceResult, recognize_faces

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

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


def _make_index_number(user_id: int) -> str:
    """
    Create a stable index_number string from the LBPH user_id.
    Format: 'STU-<zero-padded-id>'  e.g. 'STU-042'
    """
    return f"STU-{user_id:03d}"


# ══════════════════════════════════════════════
# POST /api/attendance
# ══════════════════════════════════════════════

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

    # ── Face detection + recognition ─────────────────────────
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
            continue  # skip unknown faces — nothing to log

        # ── Build a stable index_number from the model's user_id ──
        index_number = _make_index_number(result.user_id)

        # ── Write to DB (with debounce) ───────────────────────
        log_entry, created = crud.log_attendance_for_recognised_face(
            db           = db,
            index_number = index_number,
            name         = result.label,
            debounce_min = debounce_min,
        )

        logs_created.append(log_entry)

        status_word = "logged" if created else "skipped (debounce)"
        print(
            f"[Attendance]  {result.label:<30} "
            f"conf={result.confidence:.1f}  "
            f"→ {log_entry.status:<8}  {status_word}"
        )

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
    )


# ══════════════════════════════════════════════
# GET /api/attendance/history
# ══════════════════════════════════════════════

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


# ══════════════════════════════════════════════
# GET /api/attendance/today
# ══════════════════════════════════════════════

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
