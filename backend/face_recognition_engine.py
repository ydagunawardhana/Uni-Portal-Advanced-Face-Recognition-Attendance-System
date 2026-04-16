"""
face_recognition_engine.py
──────────────────────────
Self-contained face recognition module for the Attendance System.

Public API
──────────
    recognize_faces(frame: np.ndarray) -> list[FaceResult]

Each FaceResult contains:
    - label       : str   – name from names.txt  (or "Unknown")
    - user_id     : int   – numeric label from the trainer (0 if unknown)
    - confidence  : float – LBPH confidence (lower = better match)
    - is_known    : bool  – True when confidence is below CONFIDENCE_THRESHOLD
    - bbox        : dict  – {x, y, w, h} bounding box in the original frame
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import cv2
import numpy as np


# Paths  (all relative to this file so the module is portable)

_BASE_DIR   = Path(__file__).parent
CASCADE_PATH = str(_BASE_DIR / "haarcascade_frontalface_default.xml")
TRAINER_PATH = str(_BASE_DIR / "trainer.yml")


# Tuning knobs

# LBPH: confidence < threshold  → face is recognised
# Typical range: 50 (very strict) … 100 (lenient)
CONFIDENCE_THRESHOLD: float = float(os.getenv("FR_CONFIDENCE_THRESHOLD", "70"))

# Haar Cascade scaleFactor & minNeighbors
SCALE_FACTOR:   float = 1.1
MIN_NEIGHBORS:  int   = 8
MIN_FACE_SIZE:  tuple = (60, 60)   # stricter detection to ignore objects



# Result dataclass

@dataclass
class FaceResult:
    label:      str
    user_id:    int
    confidence: float
    is_known:   bool
    bbox:       dict = field(default_factory=dict)   # {x, y, w, h}
    is_enrolled: bool = True
    color:       tuple = None

    def to_dict(self) -> dict:
        return {
            "label":      self.label,
            "user_id":    self.user_id,
            "confidence": round(self.confidence, 2),
            "is_known":   self.is_known,
            "bbox":       self.bbox,
        }



# Module-level singletons (loaded once, reused for every call)


def _load_cascade(path: str) -> cv2.CascadeClassifier:
    cascade = cv2.CascadeClassifier(path)
    if cascade.empty():
        raise RuntimeError(
            f"[FaceEngine]  Failed to load Haar Cascade from: {path}\n"
            "Make sure haarcascade_frontalface_default.xml is in the backend folder."
        )
    print(f"[FaceEngine]  Haar Cascade loaded from: {path}")
    return cascade


def _load_recognizer(path: str) -> cv2.face.LBPHFaceRecognizer:
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    if not os.path.isfile(path):
        raise RuntimeError(
            f"[FaceEngine]  Trainer file not found: {path}\n"
            "Train the model first and place trainer.yml in the backend folder."
        )
    recognizer.read(path)
    print(f"[FaceEngine]  LBPH recognizer loaded from: {path}")
    return recognizer


_cascade:    Optional[cv2.CascadeClassifier]      = None
_recognizer: Optional[cv2.face.LBPHFaceRecognizer] = None
_last_trainer_mtime: float = 0.0

def _get_resources():
    """Return (cascade, recognizer), loading them on first call or when trainer.yml updates."""
    global _cascade, _recognizer, _last_trainer_mtime
    
    try:
        current_mtime = os.path.getmtime(TRAINER_PATH)
    except OSError:
        current_mtime = 0.0

    if _cascade is None:
        _cascade = _load_cascade(CASCADE_PATH)
        
    if _recognizer is None or (current_mtime > _last_trainer_mtime and current_mtime > 0):
        if _recognizer is not None:
            print("[FaceEngine] 🔄  Auto-reloading updated trainer.yml")
        _recognizer = _load_recognizer(TRAINER_PATH)
        _last_trainer_mtime = current_mtime

    return _cascade, _recognizer



# Core helpers

def _preprocess(frame: np.ndarray) -> np.ndarray:
    """Convert BGR frame to equalised grayscale for better detection."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return cv2.equalizeHist(gray)   # boost contrast


def _detect_faces(cascade: cv2.CascadeClassifier,
                  gray: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Run Haar Cascade and return a list of (x, y, w, h) bounding boxes."""
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=SCALE_FACTOR,
        minNeighbors=MIN_NEIGHBORS,
        minSize=MIN_FACE_SIZE,
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    if len(faces) == 0:
        return []
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]



# Public API

def recognize_faces(frame: np.ndarray, cascade=None, recognizer=None) -> list[FaceResult]:
    """
    Detect and identify all faces in a single camera frame.

    Parameters
    ----------
    frame : np.ndarray
        BGR image as returned by cv2.VideoCapture.read() or decoded from JPEG.
    cascade : cv2.CascadeClassifier, optional
    recognizer : cv2.face_LBPHFaceRecognizer, optional

    Returns
    -------
    list[FaceResult]
        One FaceResult per detected face.  Empty list when no faces are found.
    """
    if cascade is None or recognizer is None:
        global_cascade, global_recognizer = _get_resources()
        cascade = cascade or global_cascade
        recognizer = recognizer or global_recognizer

    gray  = _preprocess(frame)
    boxes = _detect_faces(cascade, gray)

    results: list[FaceResult] = []

    for (x, y, w, h) in boxes:
        roi = gray[y : y + h, x : x + w]

        # Resize ROI to a fixed size (LBPH is not size-invariant)
        roi_resized = cv2.resize(roi, (200, 200))

        user_id, confidence = recognizer.predict(roi_resized)

        is_known = confidence < CONFIDENCE_THRESHOLD
        label    = f"ID_{user_id}" if is_known else "Unknown"

        results.append(FaceResult(
            label      = label,
            user_id    = user_id    if is_known else 0,
            confidence = confidence,
            is_known   = is_known,
            bbox       = {"x": x, "y": y, "w": w, "h": h},
        ))

    return results


def annotate_frame(frame: np.ndarray,
                   results: list[FaceResult]) -> np.ndarray:
    """
    Draw bounding boxes and labels on a copy of the frame.
    Returns the annotated frame (does NOT mutate the original).

    Useful for debugging or for the video-stream endpoint.
    """
    out = frame.copy()
    for r in results:
        x, y, w, h = r.bbox["x"], r.bbox["y"], r.bbox["w"], r.bbox["h"]
        
        # Yellow (0, 255, 255) for Unknown
        # Green (0, 255, 0) for Authorized
        # Red (0, 0, 255) for Unauthorized (wrong class)
        if r.color:
            color = r.color
        elif not r.is_known:
            color = (0, 255, 255) 
        elif r.is_enrolled:
            color = (0, 255, 0)
        else:
            color = (0, 0, 255)
        
        cv2.rectangle(out, (x, y), (x + w, y + h), color, 2)
        
        tag = f"{r.label}"
        cv2.putText(out, tag, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    return out
